import { Request, Response } from 'express';
import databaseService from '../services/database.service';
import { getFileExtension } from '../utils/helpers';
import logger from '../utils/logger';

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const file = req.file;
    const fileType = getFileExtension(file.originalname);

    // Save upload metadata to database
    const upload = await databaseService.createUpload({
      fileName: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: fileType,
    });

    logger.info(`File uploaded successfully: ${file.originalname} (ID: ${upload.id})`);

    res.status(200).json({
      success: true,
      data: {
        uploadId: upload.id,
        fileName: upload.fileName,
        originalName: upload.originalName,
        fileSize: upload.fileSize,
        fileType: upload.fileType,
        status: 'uploaded',
      },
    });
  } catch (error: any) {
    logger.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'File upload failed',
    });
  }
};
