import axios from 'axios';

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
  alternatives?: Array<{
    description: string;
    confidence: number;
  }>;
}

interface ConversionResult {
  mbomItems: MBOMItem[];
  overallAssessment: string;
  overallConfidence: number;
  changes: {
    added: any[];
    modified: any[];
    grouped: any[];
  };
}

class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:13b';
    
    console.log('✅ Ollama service initialized');
    console.log(`📍 Ollama URL: ${this.baseUrl}`);
    console.log(`🤖 Model: ${this.model}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      const models = response.data.models || [];
      const modelExists = models.some((m: any) => m.name === this.model);
      
      if (!modelExists) {
        console.warn(`⚠️  Model ${this.model} not found. Available models:`, models.map((m: any) => m.name));
        return false;
      }
      
      console.log('✅ Ollama connection successful');
      return true;
    } catch (error) {
      console.error('❌ Ollama connection failed:', error);
      return false;
    }
  }

  async convertEBOMToMBOM(ebomItems: BOMItem[]): Promise<ConversionResult> {
    try {
      console.log(`🤖 Starting Ollama AI conversion for ${ebomItems.length} items...`);
      
      const prompt = this.buildConversionPrompt(ebomItems);
      
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json',
          options: {
            temperature: 0.3,
            num_predict: 8000,
            top_p: 0.9,
          }
        },
        {
          timeout: 300000, // 5 minutes timeout for large BOMs
        }
      );

      if (!response.data || !response.data.message || !response.data.message.content) {
        throw new Error('Empty response from Ollama');
      }

      console.log('📄 Received response from Ollama');

      // Parse JSON response
      const result: ConversionResult = JSON.parse(response.data.message.content);

      // Validate response structure
      if (!result.mbomItems || !Array.isArray(result.mbomItems)) {
        throw new Error('Invalid response format: missing mbomItems array');
      }

      if (result.overallConfidence === undefined) {
        throw new Error('Invalid response format: missing overallConfidence');
      }

      console.log(`✅ Ollama conversion complete: ${result.mbomItems.length} items generated`);
      console.log(`📊 Overall confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);

      return result;

    } catch (error: any) {
      console.error('❌ Ollama AI Error:', error);

      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama server is not running. Please start it with: ollama serve');
      }

      if (error.message?.includes('model')) {
        throw new Error(`Model ${this.model} not found. Please download it with: ollama pull ${this.model}`);
      }

      if (error.message?.includes('timeout')) {
        throw new Error('Ollama processing timeout. BOM might be too large.');
      }

      if (error.message?.includes('JSON')) {
        console.error('JSON Parse Error. Raw response:', error);
        throw new Error('Failed to parse Ollama response. Please try again.');
      }

      throw new Error(`Ollama conversion failed: ${error.message}`);
    }
  }

  private buildConversionPrompt(ebomItems: BOMItem[]): string {
    return `You are an expert manufacturing engineer specializing in Bill of Materials (BOM) transformation. Convert this eBOM to mBOM.

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY valid JSON - no markdown, no code blocks, no extra text
2. Your ENTIRE response must be a single JSON object
3. Do not include \`\`\`json or any other formatting

INPUT eBOM:
${JSON.stringify(ebomItems, null, 2)}

OUTPUT FORMAT (respond with this exact structure):
{
  "overallAssessment": "Brief paragraph explaining transformation",
  "overallConfidence": 0.85,
  "mbomItems": [
    {
      "partNumber": "string",
      "description": "string with manufacturing details",
      "quantity": 1,
      "level": 0,
      "workCenter": "WC-01-MACHINING",
      "tooling": ["WF-101"],
      "processSteps": ["Step 1", "Step 2"],
      "materialSpec": "string or null",
      "notes": "string or null",
      "changeType": "added",
      "confidence": 0.9,
      "reasoning": "Why this classification was made",
      "alternatives": []
    }
  ],
  "changes": {
    "added": [],
    "modified": [],
    "grouped": []
  }
}

Remember: Respond with ONLY the JSON object, nothing else.`;
  }

  async estimateTokens(text: string): Promise<number> {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  async getModelInfo(): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/show`, {
        name: this.model
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get model info:', error);
      return null;
    }
  }
}

export default new OllamaService();
