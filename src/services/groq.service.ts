import OpenAI from "openai";
import { BOMItem, MBOMItem, ConversionResult } from "../types";

class GroqService {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.GROQ_API_KEY;
      
      if (!apiKey) {
        throw new Error('GROQ_API_KEY environment variable is not set');
      }

      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      });

      console.log('✅ Groq AI service initialized');
    }
    return this.client;
  }

  async convertEBOMToMBOM(ebomItems: BOMItem[]): Promise<ConversionResult> {
    const client = this.getClient();
    try {
      const prompt = `You are an expert manufacturing engineer specializing in Bill of Materials (BOM) transformation. Your task is to convert an Engineering BOM (eBOM) into a Manufacturing BOM (mBOM).

CONTEXT AND INSTRUCTIONS:
An eBOM represents how a product is designed. An mBOM represents how it's actually built in a factory.

Your responsibilities:
1. Analyze each part for manufacturing requirements
2. Identify assembly sequence and dependencies
3. Add necessary tooling, fixtures, and consumables
4. Assign appropriate work centers based on processes
5. Group parts into sub-assemblies where logical
6. Optimize for manufacturing efficiency

KEY TRANSFORMATIONS:
- Identify manufacturing processes (machining, welding, assembly, etc.)
- Add tooling requirements (fixtures, jigs, molds)
- Group fasteners into kits for efficiency
- Add consumables (adhesives, lubricants, packaging)
- Determine work center assignments
- Optimize assembly sequence (respect dependencies)
- Add quality checkpoints where needed

INPUT eBOM DATA:
${JSON.stringify(ebomItems, null, 2)}

MANUFACTURING CONTEXT:
- Available work centers: WC-01-MACHINING, WC-02-WELDING, WC-03-FABRICATION, WC-04-ASSEMBLY, WC-05-PAINTING, WC-06-INSPECTION, WC-07-PACKAGING
- Standard tooling available: Welding fixtures (WF-XXX), Machining fixtures (MF-XXX), Assembly jigs (AJ-XXX)
- Fastener grouping: Group M6, M8, M10 bolts separately into kits
- Assembly sequence: Bottom-up approach (frame → components → sub-assemblies → final assembly)

OUTPUT REQUIREMENTS:
Respond in JSON format with this exact structure:
{
  "overallAssessment": "Detailed paragraph explaining the transformation approach and key decisions",
  "overallConfidence": number (0.0 to 1.0),
  "mbomItems": [
    {
      "partNumber": "string",
      "description": "string (enhanced with manufacturing details)",
      "quantity": number,
      "level": number (assembly hierarchy),
      "workCenter": "WC-XX-NAME or null",
      "tooling": ["array of tooling part numbers"] or null,
      "processSteps": ["array of process descriptions"] or null,
      "materialSpec": "string or null",
      "notes": "string or null",
      "changeType": "added" | "modified" | "unchanged" | "grouped",
      "confidence": number (0.0 to 1.0),
      "reasoning": "Detailed explanation of why this classification/assignment was made",
      "alternatives": [
        {
          "description": "Alternative approach",
          "confidence": number
        }
      ],
      "children": ["array of child item ids"] or null
    }
  ],
  "changes": {
    "added": [
      {
        "partNumber": "string",
        "description": "string",
        "type": "tooling" | "consumable" | "fixture",
        "reasoning": "Why this was added"
      }
    ],
    "modified": [
      {
        "partNumber": "string",
        "originalDescription": "string",
        "newDescription": "string",
        "reasoning": "Why this was changed"
      }
    ],
    "grouped": [
      {
        "groupName": "string",
        "partNumbers": ["array of part numbers"],
        "newPartNumber": "string (kit part number)",
        "reasoning": "Why these were grouped"
      }
    ]
  }
}

IMPORTANT:
- Be specific about work center assignments
- Provide clear reasoning for each decision
- Use realistic confidence scores (0.7-0.95 range typically)
- Consider assembly sequence (you can't paint before welding)
- Add tooling only where genuinely needed
- Group fasteners intelligently (by size, type, frequency)
- Explain alternatives for lower-confidence decisions
- Maintain parent-child relationships using children array`;

      const response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 8000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from Groq AI");
      }

      const result: ConversionResult = JSON.parse(content);

      // Validate response structure
      if (!result.mbomItems || !Array.isArray(result.mbomItems)) {
        throw new Error("Invalid response format: missing mbomItems array");
      }

      if (result.overallConfidence === undefined) {
        throw new Error("Invalid response format: missing overallConfidence");
      }

      // Generate IDs for items if not present
      result.mbomItems = result.mbomItems.map((item, index) => ({
        ...item,
        id: item.id || `mbom-${index + 1}`,
      }));

      return result;
    } catch (error: any) {
      console.error("Groq AI Error:", error);

      // Handle specific errors
      if (error.message?.includes("API key")) {
        throw new Error("Groq API key not configured");
      }

      if (error.message?.includes("rate limit")) {
        throw new Error("Rate limit exceeded. Please try again shortly.");
      }

      if (error.message?.includes("timeout")) {
        throw new Error("AI processing timeout. Please try with a smaller BOM.");
      }

      throw new Error(`AI conversion failed: ${error.message}`);
    }
  }

  async explainChanges(
    originalItem: BOMItem,
    convertedItem: MBOMItem
  ): Promise<string> {
    try {
      const prompt = `Explain why this BOM item was transformed:

Original (eBOM):
${JSON.stringify(originalItem, null, 2)}

Converted (mBOM):
${JSON.stringify(convertedItem, null, 2)}

Provide a clear, concise explanation for an engineer reviewing this change.`;

      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 500,
      });

      return response.choices[0].message.content || "No explanation available";
    } catch (error: any) {
      console.error("Groq AI Explanation Error:", error);
      return "Unable to generate explanation at this time.";
    }
  }
}

export default new GroqService();

