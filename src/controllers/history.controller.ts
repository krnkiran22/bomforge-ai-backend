import { Request, Response } from 'express';
import databaseService from '../services/database.service';
import logger from '../utils/logger';

export const getConversionHistory = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const result = await databaseService.getConversionHistory(page, limit, search);

    const formattedData = result.conversions.map((conversion: any) => ({
      conversionId: conversion._id.toString(),
      filename: conversion.uploadId?.originalName || 'Unknown',
      status: conversion.status,
      ebomPartCount: conversion.ebomPartCount,
      itemsCount: conversion.mbomPartCount || 0,
      confidenceScore: conversion.confidenceScore || 0,
      timeTaken: conversion.timeTaken || 0,
      createdAt: conversion.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        conversions: formattedData,
        pagination: result.pagination,
      },
    });
  } catch (error: any) {
    logger.error('Get conversion history error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get conversion history',
    });
  }
};

export const deleteConversion = async (req: Request, res: Response) => {
  try {
    const { conversionId } = req.params;

    const conversion = await databaseService.getConversion(conversionId);
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found',
      });
    }

    await databaseService.deleteConversion(conversionId);

    logger.info(`Deleted conversion ${conversionId}`);

    return res.status(200).json({
      success: true,
      message: 'Conversion deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete conversion error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete conversion',
    });
  }
};
