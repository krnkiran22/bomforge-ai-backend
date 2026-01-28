interface BOMItem {
  partNumber: string;
  description: string;
  quantity: number;
  level: number;
  materialSpec?: string;
  notes?: string;
  children?: string[];
}

interface BOMChunk {
  items: BOMItem[];
  chunkNumber: number;
  totalChunks: number;
  startIndex: number;
  endIndex: number;
}

class ChunkingService {
  // Conservative limits to avoid API issues
  private readonly GROQ_MAX_ITEMS = 50; // Safe limit for Groq (12K tokens)
  private readonly OLLAMA_MAX_ITEMS = 100; // Ollama can handle more

  /**
   * Estimate tokens for a BOM item array
   */
  estimateTokens(items: BOMItem[]): number {
    const jsonString = JSON.stringify(items);
    // Rough estimate: 1 token ≈ 4 characters
    // Add 2000 tokens for prompt overhead
    return Math.ceil(jsonString.length / 4) + 2000;
  }

  /**
   * Check if BOM needs chunking for Groq
   */
  needsChunking(items: BOMItem[], provider: 'groq' | 'ollama' = 'groq'): boolean {
    const maxItems = provider === 'groq' ? this.GROQ_MAX_ITEMS : this.OLLAMA_MAX_ITEMS;
    return items.length > maxItems;
  }

  /**
   * Split BOM into chunks intelligently
   * Keeps hierarchies together where possible
   */
  chunkBOM(items: BOMItem[], provider: 'groq' | 'ollama' = 'groq'): BOMChunk[] {
    const maxItems = provider === 'groq' ? this.GROQ_MAX_ITEMS : this.OLLAMA_MAX_ITEMS;
    
    if (items.length <= maxItems) {
      return [{
        items: items,
        chunkNumber: 1,
        totalChunks: 1,
        startIndex: 0,
        endIndex: items.length
      }];
    }

    console.log(`📦 Chunking ${items.length} items into ${maxItems}-item chunks`);

    const chunks: BOMChunk[] = [];
    const totalChunks = Math.ceil(items.length / maxItems);

    // Group items by level to keep hierarchies together
    const groupedByLevel = this.groupByLevel(items);
    
    let currentChunk: BOMItem[] = [];
    let chunkNumber = 1;
    let startIndex = 0;

    for (const level in groupedByLevel) {
      const levelItems = groupedByLevel[level];

      for (const item of levelItems) {
        if (currentChunk.length >= maxItems) {
          // Save current chunk
          chunks.push({
            items: currentChunk,
            chunkNumber: chunkNumber++,
            totalChunks: totalChunks,
            startIndex: startIndex,
            endIndex: startIndex + currentChunk.length
          });

          // Start new chunk
          startIndex += currentChunk.length;
          currentChunk = [];
        }

        currentChunk.push(item);
      }
    }

    // Add remaining items as last chunk
    if (currentChunk.length > 0) {
      chunks.push({
        items: currentChunk,
        chunkNumber: chunkNumber,
        totalChunks: totalChunks,
        startIndex: startIndex,
        endIndex: startIndex + currentChunk.length
      });
    }

    console.log(`✅ Created ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Group items by hierarchy level
   */
  private groupByLevel(items: BOMItem[]): Record<number, BOMItem[]> {
    const grouped: Record<number, BOMItem[]> = {};

    for (const item of items) {
      const level = item.level || 0;
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(item);
    }

    return grouped;
  }

  /**
   * Merge results from multiple chunks back together
   */
  mergeChunkResults(chunkResults: any[]): any {
    console.log(`🔗 Merging ${chunkResults.length} chunk results`);

    const mergedItems: any[] = [];
    const mergedChanges = {
      added: [] as any[],
      modified: [] as any[],
      grouped: [] as any[]
    };

    let totalConfidence = 0;
    const assessments: string[] = [];

    for (const result of chunkResults) {
      // Merge items
      mergedItems.push(...result.mbomItems);

      // Merge changes
      if (result.changes) {
        mergedChanges.added.push(...(result.changes.added || []));
        mergedChanges.modified.push(...(result.changes.modified || []));
        mergedChanges.grouped.push(...(result.changes.grouped || []));
      }

      // Accumulate confidence scores
      totalConfidence += result.overallConfidence || 0;

      // Collect assessments
      if (result.overallAssessment) {
        assessments.push(result.overallAssessment);
      }
    }

    // Calculate average confidence
    const avgConfidence = totalConfidence / chunkResults.length;

    // Combine assessments
    const combinedAssessment = `Processed in ${chunkResults.length} chunks. ${assessments.join(' ')}`;

    console.log(`✅ Merged ${mergedItems.length} total items`);
    console.log(`📊 Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    return {
      mbomItems: mergedItems,
      overallAssessment: combinedAssessment,
      overallConfidence: avgConfidence,
      changes: mergedChanges
    };
  }

  /**
   * Get chunking strategy recommendation
   */
  recommendStrategy(items: BOMItem[]): {
    useOllama: boolean;
    useChunking: boolean;
    estimatedTime: string;
    reason: string;
  } {
    const itemCount = items.length;
    const estimatedTokens = this.estimateTokens(items);

    // Decision logic
    if (itemCount <= 50 && estimatedTokens < 10000) {
      return {
        useOllama: false,
        useChunking: false,
        estimatedTime: '5-10 seconds',
        reason: 'Small BOM, can use Groq API directly'
      };
    }

    if (itemCount <= 100 && estimatedTokens < 15000) {
      return {
        useOllama: false,
        useChunking: true,
        estimatedTime: '15-30 seconds',
        reason: 'Medium BOM, use Groq with chunking'
      };
    }

    if (itemCount <= 200) {
      return {
        useOllama: true,
        useChunking: true,
        estimatedTime: '30-60 seconds',
        reason: 'Large BOM, use Ollama (no token limits) with chunking for speed'
      };
    }

    return {
      useOllama: true,
      useChunking: true,
      estimatedTime: '1-3 minutes',
      reason: 'Very large BOM (200+ items), use Ollama with chunking'
    };
  }
}

export default new ChunkingService();
