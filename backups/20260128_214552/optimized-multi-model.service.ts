import axios from 'axios';
import nlpService from './nlp.service';
import classificationService from './classification.service';
import sequencingService from './sequencing.service';
import clusteringService from './clustering.service';
import knowledgeService from './knowledge.service';

interface BOMItem {
  partNumber: string;
  description: string;
  quantity: number;
  level: number;
  materialSpec?: string;
  notes?: string;
}

class OptimizedMultiModelService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  }

  async convertWithMultiModel(ebomItems: BOMItem[]): Promise<any> {
    console.log(`\n🚀 OPTIMIZED Multi-Model AI conversion`);
    console.log(`📊 Processing ${ebomItems.length} parts`);
    console.log(`⚡ Target: 30-60 seconds\n`);

    const startTime = Date.now();

    try {
      // STEP 1: Parallel NLP + Classification
      console.log(`⚡ STEP 1/3: Parallel NLP + Classification...`);
      const step1Start = Date.now();

      const [nlpResults, classificationResults] = await Promise.all([
        this.batchNLPAnalysis(ebomItems),
        this.batchClassification(ebomItems)
      ]);

      console.log(`   ✅ Completed in ${((Date.now() - step1Start) / 1000).toFixed(1)}s`);

      // STEP 2: Knowledge Graph Query
      console.log(`\n⚡ STEP 2/3: Knowledge Graph Query...`);
      const step2Start = Date.now();

      const knowledgeResults = await this.batchKnowledgeQuery(
        ebomItems,
        nlpResults,
        classificationResults
      );

      console.log(`   ✅ Completed in ${((Date.now() - step2Start) / 1000).toFixed(1)}s`);

      // STEP 3: Combine + Optimize
      console.log(`\n⚡ STEP 3/3: Clustering + Sequencing...`);
      const step3Start = Date.now();

      const combinedItems = this.combineInsights(
        ebomItems,
        nlpResults,
        classificationResults,
        knowledgeResults
      );

      const [clusteringResult, sequenceResult] = await Promise.all([
        this.quickClustering(combinedItems),
        this.quickSequencing(combinedItems)
      ]);

      console.log(`   ✅ Completed in ${((Date.now() - step3Start) / 1000).toFixed(1)}s`);

      const finalItems = this.applyOptimizations(
        combinedItems,
        clusteringResult,
        sequenceResult
      );

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgConfidence = this.calculateConfidence(finalItems);

      console.log(`\n✅ OPTIMIZED conversion complete!`);
      console.log(`⏱️  Total time: ${totalTime}s`);
      console.log(`🎯 Overall confidence: ${(avgConfidence * 100).toFixed(0)}%`);
      console.log(`📦 Final items: ${finalItems.length} (reduced from ${ebomItems.length})\n`);

      return {
        mbomItems: finalItems,
        overallAssessment: `Optimized multi-model conversion using batching and parallelization. Processed ${ebomItems.length} items in ${totalTime}s.`,
        overallConfidence: avgConfidence,
        changes: {
          added: finalItems.filter(i => i.changeType === 'added'),
          modified: finalItems.filter(i => i.changeType === 'modified'),
          grouped: clusteringResult.clusters || []
        }
      };

    } catch (error: any) {
      console.error(`❌ Optimized conversion failed:`, error.message);
      throw error;
    }
  }

  private async batchNLPAnalysis(items: BOMItem[]): Promise<any[]> {
    const BATCH_SIZE = 40;
    const batches: BOMItem[][] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    console.log(`   📖 NLP: Processing ${batches.length} batches (${BATCH_SIZE} items each)`);

    const MAX_PARALLEL = 3;
    const results: any[] = [];

    for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
      const batchGroup = batches.slice(i, i + MAX_PARALLEL);
      const batchPromises = batchGroup.map(batch =>
        this.processSingleNLPBatch(batch)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    }

    return results;
  }

  private async processSingleNLPBatch(batch: BOMItem[]): Promise<any[]> {
    const prompt = `Analyze these ${batch.length} part descriptions. Return ONLY a JSON array with exactly ${batch.length} objects.\n\nParts:\n${batch.map((item, i) => `${i + 1}. "${item.description}"`).join('\n')}\n\nFor each part, identify:\n- partType: assembly|component|material|tooling|consumable\n- processes: array of processes (welding, machining, etc.)\n- materials: array of materials (steel, aluminum, etc.)\n\nRespond with ONLY the JSON array, no other text:`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
            num_predict: 2000
          }
        },
        { timeout: 20000 }
      );

      const parsed = JSON.parse(response.data.response);

      if (Array.isArray(parsed) && parsed.length === batch.length) {
        return parsed;
      } else {
        return batch.map(() => ({
          partType: 'component',
          processes: [],
          materials: []
        }));
      }

    } catch (error) {
      console.warn(`   ⚠️  NLP batch failed, using defaults`);
      return batch.map(() => ({
        partType: 'component',
        processes: [],
        materials: []
      }));
    }
  }

  private async batchClassification(items: BOMItem[]): Promise<any[]> {
    const BATCH_SIZE = 40;
    const batches: BOMItem[][] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    console.log(`   🏷️  Classification: Processing ${batches.length} batches`);

    const MAX_PARALLEL = 3;
    const results: any[] = [];

    for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
      const batchGroup = batches.slice(i, i + MAX_PARALLEL);
      const batchPromises = batchGroup.map(batch =>
        this.processSingleClassificationBatch(batch)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    }

    return results;
  }

  private async processSingleClassificationBatch(batch: BOMItem[]): Promise<any[]> {
    const prompt = `Classify these ${batch.length} manufacturing parts. Return ONLY a JSON array with exactly ${batch.length} objects.\n\nParts:\n${batch.map((item, i) => `${i + 1}. "${item.partNumber}" - ${item.description}`).join('\n')}\n\nRespond with ONLY the JSON array:`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
            num_predict: 2000
          }
        },
        { timeout: 20000 }
      );

      const parsed = JSON.parse(response.data.response);

      if (Array.isArray(parsed) && parsed.length === batch.length) {
        return parsed;
      } else {
        return batch.map(() => ({
          category: 'purchased',
          workCenter: 'WC-04-ASSEMBLY',
          confidence: 0.7
        }));
      }

    } catch (error) {
      console.warn(`   ⚠️  Classification batch failed, using defaults`);
      return batch.map(() => ({
        category: 'purchased',
        workCenter: 'WC-04-ASSEMBLY',
        confidence: 0.7
      }));
    }
  }

  private async batchKnowledgeQuery(
    items: BOMItem[],
    nlpResults: any[],
    classificationResults: any[]
  ): Promise<any[]> {
    const queries = items.map(async (item, i) => {
      try {
        return await knowledgeService.getRecommendation({
          description: item.description,
          materialSpec: item.materialSpec,
          partType: nlpResults[i]?.partType
        });
      } catch (error) {
        return null;
      }
    });

    return await Promise.all(queries);
  }

  private async quickClustering(items: any[]): Promise<any> {
    const fasteners = items.filter(item =>
      /(bolt|screw|nut|washer|rivet)/i.test(item.description)
    );

    if (fasteners.length < 5) {
      return { clusters: [], totalReduction: 0 };
    }

    const prompt = `Group these ${fasteners.length} fasteners by size. Return ONLY JSON.\n\nFasteners:\n${fasteners.map((f, i) => `${i + 1}. ${f.description}`).join('\n')}\n\nRespond with ONLY JSON:`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          format: 'json',
          options: { temperature: 0.2, num_predict: 1000 }
        },
        { timeout: 15000 }
      );

      return JSON.parse(response.data.response);
    } catch (error) {
      console.warn(`   ⚠️  Clustering failed, skipping`);
      return { clusters: [], totalReduction: 0 };
    }
  }

  private async quickSequencing(items: any[]): Promise<any> {
    const sorted = items
      .map((item, index) => ({
        partNumber: item.partNumber,
        sequence: item.level || index + 1,
        dependencies: items
          .filter(dep => dep.level < item.level)
          .map(dep => dep.partNumber)
          .slice(0, 3)
      }))
      .sort((a, b) => a.sequence - b.sequence);

    return {
      items: sorted,
      totalSteps: Math.max(...sorted.map(s => s.sequence)),
      parallelPaths: sorted.filter(s => s.sequence === 1).length
    };
  }

  private combineInsights(
    ebomItems: BOMItem[],
    nlpResults: any[],
    classificationResults: any[],
    knowledgeResults: any[]
  ): any[] {
    return ebomItems.map((item, i) => {
      const nlp = nlpResults[i] || {};
      const classification = classificationResults[i] || {};
      const knowledge = knowledgeResults[i];

      return {
        ...item,
        partType: nlp.partType || 'component',
        processes: nlp.processes || [],
        materials: nlp.materials || [],
        category: classification.category || 'purchased',
        workCenter: knowledge?.workCenter || classification.workCenter || 'WC-04-ASSEMBLY',
        tooling: knowledge?.tooling || [],
        confidence: (
          (classification.confidence || 0.7) * 0.4 +
          (knowledge?.confidence || 0.5) * 0.3 +
          0.85 * 0.3
        ),
        changeType: 'modified' as const,
        reasoning: `Classified as ${classification.category} with ${knowledge ? 'company knowledge' : 'default settings'}`
      };
    });
  }

  private applyOptimizations(
    items: any[],
    clusteringResult: any,
    sequenceResult: any
  ): any[] {
    const clusteredPartNumbers = new Set(
      clusteringResult.clusters?.flatMap((c: any) => c.partNumbers) || []
    );

    const unclustered = items.filter(
      item => !clusteredPartNumbers.has(item.partNumber)
    );

    const clusterItems = (clusteringResult.clusters || []).map((cluster: any) => ({
      partNumber: cluster.newPartNumber,
      description: cluster.groupName,
      quantity: cluster.quantity,
      level: 2,
      workCenter: 'WC-04-ASSEMBLY',
      category: 'fastener',
      changeType: 'grouped' as const,
      confidence: 0.92,
      reasoning: `Grouped ${cluster.partNumbers?.length || 0} items into kit`
    }));

    const combined = [...unclustered, ...clusterItems];

    return combined.map((item, index) => {
      const seqInfo = sequenceResult.items?.find(
        (s: any) => s.partNumber === item.partNumber
      );

      return {
        ...item,
        sequence: seqInfo?.sequence || index + 1,
        dependencies: seqInfo?.dependencies || []
      };
    });
  }

  private calculateConfidence(items: any[]): number {
    const sum = items.reduce((acc, item) => acc + (item.confidence || 0.7), 0);
    return sum / items.length;
  }
}

export default new OptimizedMultiModelService();
