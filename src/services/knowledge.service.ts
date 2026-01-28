import mongoose from 'mongoose';

// Knowledge Schema - stores learned patterns and preferences
const KnowledgeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['rule', 'pattern', 'preference', 'history'],
    required: true
  },
  context: {
    partType: String,
    process: String,
    material: String,
    industry: String,
    category: String
  },
  knowledge: {
    workCenter: String,
    tooling: [String],
    sequence: [String],
    reasoning: String,
    processTime: String
  },
  confidence: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1
  },
  usage_count: {
    type: Number,
    default: 1
  },
  success_rate: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1
  },
  created_from: {
    type: String,
    enum: ['user_feedback', 'ai_learning', 'initial_training', 'system'],
    default: 'system'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  last_used: {
    type: Date,
    default: Date.now
  }
});

// Indexes for fast queries
KnowledgeSchema.index({ 'context.partType': 1, confidence: -1 });
KnowledgeSchema.index({ 'context.material': 1, confidence: -1 });
KnowledgeSchema.index({ usage_count: -1 });

const Knowledge = mongoose.model('Knowledge', KnowledgeSchema);

interface KnowledgeRecommendation {
  workCenter?: string;
  tooling?: string[];
  processSteps?: string[];
  confidence: number;
  reasoning: string;
  basedOn: string;
}

class KnowledgeService {
  /**
   * Query knowledge base for recommendations
   * This is Model 5: Knowledge Graph
   */
  async queryKnowledge(context: {
    partType?: string;
    process?: string;
    material?: string;
    category?: string;
  }): Promise<any[]> {
    const query: any = {};
    
    // Build query based on provided context
    if (context.partType) {
      query['context.partType'] = context.partType;
    }
    if (context.process) {
      query['context.process'] = context.process;
    }
    if (context.material) {
      query['context.material'] = context.material;
    }
    if (context.category) {
      query['context.category'] = context.category;
    }

    try {
      const results = await Knowledge.find(query)
        .sort({ confidence: -1, usage_count: -1, success_rate: -1 })
        .limit(5)
        .lean();

      // Update last_used timestamp
      if (results.length > 0) {
        await Knowledge.updateMany(
          { _id: { $in: results.map(r => r._id) } },
          { $set: { last_used: new Date() } }
        );
      }

      return results;
    } catch (error) {
      console.error('❌ Knowledge query failed:', error);
      return [];
    }
  }

  /**
   * Get recommendation for a specific part
   */
  async getRecommendation(part: {
    description: string;
    materialSpec?: string;
    partType?: string;
    category?: string;
    processes?: string[];
  }): Promise<KnowledgeRecommendation | null> {
    const knowledge = await this.queryKnowledge({
      partType: part.partType,
      material: part.materialSpec,
      category: part.category
    });

    if (knowledge.length === 0) {
      return null;
    }

    // Return highest confidence recommendation
    const best = knowledge[0];
    
    return {
      workCenter: best.knowledge.workCenter,
      tooling: best.knowledge.tooling || [],
      processSteps: best.knowledge.sequence || [],
      confidence: best.confidence,
      reasoning: `Based on ${best.usage_count} similar cases (${Math.round(best.success_rate * 100)}% success rate): ${best.knowledge.reasoning}`,
      basedOn: best.type
    };
  }

  /**
   * Add knowledge from user feedback
   */
  async addKnowledgeFromFeedback(feedback: {
    partType: string;
    category?: string;
    material?: string;
    originalWorkCenter: string;
    correctedWorkCenter: string;
    reasoning: string;
  }): Promise<void> {
    try {
      // Check if similar knowledge exists
      const existing = await Knowledge.findOne({
        'context.partType': feedback.partType,
        'context.category': feedback.category,
        'knowledge.workCenter': feedback.correctedWorkCenter
      });

      if (existing) {
        // Increase confidence and usage count
        existing.usage_count += 1;
        existing.confidence = Math.min(1, existing.confidence + 0.05);
        existing.updated_at = new Date();
        existing.last_used = new Date();
        
        // Update reasoning if provided
        if (feedback.reasoning && existing.knowledge) {
          existing.knowledge.reasoning = feedback.reasoning;
        }
        
        await existing.save();
        
        console.log(`📚 Updated existing knowledge: ${feedback.partType} → ${feedback.correctedWorkCenter}`);
      } else {
        // Create new knowledge entry
        await Knowledge.create({
          type: 'preference',
          context: {
            partType: feedback.partType,
            category: feedback.category,
            material: feedback.material
          },
          knowledge: {
            workCenter: feedback.correctedWorkCenter,
            reasoning: feedback.reasoning || `User correction from ${feedback.originalWorkCenter}`
          },
          confidence: 0.6, // Start with moderate confidence
          usage_count: 1,
          success_rate: 1.0,
          created_from: 'user_feedback'
        });
        
        console.log(`📖 Created new knowledge: ${feedback.partType} → ${feedback.correctedWorkCenter}`);
      }
    } catch (error) {
      console.error('❌ Failed to add knowledge from feedback:', error);
    }
  }

  /**
   * Add knowledge from successful conversions
   */
  async addKnowledgeFromConversion(conversion: {
    partNumber: string;
    description: string;
    category: string;
    workCenter: string;
    tooling?: string[];
    material?: string;
    wasModified: boolean;
  }): Promise<void> {
    try {
      // Only learn from parts that weren't modified by user
      if (conversion.wasModified) {
        return;
      }

      const existing = await Knowledge.findOne({
        'context.category': conversion.category,
        'knowledge.workCenter': conversion.workCenter
      });

      if (existing) {
        existing.usage_count += 1;
        existing.success_rate = (existing.success_rate * existing.usage_count + 1) / (existing.usage_count + 1);
        existing.updated_at = new Date();
        await existing.save();
      } else {
        await Knowledge.create({
          type: 'history',
          context: {
            category: conversion.category,
            material: conversion.material
          },
          knowledge: {
            workCenter: conversion.workCenter,
            tooling: conversion.tooling,
            reasoning: `Learned from successful conversion`
          },
          confidence: 0.5,
          created_from: 'ai_learning'
        });
      }
    } catch (error) {
      console.error('❌ Failed to add knowledge from conversion:', error);
    }
  }

  /**
   * Periodic retraining - update confidence scores
   */
  async retrainModel(): Promise<void> {
    try {
      console.log('🔄 Starting knowledge graph retraining...');

      // Get all knowledge entries
      const allKnowledge = await Knowledge.find();

      let updatedCount = 0;
      
      for (const k of allKnowledge) {
        let shouldUpdate = false;
        
        // Decay confidence for old, unused knowledge
        const daysSinceLastUse = (Date.now() - k.last_used.getTime()) / (1000 * 60 * 60 * 24);
        
        // Decay if not used in 90 days
        if (daysSinceLastUse > 90 && k.confidence > 0.3) {
          k.confidence = Math.max(0.3, k.confidence - 0.1);
          shouldUpdate = true;
        }
        
        // Boost confidence for frequently used knowledge
        if (k.usage_count > 10 && k.success_rate > 0.9 && k.confidence < 0.95) {
          k.confidence = Math.min(0.95, k.confidence + 0.05);
          shouldUpdate = true;
        }
        
        // Reduce confidence for low success rate
        if (k.success_rate < 0.7 && k.confidence > 0.4) {
          k.confidence = Math.max(0.4, k.confidence - 0.1);
          shouldUpdate = true;
        }
        
        if (shouldUpdate) {
          k.updated_at = new Date();
          await k.save();
          updatedCount++;
        }
      }

      console.log(`✅ Knowledge graph retrained: ${updatedCount} entries updated`);
    } catch (error) {
      console.error('❌ Knowledge retraining failed:', error);
    }
  }

  /**
   * Get learning statistics
   */
  async getLearningStats(): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    averageConfidence: number;
    highConfidenceCount: number;
    recentLearning: number;
  }> {
    try {
      const allKnowledge = await Knowledge.find();
      
      const byType: Record<string, number> = {};
      const bySource: Record<string, number> = {};
      let totalConfidence = 0;
      let highConfidenceCount = 0;
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      let recentLearning = 0;
      
      allKnowledge.forEach(k => {
        // Count by type
        byType[k.type] = (byType[k.type] || 0) + 1;
        
        // Count by source
        bySource[k.created_from] = (bySource[k.created_from] || 0) + 1;
        
        // Confidence metrics
        totalConfidence += k.confidence;
        if (k.confidence > 0.8) {
          highConfidenceCount++;
        }
        
        // Recent learning
        if (k.created_at > oneWeekAgo) {
          recentLearning++;
        }
      });
      
      return {
        totalEntries: allKnowledge.length,
        byType,
        bySource,
        averageConfidence: allKnowledge.length > 0 
          ? Math.round(totalConfidence / allKnowledge.length * 100) / 100 
          : 0,
        highConfidenceCount,
        recentLearning
      };
    } catch (error) {
      console.error('❌ Failed to get learning stats:', error);
      return {
        totalEntries: 0,
        byType: {},
        bySource: {},
        averageConfidence: 0,
        highConfidenceCount: 0,
        recentLearning: 0
      };
    }
  }

  /**
   * Seed initial knowledge for common manufacturing patterns
   */
  async seedInitialKnowledge(): Promise<void> {
    try {
      const existingCount = await Knowledge.countDocuments();
      
      if (existingCount > 0) {
        console.log(`ℹ️  Knowledge base already seeded (${existingCount} entries)`);
        return;
      }

      console.log('🌱 Seeding initial knowledge base...');

      const initialKnowledge = [
        // Fasteners
        {
          type: 'rule',
          context: { category: 'fastener' },
          knowledge: {
            workCenter: 'WC-04-ASSEMBLY',
            reasoning: 'Fasteners are typically installed during assembly'
          },
          confidence: 0.95,
          created_from: 'system'
        },
        // Welded parts
        {
          type: 'rule',
          context: { category: 'welded', material: 'steel' },
          knowledge: {
            workCenter: 'WC-02-WELDING',
            tooling: ['WF-WELD-001', 'WF-FIXTURE-001'],
            reasoning: 'Steel welded parts require welding work center'
          },
          confidence: 0.9,
          created_from: 'system'
        },
        // Machined parts
        {
          type: 'rule',
          context: { category: 'machined' },
          knowledge: {
            workCenter: 'WC-01-MACHINING',
            reasoning: 'Machined parts require machining operations'
          },
          confidence: 0.9,
          created_from: 'system'
        },
        // Purchased parts
        {
          type: 'rule',
          context: { category: 'purchased' },
          knowledge: {
            workCenter: 'WC-04-ASSEMBLY',
            reasoning: 'Purchased parts go directly to assembly'
          },
          confidence: 0.95,
          created_from: 'system'
        },
        // Tooling
        {
          type: 'rule',
          context: { category: 'tooling' },
          knowledge: {
            workCenter: 'WC-04-ASSEMBLY',
            reasoning: 'Tooling and fixtures support assembly operations'
          },
          confidence: 0.85,
          created_from: 'system'
        }
      ];

      await Knowledge.insertMany(initialKnowledge);
      
      console.log(`✅ Seeded ${initialKnowledge.length} initial knowledge entries`);
    } catch (error) {
      console.error('❌ Failed to seed initial knowledge:', error);
    }
  }

  /**
   * Export knowledge base for backup
   */
  async exportKnowledge(): Promise<any[]> {
    try {
      return await Knowledge.find().lean();
    } catch (error) {
      console.error('❌ Failed to export knowledge:', error);
      return [];
    }
  }

  /**
   * Import knowledge from backup
   */
  async importKnowledge(knowledgeData: any[]): Promise<void> {
    try {
      await Knowledge.insertMany(knowledgeData);
      console.log(`✅ Imported ${knowledgeData.length} knowledge entries`);
    } catch (error) {
      console.error('❌ Failed to import knowledge:', error);
    }
  }
}

export default new KnowledgeService();
