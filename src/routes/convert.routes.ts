import { Router } from 'express';
import {
  startConversion,
  getConversionStatus,
  getBOMData,
  getExplanation,
  saveBOMEdits,
  submitFeedback,
} from '../controllers/convert.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

router.post('/', asyncHandler(startConversion));
router.get('/status/:conversionId', asyncHandler(getConversionStatus));
router.get('/bom/:conversionId', asyncHandler(getBOMData));
router.get('/explanation/:conversionId', asyncHandler(getExplanation));
router.patch('/bom/:conversionId', asyncHandler(saveBOMEdits));
router.post('/feedback', asyncHandler(submitFeedback));

export default router;
