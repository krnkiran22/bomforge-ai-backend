export interface BOMItem {
  id?: string;
  partNumber: string;
  description: string;
  quantity: number;
  level: number;
  materialSpec?: string;
  notes?: string;
  children?: string[];
}

export interface MBOMItem extends BOMItem {
  workCenter?: string;
  tooling?: string[];
  processSteps?: string[];
  changeType: 'added' | 'modified' | 'unchanged' | 'grouped';
  confidence: number;
  reasoning: string;
  alternatives?: {
    description: string;
    confidence: number;
  }[];
}

export interface ConversionResult {
  mbomItems: MBOMItem[];
  overallAssessment: string;
  overallConfidence: number;
  changes: {
    added: {
      partNumber: string;
      description: string;
      type: 'tooling' | 'consumable' | 'fixture';
      reasoning: string;
    }[];
    modified: {
      partNumber: string;
      originalDescription: string;
      newDescription: string;
      reasoning: string;
    }[];
    grouped: {
      groupName: string;
      partNumbers: string[];
      newPartNumber: string;
      reasoning: string;
    }[];
  };
}

export interface UploadedFile {
  uploadId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
}

export interface ConversionStatus {
  conversionId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  currentStage?: 'parsing' | 'analysis' | 'generation' | 'validation' | 'complete';
  stages: {
    parsing: 'pending' | 'in_progress' | 'completed' | 'failed';
    analysis: 'pending' | 'in_progress' | 'completed' | 'failed';
    generation: 'pending' | 'in_progress' | 'completed' | 'failed';
    validation: 'pending' | 'in_progress' | 'completed' | 'failed';
  };
  estimatedTimeRemaining?: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
