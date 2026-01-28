import { Router, Request, Response } from 'express';
import {
  startConversion,
  getConversionStatus,
  getBOMData,
  getExplanation,
  saveBOMEdits,
  submitFeedback,
  getLearningStats,
  getMultiModelStatus,
  triggerRetraining,
} from '../controllers/convert.controller';
import { asyncHandler } from '../middleware/error.middleware';
import aiService from '../services/ai.service';

const router = Router();

router.post('/', asyncHandler(startConversion));
router.get('/status/:conversionId', asyncHandler(getConversionStatus));
router.get('/bom/:conversionId', asyncHandler(getBOMData));
router.get('/explanation/:conversionId', asyncHandler(getExplanation));
router.patch('/bom/:conversionId', asyncHandler(saveBOMEdits));
router.post('/feedback', asyncHandler(submitFeedback));

// Learning & Multi-Model Endpoints
router.get('/learning/stats', asyncHandler(getLearningStats));
router.get('/multi-model/status', asyncHandler(getMultiModelStatus));
router.post('/learning/retrain', asyncHandler(triggerRetraining));

// AI Provider Status Endpoint (legacy - kept for backward compatibility)
router.get('/ai-status', asyncHandler(async (_req: Request, res: Response) => {
  const status = await aiService.getProviderStatus();
  
  return res.json({
    success: true,
    providers: status,
    message: status.ollama 
      ? 'Both Groq and Ollama are available'
      : 'Only Groq is available (Ollama not detected)'
  });
}));

export default router;
