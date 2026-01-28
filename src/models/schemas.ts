import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// UPLOAD SCHEMA
// ==========================================
export interface IUpload extends Document {
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
}

const UploadSchema = new Schema<IUpload>({
  fileName: {
    type: String,
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'uploads'
});

export const Upload: Model<IUpload> = mongoose.model<IUpload>('Upload', UploadSchema);

// ==========================================
// CONVERSION SCHEMA
// ==========================================
export interface IBOMItem {
  id?: string;
  partNumber: string;
  description: string;
  quantity: number;
  level: number;
  materialSpec?: string;
  notes?: string;
  workCenter?: string;
  tooling?: string[];
  processSteps?: string[];
  changeType?: 'added' | 'modified' | 'unchanged' | 'grouped';
  confidence?: number;
  reasoning?: string;
  children?: string[];
}

export interface IConversion extends Document {
  uploadId: mongoose.Types.ObjectId;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  currentStage?: 'parsing' | 'analysis' | 'generation' | 'validation';
  ebomData: {
    items: IBOMItem[];
    totalParts: number;
  };
  mbomData?: {
    items: IBOMItem[];
    totalParts: number;
    addedItems: number;
    modifiedItems: number;
    groupedItems: number;
  };
  explanationData?: {
    overallAssessment: string;
    overallConfidence: number;
    itemExplanations: any[];
    changes: {
      added: any[];
      modified: any[];
      grouped: any[];
    };
  };
  confidenceScore?: number;
  ebomPartCount: number;
  mbomPartCount?: number;
  timeTaken?: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

const ConversionSchema = new Schema<IConversion>({
  uploadId: {
    type: Schema.Types.ObjectId,
    ref: 'Upload',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    required: true,
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentStage: {
    type: String,
    enum: ['parsing', 'analysis', 'generation', 'validation'],
    required: false
  },
  ebomData: {
    items: [{
      id: String,
      partNumber: String,
      description: String,
      quantity: Number,
      level: Number,
      materialSpec: String,
      notes: String,
      children: [String]
    }],
    totalParts: Number
  },
  mbomData: {
    items: [{
      id: String,
      partNumber: String,
      description: String,
      quantity: Number,
      level: Number,
      materialSpec: String,
      notes: String,
      workCenter: String,
      tooling: [String],
      processSteps: [String],
      changeType: {
        type: String,
        enum: ['added', 'modified', 'unchanged', 'grouped']
      },
      confidence: Number,
      reasoning: String,
      children: [String]
    }],
    totalParts: Number,
    addedItems: Number,
    modifiedItems: Number,
    groupedItems: Number
  },
  explanationData: {
    overallAssessment: String,
    overallConfidence: Number,
    itemExplanations: [Schema.Types.Mixed],
    changes: {
      added: [Schema.Types.Mixed],
      modified: [Schema.Types.Mixed],
      grouped: [Schema.Types.Mixed]
    }
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1
  },
  ebomPartCount: {
    type: Number,
    required: true
  },
  mbomPartCount: Number,
  timeTaken: Number,
  errorMessage: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: Date
}, {
  timestamps: true,
  collection: 'conversions'
});

// Indexes for performance
ConversionSchema.index({ uploadId: 1, createdAt: -1 });
ConversionSchema.index({ status: 1, createdAt: -1 });

export const Conversion: Model<IConversion> = mongoose.model<IConversion>('Conversion', ConversionSchema);

// ==========================================
// FEEDBACK SCHEMA
// ==========================================
export interface IFeedback extends Document {
  conversionId: mongoose.Types.ObjectId;
  corrections: {
    itemId: string;
    originalValue: any;
    correctedValue: any;
    field: string;
    reasoning: string;
  }[];
  shouldLearn: boolean;
  processed: boolean;
  submittedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>({
  conversionId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversion',
    required: true,
    index: true
  },
  corrections: [{
    itemId: {
      type: String,
      required: true
    },
    originalValue: Schema.Types.Mixed,
    correctedValue: Schema.Types.Mixed,
    field: {
      type: String,
      required: true
    },
    reasoning: String
  }],
  shouldLearn: {
    type: Boolean,
    default: true
  },
  processed: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'feedbacks'
});

export const Feedback: Model<IFeedback> = mongoose.model<IFeedback>('Feedback', FeedbackSchema);
