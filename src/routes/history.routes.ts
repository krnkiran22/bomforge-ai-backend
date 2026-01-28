import { Router } from 'express';
import {
  getConversionHistory,
  deleteConversion,
} from '../controllers/history.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

router.get('/', asyncHandler(getConversionHistory));
router.delete('/:conversionId', asyncHandler(deleteConversion));

export default router;
