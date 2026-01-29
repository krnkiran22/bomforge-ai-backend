import axios from 'axios';

interface ClassificationResult {
  category: 'machined' | 'welded' | 'purchased' | 'subassembly' | 'fastener' | 'tooling' | 'consumable';
  confidence: number;
  suggestedWorkCenter: string;
  reasoning: string;
  alternatives?: Array<{
    category: string;
    confidence: number;
  }>;
}

class ClassificationService {
  private ollamaUrl: string;
  private model: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  }

  /**
   * Classify a part into manufacturing category and assign work center
   * This is Model 2: Classification
   */
  async classifyPart(part: {
    partNumber: string;
    description: string;
    materialSpec?: string;
    nlpContext: any;
  }): Promise<ClassificationResult> {
    const prompt = `You are an expert manufacturing classifier. Classify this part into the correct manufacturing category and assign the appropriate work center.

Part Information:
- Part Number: ${part.partNumber}
- Description: ${part.description}
- Material: ${part.materialSpec || 'Unknown'}
- Part Type: ${part.nlpContext.partType}
- Processes Detected: ${part.nlpContext.processes.join(', ') || 'None'}
- Materials: ${part.nlpContext.materials.join(', ') || 'None'}

Classification Categories:
1. machined - Parts that require machining operations (milling, turning, drilling)
2. welded - Welded fabrications and assemblies
3. purchased - Buy from supplier as-is (no internal manufacturing)
4. subassembly - Collection of parts that form a sub-assembly
5. fastener - Bolts, screws, nuts, washers, rivets
6. tooling - Fixtures, jigs, molds, gauges
7. consumable - Adhesives, lubricants, packaging materials

Work Centers:
- WC-01-MACHINING (for machined parts)
- WC-02-WELDING (for welded fabrications)
- WC-03-FABRICATION (for sheet metal work)
- WC-04-ASSEMBLY (for purchased parts and assembly operations)
- WC-05-PAINTING (for painting/coating)
- WC-06-INSPECTION (for inspection/quality control)
- WC-07-PACKAGING (for final packaging)

Analyze the part and determine:
1. Most likely category
2. Confidence score (0.0 to 1.0)
3. Recommended work center
4. Brief reasoning for your decision
5. Alternative classifications if confidence is low

Respond ONLY with valid JSON:
{
  "category": "welded",
  "confidence": 0.92,
  "suggestedWorkCenter": "WC-02-WELDING",
  "reasoning": "Part description mentions 'welded steel frame' and steel material. Clearly a welded fabrication requiring welding work center.",
  "alternatives": [
    {
      "category": "fabrication",
      "confidence": 0.35
    }
  ]
}`;

    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1, // Low temperature for consistent classification
            top_p: 0.9
          }
        },
        {
          timeout: 120000, // 120 seconds (Ollama can be slow)
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const result = JSON.parse(response.data.response);
      
      // Validate confidence
      if (!result.confidence || result.confidence < 0 || result.confidence > 1) {
        result.confidence = 0.7;
      }

      return result;
    } catch (error: any) {
      console.error('❌ Classification failed:', error.message);
      
      // Fallback to rule-based classification
      return this.fallbackClassification(part);
    }
  }

  /**
   * Batch classify multiple parts
   */
  async classifyBatch(parts: any[]): Promise<ClassificationResult[]> {
    console.log(`🏷️  Classifying ${parts.length} parts...`);
    
    const results = await Promise.all(
      parts.map(part => this.classifyPart(part))
    );
    
    console.log('✅ Classification batch complete');
    return results;
  }

  /**
   * Fallback rule-based classification
   */
  private fallbackClassification(part: any): ClassificationResult {
    const desc = part.description.toLowerCase();
    const nlp = part.nlpContext;

    // Rule-based classification
    let category: ClassificationResult['category'] = 'purchased';
    let workCenter = 'WC-04-ASSEMBLY';
    let confidence = 0.6;
    let reasoning = 'Rule-based classification (AI unavailable)';

    // Fasteners
    if (/(bolt|screw|nut|washer|rivet)/i.test(desc)) {
      category = 'fastener';
      workCenter = 'WC-04-ASSEMBLY';
      confidence = 0.9;
      reasoning = 'Identified as fastener by keyword matching';
    }
    // Tooling
    else if (/(fixture|jig|tool|mold|gauge)/i.test(desc)) {
      category = 'tooling';
      workCenter = 'WC-04-ASSEMBLY';
      confidence = 0.85;
      reasoning = 'Identified as tooling by keyword matching';
    }
    // Consumables
    else if (/(adhesive|lubricant|tape|packaging|grease)/i.test(desc)) {
      category = 'consumable';
      workCenter = 'WC-07-PACKAGING';
      confidence = 0.85;
      reasoning = 'Identified as consumable by keyword matching';
    }
    // Welded
    else if (nlp.processes.includes('welding') || /weld/i.test(desc)) {
      category = 'welded';
      workCenter = 'WC-02-WELDING';
      confidence = 0.8;
      reasoning = 'Welding process detected in description';
    }
    // Machined
    else if (nlp.processes.includes('machining') || /(machine|mill|turn|drill)/i.test(desc)) {
      category = 'machined';
      workCenter = 'WC-01-MACHINING';
      confidence = 0.8;
      reasoning = 'Machining process detected in description';
    }
    // Sub-assembly
    else if (nlp.partType === 'assembly' || /(assembly|sub-assy)/i.test(desc)) {
      category = 'subassembly';
      workCenter = 'WC-04-ASSEMBLY';
      confidence = 0.75;
      reasoning = 'Identified as assembly by part type';
    }

    return {
      category,
      confidence,
      suggestedWorkCenter: workCenter,
      reasoning,
      alternatives: []
    };
  }

  /**
   * Get classification statistics for reporting
   */
  getCategoryDistribution(results: ClassificationResult[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    results.forEach(result => {
      distribution[result.category] = (distribution[result.category] || 0) + 1;
    });
    
    return distribution;
  }
}

export default new ClassificationService();
