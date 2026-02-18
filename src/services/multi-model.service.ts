/**
 * Multi-Model Service - Wrapper for Ultra-Fast Service
 * 
 * This service delegates all processing to the ultra-fast multi-model service.
 * It maintains backward compatibility while using the new optimized architecture.
 */

import ultraFastMultiModelService from './ultra-fast-multi-model.service';

interface BOMItem {
  partNumber: string;
  description: string;
  quantity: number;
  level: number;
  materialSpec?: string;
  notes?: string;
}

class MultiModelService {
  /**
   * Convert EBOM to MBOM using ultra-fast multi-model architecture
   */
  async convertWithMultiModel(ebomItems: BOMItem[]): Promise<any> {
    console.log(`\n🔄 Multi-Model Service: Delegating to ultra-fast service`);
    return await ultraFastMultiModelService.convertWithMultiModel(ebomItems);
  }

  /**
   * Get status of all models
   */
  async getModelStatus(): Promise<any> {
    return {
      nlp: { status: 'disabled', version: '1.0.0' }, // NLP was removed for speed
      classification: { status: 'active', version: '2.0.0', type: 'hybrid' },
      sequencing: { status: 'active', version: '2.0.0', type: 'rules' },
      clustering: { status: 'active', version: '2.0.0', type: 'rules' },
      knowledge: { status: 'active', version: '2.0.0' }
    };
  }
}

export default new MultiModelService();
