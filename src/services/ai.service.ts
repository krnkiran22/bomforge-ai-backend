import groqService from './groq.service';
import ollamaService from './ollama.service';
import chunkingService from './chunking.service';
import ultraFastMultiModelService from './ultra-fast-multi-model.service';

interface BOMItem {
  partNumber: string;
  description: string;
  quantity: number;
  level: number;
  materialSpec?: string;
  notes?: string;
}

interface ConversionOptions {
  preferOllama?: boolean; // Force use of Ollama
  forceGroq?: boolean; // Force use of Groq (will fail if too large)
  useChunking?: boolean; // Enable/disable chunking
}

class AIService {
  private ollamaAvailable: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // Delay initialization until first use
  }

  private async initialize() {
    if (this.initialized) return;

    // Check if Ollama is available
    try {
      this.ollamaAvailable = await ollamaService.testConnection();
      if (this.ollamaAvailable) {
        console.log('✅ Ollama is available for local AI processing');
      } else {
        console.log('⚠️  Ollama not available, will use Groq API only');
      }
    } catch (error) {
      console.log('⚠️  Ollama not available, will use Groq API only');
      this.ollamaAvailable = false;
    }

    this.initialized = true;
  }

  /**
   * Main conversion method - automatically chooses best provider
   */
  async convertEBOMToMBOM(
    ebomItems: BOMItem[],
    options: ConversionOptions = {}
  ): Promise<any> {
    await this.initialize();

    console.log(`\n🎯 Starting AI conversion for ${ebomItems.length} items`);

    // If ultra-fast multi-model enabled and Ollama available, use it
    const useOptimized = process.env.USE_MULTI_MODEL === 'true';
    if (useOptimized && this.ollamaAvailable) {
      console.log('⚡ Using ULTRA-FAST multi-model processing');
      return await ultraFastMultiModelService.convertWithMultiModel(ebomItems);
    }

    // Get recommendation
    const strategy = chunkingService.recommendStrategy(ebomItems);
    console.log(`💡 Recommended strategy: ${strategy.reason}`);
    console.log(`⏱️  Estimated time: ${strategy.estimatedTime}`);

    // Decide which provider to use
    let useOllama = strategy.useOllama;
    let useChunking = strategy.useChunking;

    // Override with options if provided
    if (options.preferOllama !== undefined) {
      useOllama = options.preferOllama && this.ollamaAvailable;
    }
    if (options.forceGroq !== undefined) {
      useOllama = false;
    }
    if (options.useChunking !== undefined) {
      useChunking = options.useChunking;
    }

    // Check if Ollama is required but not available
    if (useOllama && !this.ollamaAvailable) {
      console.log('⚠️  Ollama not available, falling back to Groq with chunking');
      useOllama = false;
      useChunking = true;
    }

    // Execute conversion
    try {
      if (useOllama) {
        return await this.convertWithOllama(ebomItems, useChunking);
      } else {
        return await this.convertWithGroq(ebomItems, useChunking);
      }
    } catch (error: any) {
      // Fallback logic
      if (!useOllama && this.ollamaAvailable) {
        console.log('⚠️  Groq failed, falling back to Ollama...');
        return await this.convertWithOllama(ebomItems, true);
      }
      throw error;
    }
  }

  /**
   * Convert using Groq API
   */
  private async convertWithGroq(
    ebomItems: BOMItem[],
    useChunking: boolean
  ): Promise<any> {
    console.log('🌩️  Using Groq Cloud API');

    if (!useChunking || !chunkingService.needsChunking(ebomItems, 'groq')) {
      // Process directly
      console.log('📄 Processing in single request');
      return await groqService.convertEBOMToMBOM(ebomItems);
    }

    // Process in chunks
    console.log('📦 Processing in chunks');
    const chunks = chunkingService.chunkBOM(ebomItems, 'groq');
    const chunkResults = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n📦 Processing chunk ${chunk.chunkNumber}/${chunk.totalChunks} (${chunk.items.length} items)`);

      try {
        const result = await groqService.convertEBOMToMBOM(chunk.items);
        chunkResults.push(result);

        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        console.error(`❌ Chunk ${chunk.chunkNumber} failed:`, error.message);
        throw new Error(`Chunk ${chunk.chunkNumber} failed: ${error.message}`);
      }
    }

    // Merge results
    return chunkingService.mergeChunkResults(chunkResults);
  }

  /**
   * Convert using Ollama (local)
   */
  private async convertWithOllama(
    ebomItems: BOMItem[],
    useChunking: boolean
  ): Promise<any> {
    console.log('🖥️  Using Ollama (Local AI)');

    if (!useChunking || !chunkingService.needsChunking(ebomItems, 'ollama')) {
      // Process directly
      console.log('📄 Processing in single request');
      return await ollamaService.convertEBOMToMBOM(ebomItems);
    }

    // Process in chunks (Ollama can handle larger chunks)
    console.log('📦 Processing in chunks');
    const chunks = chunkingService.chunkBOM(ebomItems, 'ollama');
    const chunkResults = [];

    for (const chunk of chunks) {
      console.log(`\n📦 Processing chunk ${chunk.chunkNumber}/${chunk.totalChunks} (${chunk.items.length} items)`);

      try {
        const result = await ollamaService.convertEBOMToMBOM(chunk.items);
        chunkResults.push(result);
      } catch (error: any) {
        console.error(`❌ Chunk ${chunk.chunkNumber} failed:`, error.message);
        throw new Error(`Chunk ${chunk.chunkNumber} failed: ${error.message}`);
      }
    }

    // Merge results
    return chunkingService.mergeChunkResults(chunkResults);
  }

  /**
   * Get AI provider status
   */
  async getProviderStatus(): Promise<{
    groq: boolean;
    ollama: boolean;
    recommended: 'groq' | 'ollama' | 'none';
  }> {
    await this.initialize();

    const groqAvailable = true; // Assuming Groq is always available with API key
    const ollamaAvailable = this.ollamaAvailable;

    return {
      groq: groqAvailable,
      ollama: ollamaAvailable,
      recommended: ollamaAvailable ? 'ollama' : 'groq'
    };
  }
}

export default new AIService();
