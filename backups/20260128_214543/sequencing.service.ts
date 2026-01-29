import axios from 'axios';

interface SequenceResult {
  items: Array<{
    partNumber: string;
    sequence: number;
    dependencies: string[];
    parallelWith: string[];
    reasoning: string;
    estimatedTime?: string;
  }>;
  totalSteps: number;
  parallelPaths: number;
  estimatedSavings: string;
  criticalPath: string[];
}

class SequencingService {
  private ollamaUrl: string;
  private model: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  }

  /**
   * Determine optimal assembly sequence
   * This is Model 3: Assembly Sequence Prediction
   */
  async determineSequence(items: any[]): Promise<SequenceResult> {
    // Build dependency graph first
    const dependencyGraph = this.buildDependencyGraph(items);
    
    const prompt = `You are an expert assembly sequence optimizer. Determine the optimal order to assemble these parts.

Parts to Assemble:
${items.map((item, i) => 
  `${i + 1}. ${item.partNumber}: ${item.description} (Level ${item.level}, WC: ${item.workCenter || 'TBD'})`
).join('\n')}

Optimization Rules:
1. Dependencies: Level 0 (base) parts must be assembled first
2. Sub-assemblies at same level can be built in parallel
3. Minimize tooling/work center changes
4. Group similar operations together
5. Fasteners typically come last
6. Consider access constraints (install inner parts before outer)

Dependency Graph:
${JSON.stringify(dependencyGraph, null, 2)}

Analyze and provide:
1. Optimal sequence number for each part
2. Which parts depend on which (prerequisites)
3. Which parts can be assembled in parallel
4. Reasoning for sequence decisions
5. Total assembly steps
6. Number of parallel paths available
7. Time savings compared to pure sequential assembly
8. Critical path (longest dependency chain)

Respond ONLY with valid JSON:
{
  "items": [
    {
      "partNumber": "FRAME-001",
      "sequence": 1,
      "dependencies": [],
      "parallelWith": [],
      "reasoning": "Base structure, foundation for all other parts",
      "estimatedTime": "30 min"
    },
    {
      "partNumber": "PANEL-LEFT",
      "sequence": 2,
      "dependencies": ["FRAME-001"],
      "parallelWith": ["PANEL-RIGHT", "PANEL-BACK"],
      "reasoning": "Can be mounted in parallel with other panels after frame is complete",
      "estimatedTime": "15 min"
    }
  ],
  "totalSteps": 8,
  "parallelPaths": 3,
  "estimatedSavings": "Reduced from 15 sequential steps to 8 optimized steps (47% faster)",
  "criticalPath": ["FRAME-001", "MOTOR-MOUNT", "MOTOR", "WIRING", "FINAL-ASSEMBLY"]
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
      
      // Validate sequence numbers
      result.items = result.items.map((item: any, idx: number) => ({
        ...item,
        sequence: item.sequence || idx + 1
      }));

      return result;
    } catch (error: any) {
      console.error('❌ Sequencing failed:', error.message);
      
      // Fallback to rule-based sequencing
      return this.fallbackSequencing(items, dependencyGraph);
    }
  }

  /**
   * Build dependency graph based on BOM hierarchy
   */
  private buildDependencyGraph(items: any[]): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    items.forEach(item => {
      // Parts depend on all parts at lower levels
      const dependencies = items
        .filter(dep => dep.level < item.level)
        .map(dep => dep.partNumber);
      
      graph[item.partNumber] = dependencies;
    });
    
    return graph;
  }

  /**
   * Fallback rule-based sequencing
   */
  private fallbackSequencing(items: any[], dependencyGraph: Record<string, string[]>): SequenceResult {
    // Sort by level first (lower levels first)
    const sortedItems = [...items].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      
      // Within same level, prioritize by category
      const priorityOrder: Record<string, number> = {
        'machined': 1,
        'welded': 2,
        'fabrication': 3,
        'subassembly': 4,
        'purchased': 5,
        'fastener': 10
      };
      
      const aPriority = priorityOrder[a.category] || 5;
      const bPriority = priorityOrder[b.category] || 5;
      
      return aPriority - bPriority;
    });

    // Assign sequence numbers
    const sequencedItems = sortedItems.map((item, idx) => ({
      partNumber: item.partNumber,
      sequence: idx + 1,
      dependencies: dependencyGraph[item.partNumber] || [],
      parallelWith: this.findParallelParts(item, sortedItems),
      reasoning: `Level ${item.level} part, sequence ${idx + 1}`,
      estimatedTime: this.estimateTime(item)
    }));

    // Calculate parallel paths
    const levelGroups = this.groupByLevel(sortedItems);
    const parallelPaths = Math.max(...Object.values(levelGroups).map(g => g.length));

    return {
      items: sequencedItems,
      totalSteps: Object.keys(levelGroups).length,
      parallelPaths,
      estimatedSavings: `${parallelPaths} parts can be assembled in parallel`,
      criticalPath: this.findCriticalPath(sequencedItems)
    };
  }

  /**
   * Find parts that can be assembled in parallel
   */
  private findParallelParts(item: any, allItems: any[]): string[] {
    return allItems
      .filter(other => 
        other.partNumber !== item.partNumber &&
        other.level === item.level &&
        other.category !== 'fastener' // Fasteners typically done in sequence
      )
      .map(other => other.partNumber);
  }

  /**
   * Group items by level
   */
  private groupByLevel(items: any[]): Record<number, any[]> {
    const groups: Record<number, any[]> = {};
    
    items.forEach(item => {
      if (!groups[item.level]) {
        groups[item.level] = [];
      }
      groups[item.level].push(item);
    });
    
    return groups;
  }

  /**
   * Estimate assembly time for a part
   */
  private estimateTime(item: any): string {
    // Simple estimation based on category
    const timeMap: Record<string, string> = {
      'machined': '45 min',
      'welded': '60 min',
      'fabrication': '30 min',
      'subassembly': '20 min',
      'purchased': '5 min',
      'fastener': '2 min',
      'tooling': '10 min'
    };
    
    return timeMap[item.category] || '15 min';
  }

  /**
   * Find critical path (longest dependency chain)
   */
  private findCriticalPath(items: any[]): string[] {
    // Find items with no dependencies (starting points)
    const startItems = items.filter(item => item.dependencies.length === 0);
    
    if (startItems.length === 0) return [];
    
    // Simple critical path: follow longest chain
    let longestPath: string[] = [];
    
    startItems.forEach(start => {
      const path = this.tracePath(start.partNumber, items);
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    });
    
    return longestPath;
  }

  /**
   * Trace dependency path from a part
   */
  private tracePath(partNumber: string, items: any[]): string[] {
    const item = items.find(i => i.partNumber === partNumber);
    if (!item) return [];
    
    // Find parts that depend on this part
    const dependents = items.filter(i => i.dependencies.includes(partNumber));
    
    if (dependents.length === 0) {
      return [partNumber];
    }
    
    // Recursively find longest path
    const paths = dependents.map(dep => this.tracePath(dep.partNumber, items));
    const longestDependentPath = paths.reduce((longest, current) => 
      current.length > longest.length ? current : longest, []
    );
    
    return [partNumber, ...longestDependentPath];
  }

  /**
   * Validate sequence (check for circular dependencies)
   */
  validateSequence(result: SequenceResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for circular dependencies
    result.items.forEach(item => {
      item.dependencies.forEach(dep => {
        const depItem = result.items.find(i => i.partNumber === dep);
        if (depItem && depItem.sequence >= item.sequence) {
          errors.push(
            `Circular dependency: ${item.partNumber} depends on ${dep} but has lower sequence number`
          );
        }
      });
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new SequencingService();
