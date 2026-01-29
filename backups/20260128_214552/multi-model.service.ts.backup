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

interface MBOMItem extends BOMItem {
  workCenter?: string;
  tooling?: string[];
  processSteps?: string[];
  changeType: 'added' | 'modified' | 'unchanged' | 'grouped';
  confidence: number;
  reasoning: string;
  category?: string;
  sequence?: number;
  dependencies?: string[];
  alternatives?: Array<{
    description: string;
    confidence: number;
  }>;
}

interface MultiModelResult {
  mbomItems: MBOMItem[];
  overallAssessment: string;
  overallConfidence: number;
  changes: {
    added: any[];
    modified: any[];
    grouped: any[];
  };
  modelInsights: {
    nlpAnalysis: string;
    classificationSummary: string;
    sequencingOptimization: string;
    clusteringEfficiency: string;
    knowledgeApplied: string;
  };
  performanceMetrics: {
    totalProcessingTime: number;
    modelsUsed: string[];
    itemsProcessed: number;
  };
}

class MultiModelService {
  private ollamaAvailable: boolean = false;
  
  constructor() {
    this.checkOllamaAvailability();
  }

  private async checkOllamaAvailability(): Promise<void> {
    try {
      const axios = require('axios');
      await axios.get(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`, {
        timeout: 5000
      });
      this.ollamaAvailable = true;
      console.log('✅ Ollama available for multi-model processing');
    } catch (error) {
      this.ollamaAvailable = false;
      console.log('⚠️  Ollama not available - multi-model features limited');
    }
  }

  /**
   * Convert eBOM using all 5 AI models in orchestrated workflow
   */
  async convertWithMultiModel(ebomItems: BOMItem[]): Promise<MultiModelResult> {
    console.log('🚀 Starting multi-model AI conversion with 5 specialized models...');
    console.log(`📊 Processing ${ebomItems.length} parts`);
    
    const startTime = Date.now();
    const modelsUsed: string[] = [];

    // STEP 1: NLP Context Understanding (Model 1)
    console.log('\n📖 STEP 1/5: NLP Context Analysis...');
    const nlpStartTime = Date.now();
    const nlpResults = await nlpService.analyzeBatch(
      ebomItems.map(item => item.description)
    );
    modelsUsed.push('NLP Context Understanding');
    console.log(`✅ NLP Analysis complete in ${Date.now() - nlpStartTime}ms`);
    console.log(`   - Identified ${nlpResults.filter(r => r.partType === 'assembly').length} assemblies`);
    console.log(`   - Detected ${new Set(nlpResults.flatMap(r => r.processes)).size} unique processes`);

    // STEP 2: Classification (Model 2)
    console.log('\n🏷️  STEP 2/5: Part Classification...');
    const classStartTime = Date.now();
    const classifiedParts = await classificationService.classifyBatch(
      ebomItems.map((item, i) => ({
        ...item,
        nlpContext: nlpResults[i]
      }))
    );
    modelsUsed.push('Classification Model');
    console.log(`✅ Classification complete in ${Date.now() - classStartTime}ms`);
    
    const categoryDist = classificationService.getCategoryDistribution(classifiedParts);
    console.log(`   - Categories: ${JSON.stringify(categoryDist)}`);

    // STEP 3: Query Knowledge Graph (Model 5)
    console.log('\n🧠 STEP 3/5: Knowledge Graph Query...');
    const knowledgeStartTime = Date.now();
    const recommendations = await Promise.all(
      ebomItems.map((item, i) =>
        knowledgeService.getRecommendation({
          description: item.description,
          materialSpec: item.materialSpec,
          partType: nlpResults[i].partType,
          category: classifiedParts[i].category,
          processes: nlpResults[i].processes
        })
      )
    );
    modelsUsed.push('Knowledge Graph');
    const knowledgeUsed = recommendations.filter(r => r !== null).length;
    console.log(`✅ Knowledge query complete in ${Date.now() - knowledgeStartTime}ms`);
    console.log(`   - Applied ${knowledgeUsed} knowledge recommendations`);

    // STEP 4: Combine NLP, Classification, and Knowledge
    console.log('\n🔗 STEP 4/5: Combining Model Insights...');
    let mbomItems: MBOMItem[] = ebomItems.map((item, i) => {
      const classification = classifiedParts[i];
      const knowledge = recommendations[i];
      const nlp = nlpResults[i];

      // Combine insights from all models
      const workCenter = knowledge?.workCenter || classification.suggestedWorkCenter;
      const tooling = knowledge?.tooling || [];
      
      // Calculate combined confidence
      const combinedConfidence = (
        classification.confidence * 0.4 + // 40% from classification
        (knowledge?.confidence || 0.5) * 0.3 + // 30% from knowledge
        nlp.confidence * 0.3 // 30% from NLP
      );

      return {
        ...item,
        category: classification.category,
        workCenter,
        tooling,
        processSteps: knowledge?.processSteps || [],
        confidence: Math.round(combinedConfidence * 100) / 100,
        changeType: 'modified' as const,
        reasoning: this.combineReasoning(classification, knowledge, nlp),
        alternatives: classification.alternatives?.map(alt => ({
          description: alt.category,
          confidence: alt.confidence
        }))
      };
    });

    console.log(`✅ Combined ${mbomItems.length} items with multi-model insights`);

    // STEP 5: Clustering (Model 4)
    console.log('\n📦 STEP 5/5: Part Clustering & Optimization...');
    const clusterStartTime = Date.now();
    const clusteringResult = await clusteringService.groupParts(mbomItems);
    modelsUsed.push('Clustering Algorithm');
    
    if (clusteringResult.clusters.length > 0) {
      mbomItems = clusteringService.applyClustering(mbomItems, clusteringResult);
      console.log(`✅ Clustering complete in ${Date.now() - clusterStartTime}ms`);
      console.log(`   - Created ${clusteringResult.clusters.length} kits`);
      console.log(`   - Reduced ${clusteringResult.totalReduction} items`);
    } else {
      console.log(`ℹ️  No clustering opportunities found`);
    }

    // STEP 6: Assembly Sequencing (Model 3)
    console.log('\n🔢 STEP 6/5: Assembly Sequencing (Bonus)...');
    const seqStartTime = Date.now();
    const sequenceResult = await sequencingService.determineSequence(mbomItems);
    modelsUsed.push('Sequence Optimizer');
    
    // Apply sequence to items
    mbomItems = mbomItems.map(item => {
      const seqInfo = sequenceResult.items.find(s => s.partNumber === item.partNumber);
      return {
        ...item,
        sequence: seqInfo?.sequence || 0,
        dependencies: seqInfo?.dependencies || []
      };
    });
    
    console.log(`✅ Sequencing complete in ${Date.now() - seqStartTime}ms`);
    console.log(`   - Optimized to ${sequenceResult.totalSteps} steps`);
    console.log(`   - ${sequenceResult.parallelPaths} parallel paths identified`);

    // Calculate overall metrics
    const totalProcessingTime = Date.now() - startTime;
    const overallConfidence = this.calculateOverallConfidence(mbomItems);

    // Store successful conversions in knowledge base
    await this.learnFromConversion(mbomItems);

    // Build comprehensive assessment
    const modelInsights = {
      nlpAnalysis: `Analyzed ${ebomItems.length} part descriptions. Identified ${new Set(nlpResults.flatMap(r => r.processes)).size} manufacturing processes and ${new Set(nlpResults.flatMap(r => r.materials)).size} materials.`,
      
      classificationSummary: `Classified parts into ${Object.keys(categoryDist).length} categories: ${Object.entries(categoryDist).map(([cat, count]) => `${count} ${cat}`).join(', ')}.`,
      
      sequencingOptimization: `${sequenceResult.estimatedSavings}. Identified ${sequenceResult.parallelPaths} parallel assembly paths. Critical path: ${sequenceResult.criticalPath.slice(0, 3).join(' → ')}${sequenceResult.criticalPath.length > 3 ? '...' : ''}.`,
      
      clusteringEfficiency: clusteringResult.clusters.length > 0 
        ? `${clusteringResult.efficiency}. Created ${clusteringResult.clusters.length} optimized kits.`
        : 'No clustering performed - insufficient similar parts.',
      
      knowledgeApplied: knowledgeUsed > 0
        ? `Applied ${knowledgeUsed} learned preferences from knowledge base (based on ${knowledgeUsed} similar past conversions).`
        : 'No prior knowledge available - learning from this conversion.'
    };

    const overallAssessment = `
Multi-Model AI Conversion Complete! 

🎯 5-Model Architecture:
   1️⃣  NLP Context Understanding - Analyzed part descriptions and extracted technical context
   2️⃣  Classification Model - Categorized parts and assigned work centers
   3️⃣  Assembly Sequence Optimizer - Determined optimal build order
   4️⃣  Clustering Algorithm - ${clusteringResult.clusters.length > 0 ? `Grouped ${clusteringResult.totalReduction} items into ${clusteringResult.clusters.length} kits` : 'No grouping opportunities'}
   5️⃣  Knowledge Graph - Applied ${knowledgeUsed} learned patterns from past conversions

📊 Results:
   • ${mbomItems.length} manufacturing items generated
   • ${Math.round(overallConfidence * 100)}% average confidence
   • ${sequenceResult.totalSteps} optimized assembly steps
   • ${clusteringResult.totalReduction || 0} items consolidated through clustering
   • Processing time: ${(totalProcessingTime / 1000).toFixed(1)}s

💡 Key Improvements:
   ${sequenceResult.estimatedSavings}
   ${clusteringResult.efficiency}
    `.trim();

    console.log('\n✅ Multi-model conversion complete!');
    console.log(`⏱️  Total time: ${(totalProcessingTime / 1000).toFixed(1)}s`);
    console.log(`🎯 Overall confidence: ${Math.round(overallConfidence * 100)}%`);

    return {
      mbomItems,
      overallAssessment,
      overallConfidence,
      changes: {
        added: [],
        modified: mbomItems.filter(item => item.changeType === 'modified'),
        grouped: clusteringResult.clusters
      },
      modelInsights,
      performanceMetrics: {
        totalProcessingTime,
        modelsUsed,
        itemsProcessed: ebomItems.length
      }
    };
  }

  /**
   * Combine reasoning from multiple models
   */
  private combineReasoning(classification: any, knowledge: any, nlp: any): string {
    const parts: string[] = [];

    // Classification reasoning
    parts.push(`Classification: ${classification.reasoning}`);

    // Knowledge reasoning (if available)
    if (knowledge) {
      parts.push(`Knowledge: ${knowledge.reasoning}`);
    }

    // NLP context
    if (nlp.processes.length > 0) {
      parts.push(`Processes: ${nlp.processes.join(', ')}`);
    }

    return parts.join(' | ');
  }

  /**
   * Calculate overall confidence from all items
   */
  private calculateOverallConfidence(items: MBOMItem[]): number {
    if (items.length === 0) return 0;
    
    const total = items.reduce((sum, item) => sum + item.confidence, 0);
    return Math.round((total / items.length) * 100) / 100;
  }

  /**
   * Learn from successful conversion
   */
  private async learnFromConversion(items: MBOMItem[]): Promise<void> {
    try {
      // Store each item as potential knowledge
      const learningPromises = items
        .filter(item => item.changeType === 'modified') // Only learn from modified items
        .map(item =>
          knowledgeService.addKnowledgeFromConversion({
            partNumber: item.partNumber,
            description: item.description,
            category: item.category || 'unknown',
            workCenter: item.workCenter || '',
            tooling: item.tooling,
            material: item.materialSpec,
            wasModified: false // Assuming AI was correct if not user-corrected
          })
        );

      await Promise.all(learningPromises);
      console.log(`📚 Stored ${learningPromises.length} items in knowledge base for future learning`);
    } catch (error) {
      console.error('⚠️  Failed to store knowledge from conversion:', error);
    }
  }

  /**
   * Get model health status
   */
  async getModelStatus(): Promise<{
    nlp: boolean;
    classification: boolean;
    sequencing: boolean;
    clustering: boolean;
    knowledge: boolean;
    overall: string;
  }> {
    const knowledge = await knowledgeService.getLearningStats();
    
    return {
      nlp: this.ollamaAvailable,
      classification: this.ollamaAvailable,
      sequencing: this.ollamaAvailable,
      clustering: this.ollamaAvailable,
      knowledge: knowledge.totalEntries > 0,
      overall: this.ollamaAvailable 
        ? `All 5 models operational. Knowledge base: ${knowledge.totalEntries} entries.`
        : 'Ollama required for multi-model features. Currently using fallback rules.'
    };
  }
}

export default new MultiModelService();
