import { Request, Response } from 'express';
import databaseService from '../services/database.service';
import parserService from '../services/parser.service';
import aiService from '../services/ai.service';
import multiModelService from '../services/multi-model.service';
import learningService from '../services/learning.service';
import knowledgeService from '../services/knowledge.service';
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
      ebomData: {
        items: bomItems,
        totalParts: bomItems.length
      },
      ebomPartCount: bomItems.length,
    });

    // Start conversion process asynchronously
    processConversion(conversion.id, bomItems).catch(error => {
      logger.error(`Conversion ${conversion.id} failed:`, error);
      databaseService.saveConversionError(conversion.id, error.message);
    });

    return res.status(200).json({
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
    return res.status(500).json({
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
    logger.info(`Converting BOM with ${ebomItems.length} items using AI`);

    // OPTION 1: Use Multi-Model Architecture (5 specialized AI models)
    // Uncomment this to use the advanced 5-model system with Ollama
    const useMultiModel = process.env.USE_MULTI_MODEL === 'true';

    let conversionResult;

    if (useMultiModel) {
      logger.info('🚀 Using Multi-Model AI (5 specialized models)');
      conversionResult = await multiModelService.convertWithMultiModel(ebomItems);
    } else {
      // OPTION 2: Use simple single AI service (backward compatible)
      logger.info('Using single AI service');
      conversionResult = await aiService.convertEBOMToMBOM(ebomItems, {
        // Options can be added here
        // preferOllama: true,  // Force Ollama
        // forceGroq: true,     // Force Groq
        // useChunking: true    // Force chunking
      });
    }

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
        itemExplanations: conversionResult.mbomItems.map((item: any) => ({
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

    return res.status(200).json({
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
    return res.status(500).json({
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

    return res.status(200).json({
      success: true,
      data: {
        conversionId: conversion.id,
        ebomData: {
          items: Array.isArray(ebomData) ? ebomData : ebomData.items || [],
          totalParts: conversion.ebomPartCount,
        },
        mbomData: {
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
    return res.status(500).json({
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

    return res.status(200).json({
      success: true,
      data: {
        conversionId: conversion.id,
        ...explanationData,
      },
    });
  } catch (error: any) {
    logger.error('Get explanation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get explanation',
    });
  }
};

export const saveBOMEdits = async (req: Request, res: Response) => {
  try {
    const { conversionId } = req.params;
    const { changes, mbomItems: newItems } = req.body;

    const conversion = await databaseService.getConversion(conversionId);
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found',
      });
    }

    const mbomData = (conversion.mbomData as any) || { items: [] };
    let items = mbomData.items || [];

    if (newItems && Array.isArray(newItems)) {
      // Direct replacement of items (good for add/delete/reorder)
      items = newItems;
    } else if (changes && Array.isArray(changes)) {
      // Partial updates by ID
      changes.forEach((change: any) => {
        // Try finding by id or partNumber (for flexibility)
        const item = items.find((i: any) => (i.id === change.itemId) || (i.partNumber === change.partNumber));
        if (item) {
          Object.assign(item, change.updates);
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either changes or mbomItems must be provided',
      });
    }

    // Update database
    await databaseService.updateConversion(conversionId, {
      mbomData: {
        ...mbomData,
        items,
        totalParts: items.length,
        addedItems: items.filter((i: any) => i.changeType === 'added').length,
        modifiedItems: items.filter((i: any) => i.changeType === 'modified').length,
        groupedItems: items.filter((i: any) => i.changeType === 'grouped').length,
      },
      mbomPartCount: items.length
    });

    logger.info(`Saved edits for conversion ${conversionId}`);

    return res.status(200).json({
      success: true,
      message: 'Changes saved successfully',
      data: {
        updatedItems: items.length,
      },
    });
  } catch (error: any) {
    logger.error('Save BOM edits error:', error);
    return res.status(500).json({
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

    // Process feedback with learning service
    const learningResult = await learningService.processFeedback({
      conversionId,
      corrections,
      shouldLearn: shouldLearn !== false
    });

    logger.info(`Feedback processed for conversion ${conversionId}: ${learningResult.learnedItems} items learned`);

    return res.status(200).json({
      success: true,
      message: learningResult.message,
      data: {
        learningQueued: shouldLearn !== false,
        learnedItems: learningResult.learnedItems
      },
    });
  } catch (error: any) {
    logger.error('Submit feedback error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit feedback',
    });
  }
};

/**
 * Get learning statistics
 */
export const getLearningStats = async (_req: Request, res: Response) => {
  try {
    const stats = await learningService.getLearningStats();

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Get learning stats error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get learning stats'
    });
  }
};

/**
 * Get multi-model status
 */
export const getMultiModelStatus = async (_req: Request, res: Response) => {
  try {
    const status = await multiModelService.getModelStatus();
    const knowledgeStats = await knowledgeService.getLearningStats();

    return res.status(200).json({
      success: true,
      data: {
        models: status,
        knowledge: knowledgeStats,
        multiModelEnabled: process.env.USE_MULTI_MODEL === 'true'
      }
    });
  } catch (error: any) {
    logger.error('Get multi-model status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get model status'
    });
  }
};

/**
 * Trigger manual retraining
 */
export const triggerRetraining = async (_req: Request, res: Response) => {
  try {
    logger.info('Manual retraining triggered');

    const result = await learningService.performBatchRetraining();

    return res.status(200).json({
      success: true,
      message: 'Retraining complete',
      data: result
    });
  } catch (error: any) {
    logger.error('Retraining error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Retraining failed'
    });
  }
};
