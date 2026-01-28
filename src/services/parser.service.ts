import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import { BOMItem } from '../types';

class ParserService {
  async parseExcel(filePath: string): Promise<BOMItem[]> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new Error('Excel file is empty');
      }

      // Map to BOMItem structure with flexible column name matching
      const bomItems: BOMItem[] = data.map((row, index) => {
        // Helper function to find column value with various possible names
        const getColumnValue = (possibleNames: string[]): string | undefined => {
          for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
              return String(row[name]);
            }
          }
          return undefined;
        };

        const partNumber = getColumnValue([
          'Part Number', 'PartNumber', 'Part No', 'PartNo', 
          'Part #', 'Item Number', 'Item No', 'part_number'
        ]) || `PART-${index + 1}`;

        const description = getColumnValue([
          'Description', 'Part Description', 'Item Description',
          'Part Name', 'Name', 'description', 'part_description'
        ]) || 'Unnamed Part';

        const quantityStr = getColumnValue([
          'Quantity', 'Qty', 'QTY', 'Quan', 'Amount', 'quantity', 'qty'
        ]) || '1';

        const levelStr = getColumnValue([
          'Level', 'BOM Level', 'Hierarchy', 'Indent', 'level', 'bom_level'
        ]) || '0';

        const materialSpec = getColumnValue([
          'Material', 'Material Specification', 'Material Spec',
          'Mat Spec', 'material', 'material_spec'
        ]);

        const notes = getColumnValue([
          'Notes', 'Comments', 'Remarks', 'Description 2', 'notes', 'comments'
        ]);

        return {
          id: `ebom-${index + 1}`,
          partNumber: partNumber.trim(),
          description: description.trim(),
          quantity: parseInt(quantityStr) || 1,
          level: parseInt(levelStr) || 0,
          materialSpec: materialSpec?.trim(),
          notes: notes?.trim(),
        };
      });

      return bomItems;
    } catch (error: any) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  async parseCSV(filePath: string): Promise<BOMItem[]> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      const result = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      if (result.errors.length > 0) {
        const criticalErrors = result.errors.filter(e => e.type === 'Quotes' || e.type === 'FieldMismatch');
        if (criticalErrors.length > 0) {
          throw new Error(`CSV parsing errors: ${JSON.stringify(criticalErrors)}`);
        }
      }

      if (!result.data || result.data.length === 0) {
        throw new Error('CSV file is empty');
      }

      const bomItems: BOMItem[] = result.data.map((row: any, index: number) => {
        const getColumnValue = (possibleNames: string[]): string | undefined => {
          for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
              return String(row[name]);
            }
          }
          return undefined;
        };

        const partNumber = getColumnValue([
          'Part Number', 'PartNumber', 'Part No', 'PartNo', 
          'Part #', 'Item Number', 'Item No', 'part_number'
        ]) || `PART-${index + 1}`;

        const description = getColumnValue([
          'Description', 'Part Description', 'Item Description',
          'Part Name', 'Name', 'description', 'part_description'
        ]) || 'Unnamed Part';

        const quantityStr = getColumnValue([
          'Quantity', 'Qty', 'QTY', 'Quan', 'Amount', 'quantity', 'qty'
        ]) || '1';

        const levelStr = getColumnValue([
          'Level', 'BOM Level', 'Hierarchy', 'Indent', 'level', 'bom_level'
        ]) || '0';

        const materialSpec = getColumnValue([
          'Material', 'Material Specification', 'Material Spec',
          'Mat Spec', 'material', 'material_spec'
        ]);

        const notes = getColumnValue([
          'Notes', 'Comments', 'Remarks', 'Description 2', 'notes', 'comments'
        ]);

        return {
          id: `ebom-${index + 1}`,
          partNumber: partNumber.trim(),
          description: description.trim(),
          quantity: parseInt(quantityStr) || 1,
          level: parseInt(levelStr) || 0,
          materialSpec: materialSpec?.trim(),
          notes: notes?.trim(),
        };
      });

      return bomItems;
    } catch (error: any) {
      throw new Error(`Failed to parse CSV file: ${error.message}`);
    }
  }

  async parseFile(filePath: string, fileType: string): Promise<BOMItem[]> {
    const extension = fileType.toLowerCase().replace('.', '');

    if (extension === 'xlsx' || extension === 'xls') {
      return this.parseExcel(filePath);
    } else if (extension === 'csv') {
      return this.parseCSV(filePath);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  validateBOMStructure(items: BOMItem[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (items.length === 0) {
      errors.push('BOM file is empty');
      return { valid: false, errors };
    }

    // Check for required fields
    items.forEach((item, index) => {
      if (!item.partNumber || item.partNumber.trim() === '') {
        errors.push(`Row ${index + 1}: Missing part number`);
      }
      if (!item.description || item.description.trim() === '') {
        errors.push(`Row ${index + 1}: Missing description`);
      }
      if (isNaN(item.quantity) || item.quantity <= 0) {
        errors.push(`Row ${index + 1}: Invalid quantity (${item.quantity})`);
      }
    });

    // Warn if too many errors
    if (errors.length > 10) {
      return {
        valid: false,
        errors: [
          ...errors.slice(0, 10),
          `...and ${errors.length - 10} more errors. Please check your file format.`
        ]
      };
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Build hierarchical structure from flat BOM items based on level
   */
  buildHierarchy(items: BOMItem[]): BOMItem[] {
    const itemMap = new Map<string, BOMItem>();
    const rootItems: BOMItem[] = [];

    // First pass: create map of all items
    items.forEach(item => {
      itemMap.set(item.id!, { ...item, children: [] });
    });

    // Second pass: build hierarchy
    items.forEach((item, index) => {
      const currentItem = itemMap.get(item.id!)!;
      
      if (item.level === 0) {
        rootItems.push(currentItem);
      } else {
        // Find parent (previous item with lower level)
        for (let i = index - 1; i >= 0; i--) {
          const potentialParent = items[i];
          if (potentialParent.level < item.level) {
            const parentItem = itemMap.get(potentialParent.id!);
            if (parentItem) {
              if (!parentItem.children) {
                parentItem.children = [];
              }
              parentItem.children.push(currentItem.id!);
            }
            break;
          }
        }
      }
    });

    return rootItems;
  }
}

export default new ParserService();
