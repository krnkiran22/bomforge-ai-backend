import { Router } from 'express';
import { uploadFile } from '../controllers/upload.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

router.post('/', uploadMiddleware, asyncHandler(uploadFile));

export default router;
