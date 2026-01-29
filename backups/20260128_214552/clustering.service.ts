import axios from 'axios';

interface ClusterResult {
  clusters: Array<{
    clusterId: string;
    groupName: string;
    partNumbers: string[];
    newPartNumber: string;
    quantity: number;
    reasoning: string;
    savings: string;
    category: string;
  }>;
  totalReduction: number;
  efficiency: string;
  originalCount: number;
  newCount: number;
}

class ClusteringService {
  private ollamaUrl: string;
  private model: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  }

  /**
   * Group similar parts into clusters/kits
   * This is Model 4: Clustering Algorithm
   */
  async groupParts(items: any[]): Promise<ClusterResult> {
    // Pre-filter candidates for grouping
    const fasteners = items.filter(item => 
      item.category === 'fastener' || /(bolt|screw|nut|washer)/i.test(item.description)
    );
    
    const consumables = items.filter(item =>
      item.category === 'consumable' || /(adhesive|lubricant|tape)/i.test(item.description)
    );

    if (fasteners.length < 3 && consumables.length < 3) {
      return {
        clusters: [],
        totalReduction: 0,
        efficiency: 'No grouping opportunities found (fewer than 3 similar items)',
        originalCount: items.length,
        newCount: items.length
      };
    }

    const prompt = `You are an expert in manufacturing kitting and parts grouping. Analyze these parts and intelligently group them into kits.

Fasteners Available:
${fasteners.map(f => `- ${f.partNumber}: ${f.description}, Qty: ${f.quantity}`).join('\n')}

Consumables Available:
${consumables.map(c => `- ${c.partNumber}: ${c.description}, Qty: ${c.quantity}`).join('\n')}

Grouping Strategy:
1. Group fasteners by size (M6, M8, M10, etc.)
2. Group fasteners by type (bolts, screws, nuts, washers)
3. Combine frequently used together items
4. Create kits that make assembly easier
5. Consider quantity - don't group single items

Examples of Good Kits:
- "M6 Fastener Kit" - All M6 bolts, nuts, washers together
- "Hydraulic Assembly Kit" - All hydraulic fittings and seals
- "Adhesive & Sealant Kit" - Related bonding materials

Provide:
1. Cluster ID and name
2. Which part numbers are grouped
3. New kit part number
4. Total quantity in kit
5. Reasoning for grouping
6. Expected assembly time savings

Respond ONLY with valid JSON:
{
  "clusters": [
    {
      "clusterId": "cluster-1",
      "groupName": "M6 Bolt Kit",
      "partNumbers": ["BOLT-M6-001", "BOLT-M6-002", "BOLT-M6-003"],
      "newPartNumber": "KIT-M6-BOLT",
      "quantity": 48,
      "reasoning": "All M6 bolts grouped for efficient kitting and distribution",
      "savings": "Reduced 48 individual picks to 1 kit pick (98% reduction)",
      "category": "fastener"
    },
    {
      "clusterId": "cluster-2",
      "groupName": "M6 Hardware Kit",
      "partNumbers": ["NUT-M6-001", "WASHER-M6-001"],
      "newPartNumber": "KIT-M6-HARDWARE",
      "quantity": 48,
      "reasoning": "M6 nuts and washers used together with M6 bolts",
      "savings": "Reduced 96 items to 1 kit",
      "category": "fastener"
    }
  ],
  "totalReduction": 143,
  "efficiency": "Reduced 144 line items to 2 kits (99% reduction in picking operations)",
  "originalCount": 144,
  "newCount": 2
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
            temperature: 0.3, // Slightly higher for creative grouping
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
      
      // Validate clusters
      if (!result.clusters || result.clusters.length === 0) {
        return this.fallbackClustering(fasteners, consumables, items.length);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Clustering failed:', error.message);
      
      // Fallback to rule-based clustering
      return this.fallbackClustering(fasteners, consumables, items.length);
    }
  }

  /**
   * Fallback rule-based clustering
   */
  private fallbackClustering(
    fasteners: any[], 
    consumables: any[], 
    totalItems: number
  ): ClusterResult {
    const clusters: ClusterResult['clusters'] = [];
    
    // Group fasteners by size
    const fastenerGroups = this.groupBySize(fasteners);
    
    Object.entries(fastenerGroups).forEach(([size, parts], idx) => {
      if (parts.length >= 2) {
        const totalQty = parts.reduce((sum, p) => sum + p.quantity, 0);
        
        clusters.push({
          clusterId: `cluster-fastener-${idx + 1}`,
          groupName: `${size} Fastener Kit`,
          partNumbers: parts.map(p => p.partNumber),
          newPartNumber: `KIT-${size}-FASTENER`,
          quantity: totalQty,
          reasoning: `Grouped ${parts.length} ${size} fasteners for efficient kitting`,
          savings: `${parts.length} items → 1 kit`,
          category: 'fastener'
        });
      }
    });

    // Group consumables by type
    const consumableTypes = this.groupByType(consumables);
    
    Object.entries(consumableTypes).forEach(([type, parts], idx) => {
      if (parts.length >= 2) {
        const totalQty = parts.reduce((sum, p) => sum + p.quantity, 0);
        
        clusters.push({
          clusterId: `cluster-consumable-${idx + 1}`,
          groupName: `${type} Kit`,
          partNumbers: parts.map(p => p.partNumber),
          newPartNumber: `KIT-${type.toUpperCase()}`,
          quantity: totalQty,
          reasoning: `Grouped ${parts.length} ${type} items for efficient dispensing`,
          savings: `${parts.length} items → 1 kit`,
          category: 'consumable'
        });
      }
    });

    const totalReduction = clusters.reduce((sum, c) => sum + c.partNumbers.length - 1, 0);
    const newCount = totalItems - totalReduction;

    return {
      clusters,
      totalReduction,
      efficiency: clusters.length > 0 
        ? `Reduced ${totalReduction} items through ${clusters.length} kits (${Math.round(totalReduction / totalItems * 100)}% reduction)`
        : 'No clustering performed',
      originalCount: totalItems,
      newCount
    };
  }

  /**
   * Group fasteners by size (M6, M8, M10, etc.)
   */
  private groupBySize(fasteners: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    fasteners.forEach(item => {
      const sizeMatch = item.description.match(/M\d+|#\d+|\d+mm/i);
      const size = sizeMatch ? sizeMatch[0] : 'MISC';
      
      if (!groups[size]) {
        groups[size] = [];
      }
      groups[size].push(item);
    });
    
    return groups;
  }

  /**
   * Group consumables by type
   */
  private groupByType(consumables: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    consumables.forEach(item => {
      const desc = item.description.toLowerCase();
      
      let type = 'MISC';
      if (/adhesive|glue|bond/i.test(desc)) type = 'Adhesive';
      else if (/lubricant|grease|oil/i.test(desc)) type = 'Lubricant';
      else if (/tape|wrap/i.test(desc)) type = 'Tape';
      else if (/packaging|box|carton/i.test(desc)) type = 'Packaging';
      
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
    });
    
    return groups;
  }

  /**
   * Apply clustering to BOM items
   */
  applyClustering(items: any[], clusterResult: ClusterResult): any[] {
    if (clusterResult.clusters.length === 0) {
      return items;
    }

    // Remove items that were clustered
    const clusteredPartNumbers = new Set(
      clusterResult.clusters.flatMap(c => c.partNumbers)
    );

    const unclustered = items.filter(
      item => !clusteredPartNumbers.has(item.partNumber)
    );

    // Add cluster items as new parts
    const clusterItems = clusterResult.clusters.map(cluster => ({
      partNumber: cluster.newPartNumber,
      description: cluster.groupName,
      quantity: cluster.quantity,
      level: 1, // Kits are typically assembled at level 1
      workCenter: 'WC-04-ASSEMBLY',
      category: cluster.category,
      changeType: 'grouped' as const,
      confidence: 0.95,
      reasoning: cluster.reasoning,
      originalParts: cluster.partNumbers,
      savings: cluster.savings
    }));

    return [...unclustered, ...clusterItems];
  }

  /**
   * Calculate clustering metrics
   */
  getClusteringMetrics(clusterResult: ClusterResult): {
    reductionPercentage: number;
    itemsSaved: number;
    clustersCreated: number;
    efficiencyGain: string;
  } {
    const reductionPercentage = clusterResult.totalReduction / clusterResult.originalCount * 100;
    
    return {
      reductionPercentage: Math.round(reductionPercentage),
      itemsSaved: clusterResult.totalReduction,
      clustersCreated: clusterResult.clusters.length,
      efficiencyGain: clusterResult.efficiency
    };
  }
}

export default new ClusteringService();
