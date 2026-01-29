import axios from 'axios';

interface NLPResult {
  partType: 'assembly' | 'component' | 'material' | 'tooling' | 'consumable';
  processes: string[];
  materials: string[];
  dimensions?: string;
  contextSummary: string;
  keywords: string[];
  confidence: number;
}

class NLPService {
  private ollamaUrl: string;
  private model: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  }

  /**
   * Analyze part description using NLP to understand context
   * This is Model 1: Context Understanding
   */
  async analyzeDescription(description: string): Promise<NLPResult> {
    const prompt = `You are an expert NLP analyst for manufacturing parts. Analyze this part description and extract structured information.

Description: "${description}"

Extract the following:
1. Part type (assembly/component/material/tooling/consumable)
2. Manufacturing processes mentioned (welding, machining, fabrication, casting, molding, etc.)
3. Materials mentioned (steel, aluminum, plastic, rubber, etc.)
4. Dimensions if any (measurements like 1000x800mm, 50mm diameter, etc.)
5. Brief context summary explaining what this part is
6. Key technical keywords

Respond ONLY with valid JSON in this exact format:
{
  "partType": "assembly",
  "processes": ["welding", "fabrication"],
  "materials": ["steel"],
  "dimensions": "1000x800mm",
  "contextSummary": "Structural welded steel assembly forming the main frame",
  "keywords": ["housing", "frame", "welded", "structural", "assembly"],
  "confidence": 0.92
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
            temperature: 0.2,
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
      
      // Validate and set default confidence
      if (!result.confidence) {
        result.confidence = 0.7;
      }

      return result;
    } catch (error: any) {
      console.error('❌ NLP analysis failed:', error.message);
      
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(description);
    }
  }

  /**
   * Batch analyze multiple descriptions efficiently
   */
  async analyzeBatch(descriptions: string[]): Promise<NLPResult[]> {
    console.log(`📖 Analyzing ${descriptions.length} part descriptions...`);
    
    const results = await Promise.all(
      descriptions.map(desc => this.analyzeDescription(desc))
    );
    
    console.log('✅ NLP batch analysis complete');
    return results;
  }

  /**
   * Fallback rule-based analysis when AI fails
   */
  private fallbackAnalysis(description: string): NLPResult {
    const desc = description.toLowerCase();
    
    // Detect part type
    let partType: NLPResult['partType'] = 'component';
    if (/assembly|assy|sub-assy/i.test(desc)) partType = 'assembly';
    else if (/bolt|screw|nut|washer|fastener/i.test(desc)) partType = 'component';
    else if (/fixture|jig|tool|mold/i.test(desc)) partType = 'tooling';
    else if (/adhesive|lubricant|tape|packaging/i.test(desc)) partType = 'consumable';
    else if (/sheet|plate|bar|tube|raw/i.test(desc)) partType = 'material';

    // Detect processes
    const processes: string[] = [];
    if (/weld/i.test(desc)) processes.push('welding');
    if (/machine|mill|turn|drill|bore/i.test(desc)) processes.push('machining');
    if (/fabricat|sheet metal/i.test(desc)) processes.push('fabrication');
    if (/cast|casting/i.test(desc)) processes.push('casting');
    if (/mold|molding/i.test(desc)) processes.push('molding');
    if (/assemble|assembly/i.test(desc)) processes.push('assembly');
    if (/paint|coating/i.test(desc)) processes.push('painting');

    // Detect materials
    const materials: string[] = [];
    if (/steel|stainless/i.test(desc)) materials.push('steel');
    if (/aluminum|aluminium/i.test(desc)) materials.push('aluminum');
    if (/plastic|polymer|nylon/i.test(desc)) materials.push('plastic');
    if (/rubber/i.test(desc)) materials.push('rubber');
    if (/copper|brass/i.test(desc)) materials.push('copper');

    // Extract dimensions
    const dimensionMatch = desc.match(/\d+\s*x\s*\d+(\s*x\s*\d+)?(\s*mm)?/i);
    const dimensions = dimensionMatch ? dimensionMatch[0] : undefined;

    // Extract keywords
    const keywords = description
      .toLowerCase()
      .split(/[,\s]+/)
      .filter(word => word.length > 3)
      .slice(0, 5);

    return {
      partType,
      processes,
      materials,
      dimensions,
      contextSummary: `${partType} with ${processes.join(', ')} processes`,
      keywords,
      confidence: 0.6
    };
  }
}

export default new NLPService();
