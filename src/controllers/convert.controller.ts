import { Request, Response } from 'express';
import databaseService from '../services/database.service';
import parserService from '../services/parser.service';
import groqService from '../services/groq.service';
import logger from '../utils/logger';
import { calculateTimeTaken, delay } from '../utils/helpers';

export const startConversion = async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.body;

    if (!uploadId) {
      return res.status(400).json({
        success: false,
        error: 'Upload ID is required',
      });
    }

    // Get upload record
    const upload = await databaseService.getUpload(uploadId);
    if (!upload) {
      return res.status(404).json({
        success: false,
        error: 'Upload not found',
      });
    }

    // Parse the uploaded file
    logger.info(`Starting BOM conversion for upload: ${uploadId}`);
    const bomItems = await parserService.parseFile(upload.filePath, upload.fileType);

    // Validate BOM structure
    const validation = parserService.validateBOMStructure(bomItems);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid BOM structure',
        details: validation.errors,
      });
    }

    // Create conversion record
    const conversion = await databaseService.createConversion({
      uploadId,
      status: 'processing',
      ebomData: bomItems,
      ebomPartCount: bomItems.length,
    });

    // Start conversion process asynchronously
    processConversion(conversion.id, bomItems).catch(error => {
      logger.error(`Conversion ${conversion.id} failed:`, error);
      databaseService.saveConversionError(conversion.id, error.message);
    });

    res.status(200).json({
      success: true,
      data: {
        conversionId: conversion.id,
        status: 'processing',
        stages: {
          parsing: 'completed',
          analysis: 'in_progress',
          generation: 'pending',
          validation: 'pending',
        },
      },
    });
  } catch (error: any) {
    logger.error('Conversion start error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start conversion',
    });
  }
};

async function processConversion(conversionId: string, ebomItems: any[]) {
  const startTime = new Date();

  try {
    // Stage 1: Parsing (already done)
    await databaseService.updateConversionStatus(
      conversionId,
      'processing',
      10,
      'parsing'
    );
    await delay(500);

    // Stage 2: AI Analysis
    await databaseService.updateConversionStatus(
      conversionId,
      'processing',
      30,
      'analysis'
    );
    logger.info(`Converting BOM with ${ebomItems.length} items using Groq AI`);

    const conversionResult = await groqService.convertEBOMToMBOM(ebomItems);

    // Stage 3: Generation
    await databaseService.updateConversionStatus(
      conversionId,
      'processing',
      70,
      'generation'
    );
    await delay(500);

    // Stage 4: Validation
    await databaseService.updateConversionStatus(
      conversionId,
      'processing',
      90,
      'validation'
    );
    await delay(300);

    // Save results
    const timeTaken = calculateTimeTaken(startTime);
    await databaseService.saveConversionResult(
      conversionId,
      { items: conversionResult.mbomItems },
      {
        overallAssessment: conversionResult.overallAssessment,
        itemExplanations: conversionResult.mbomItems.map(item => ({
          itemId: item.id,
          partNumber: item.partNumber,
          changeType: item.changeType,
          reasoning: item.reasoning,
          confidence: item.confidence,
          alternatives: item.alternatives || [],
        })),
        changes: conversionResult.changes,
      },
      conversionResult.overallConfidence,
      conversionResult.mbomItems.length,
      timeTaken
    );

    logger.info(`Conversion ${conversionId} completed successfully in ${timeTaken}s`);
  } catch (error: any) {
    logger.error(`Conversion ${conversionId} failed:`, error);
    await databaseService.saveConversionError(conversionId, error.message);
    throw error;
  }
}

export const getConversionStatus = async (req: Request, res: Response) => {
  try {
    const { conversionId } = req.params;

    const conversion = await databaseService.getConversion(conversionId);
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found',
      });
    }

    const stages = {
      parsing: conversion.progress >= 10 ? 'completed' : 'pending',
      analysis: conversion.progress >= 30 ? (conversion.progress >= 70 ? 'completed' : 'in_progress') : 'pending',
      generation: conversion.progress >= 70 ? (conversion.progress >= 90 ? 'completed' : 'in_progress') : 'pending',
      validation: conversion.progress >= 90 ? (conversion.progress >= 100 ? 'completed' : 'in_progress') : 'pending',
    };

    res.status(200).json({
      success: true,
      data: {
        conversionId: conversion.id,
        status: conversion.status,
        progress: conversion.progress,
        currentStage: conversion.currentStage,
        stages,
        estimatedTimeRemaining: conversion.status === 'completed' ? 0 : Math.max(5 - ((conversion.progress / 100) * 5), 0),
        startedAt: conversion.createdAt,
        completedAt: conversion.completedAt,
        errorMessage: conversion.errorMessage,
      },
    });
  } catch (error: any) {
    logger.error('Get conversion status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get conversion status',
    });
  }
};

export const getBOMData = async (req: Request, res: Response) => {
  try {
    const { conversionId } = req.params;

    const conversion = await databaseService.getConversion(conversionId);
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found',
      });
    }

    if (conversion.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Conversion not yet completed',
      });
    }

    const ebomData = conversion.ebomData as any;
    const mbomData = conversion.mbomData as any;

    // Count changes
    const mbomItems = mbomData.items || [];
    const addedItems = mbomItems.filter((i: any) => i.changeType === 'added').length;
    const modifiedItems = mbomItems.filter((i: any) => i.changeType === 'modified').length;
    const groupedItems = mbomItems.filter((i: any) => i.changeType === 'grouped').length;

    res.status(200).json({
      success: true,
      data: {
        conversionId: conversion.id,
        ebom: {
          items: Array.isArray(ebomData) ? ebomData : ebomData.items || [],
          totalParts: conversion.ebomPartCount,
        },
        mbom: {
          items: mbomItems,
          totalParts: conversion.mbomPartCount || 0,
          addedItems,
          modifiedItems,
          groupedItems,
        },
        overallConfidence: conversion.confidenceScore || 0,
      },
    });
  } catch (error: any) {
    logger.error('Get BOM data error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get BOM data',
    });
  }
};

export const getExplanation = async (req: Request, res: Response) => {
  try {
    const { conversionId } = req.params;

    const conversion = await databaseService.getConversion(conversionId);
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found',
      });
    }

    if (conversion.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Conversion not yet completed',
      });
    }

    const explanationData = conversion.explanationData as any;

    res.status(200).json({
      success: true,
      data: {
        conversionId: conversion.id,
        ...explanationData,
      },
    });
  } catch (error: any) {
    logger.error('Get explanation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get explanation',
    });
  }
};

export const saveBOMEdits = async (req: Request, res: Response) => {
  try {
    const { conversionId } = req.params;
    const { changes } = req.body;

    const conversion = await databaseService.getConversion(conversionId);
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found',
      });
    }

    // Apply changes to mBOM data
    const mbomData = conversion.mbomData as any;
    const items = mbomData.items || [];

    changes.forEach((change: any) => {
      const item = items.find((i: any) => i.id === change.itemId);
      if (item) {
        Object.assign(item, change.updates);
      }
    });

    // Update database
    await databaseService.updateConversion(conversionId, {
      mbomData: { ...mbomData, items },
    });

    logger.info(`Saved ${changes.length} edits for conversion ${conversionId}`);

    res.status(200).json({
      success: true,
      message: 'Changes saved successfully',
      data: {
        updatedItems: changes.length,
      },
    });
  } catch (error: any) {
    logger.error('Save BOM edits error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save changes',
    });
  }
};

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { conversionId, corrections, shouldLearn } = req.body;

    if (!conversionId || !corrections) {
      return res.status(400).json({
        success: false,
        error: 'Conversion ID and corrections are required',
      });
    }

    // Save feedback to database
    await databaseService.createFeedback({
      conversionId,
      corrections,
      shouldLearn: shouldLearn !== false,
    });

    logger.info(`Feedback recorded for conversion ${conversionId}`);

    res.status(200).json({
      success: true,
      message: 'Feedback recorded. AI will learn from this correction.',
      data: {
        learningQueued: shouldLearn !== false,
      },
    });
  } catch (error: any) {
    logger.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit feedback',
    });
  }
};
