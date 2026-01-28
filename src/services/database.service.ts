import mongoose from 'mongoose';
import { Upload, Conversion, Feedback, IUpload, IConversion, IFeedback } from '../models/schemas';

class DatabaseService {
  // ==========================================
  // UPLOAD OPERATIONS
  // ==========================================
  
  async createUpload(data: Partial<IUpload>): Promise<IUpload> {
    try {
      const upload = new Upload(data);
      await upload.save();
      return upload;
    } catch (error: any) {
      throw new Error(`Failed to create upload: ${error.message}`);
    }
  }

  async getUploadById(uploadId: string): Promise<IUpload | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(uploadId)) {
        throw new Error('Invalid upload ID');
      }
      return await Upload.findById(uploadId);
    } catch (error: any) {
      throw new Error(`Failed to get upload: ${error.message}`);
    }
  }

  // Alias for backward compatibility
  async getUpload(uploadId: string): Promise<IUpload | null> {
    return this.getUploadById(uploadId);
  }

  // ==========================================
  // CONVERSION OPERATIONS
  // ==========================================

  async createConversion(data: Partial<IConversion>): Promise<IConversion> {
    try {
      const conversion = new Conversion(data);
      await conversion.save();
      return conversion;
    } catch (error: any) {
      throw new Error(`Failed to create conversion: ${error.message}`);
    }
  }

  async getConversionById(conversionId: string): Promise<IConversion | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversionId)) {
        throw new Error('Invalid conversion ID');
      }
      return await Conversion.findById(conversionId).populate('uploadId');
    } catch (error: any) {
      throw new Error(`Failed to get conversion: ${error.message}`);
    }
  }

  // Alias for backward compatibility
  async getConversion(conversionId: string): Promise<IConversion | null> {
    return this.getConversionById(conversionId);
  }

  async updateConversion(conversionId: string, data: Partial<IConversion>): Promise<IConversion | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversionId)) {
        throw new Error('Invalid conversion ID');
      }
      return await Conversion.findByIdAndUpdate(
        conversionId,
        data,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Failed to update conversion: ${error.message}`);
    }
  }

  async updateConversionStatus(
    conversionId: string,
    status: 'processing' | 'completed' | 'failed',
    progress: number,
    currentStage?: string
  ): Promise<IConversion | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversionId)) {
        throw new Error('Invalid conversion ID');
      }
      
      const updateData: any = {
        status,
        progress,
        currentStage,
        ...(status === 'completed' ? { completedAt: new Date() } : {})
      };

      return await Conversion.findByIdAndUpdate(
        conversionId,
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Failed to update conversion status: ${error.message}`);
    }
  }

  async saveConversionResult(
    conversionId: string,
    mbomData: any,
    explanationData: any,
    confidenceScore: number,
    mbomPartCount: number,
    timeTaken: number
  ): Promise<IConversion | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversionId)) {
        throw new Error('Invalid conversion ID');
      }

      return await Conversion.findByIdAndUpdate(
        conversionId,
        {
          status: 'completed',
          progress: 100,
          currentStage: 'validation',
          mbomData,
          explanationData,
          confidenceScore,
          mbomPartCount,
          timeTaken,
          completedAt: new Date()
        },
        { new: true }
      );
    } catch (error: any) {
      throw new Error(`Failed to save conversion result: ${error.message}`);
    }
  }

  async saveConversionError(conversionId: string, errorMessage: string): Promise<IConversion | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversionId)) {
        throw new Error('Invalid conversion ID');
      }

      return await Conversion.findByIdAndUpdate(
        conversionId,
        {
          status: 'failed',
          errorMessage,
          completedAt: new Date()
        },
        { new: true }
      );
    } catch (error: any) {
      throw new Error(`Failed to save conversion error: ${error.message}`);
    }
  }

  async getConversionHistory(
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc',
    search?: string
  ): Promise<{ conversions: IConversion[]; pagination: any }> {
    try {
      const skip = (page - 1) * limit;
      const sortOrder = order === 'asc' ? 1 : -1;

      // Build query
      const query: any = {};
      if (search) {
        // Populate upload to search by filename
        const uploads = await Upload.find({
          originalName: { $regex: search, $options: 'i' }
        }).select('_id');
        
        if (uploads.length > 0) {
          query.uploadId = { $in: uploads.map(u => u._id) };
        }
      }

      // Get total count
      const totalCount = await Conversion.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

      // Get data
      const conversions = await Conversion.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('uploadId')
        .lean();

      return {
        conversions: conversions as any as IConversion[],
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to get conversion history: ${error.message}`);
    }
  }

  async deleteConversion(conversionId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversionId)) {
        throw new Error('Invalid conversion ID');
      }

      // Delete related feedbacks first
      await Feedback.deleteMany({ conversionId: new mongoose.Types.ObjectId(conversionId) });

      // Delete conversion
      const result = await Conversion.findByIdAndDelete(conversionId);
      return result !== null;
    } catch (error: any) {
      throw new Error(`Failed to delete conversion: ${error.message}`);
    }
  }

  async updateMBOMData(
    conversionId: string,
    mbomData: any
  ): Promise<IConversion | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversionId)) {
        throw new Error('Invalid conversion ID');
      }

      return await Conversion.findByIdAndUpdate(
        conversionId,
        { mbomData },
        { new: true }
      );
    } catch (error: any) {
      throw new Error(`Failed to update mBOM data: ${error.message}`);
    }
  }

  // ==========================================
  // FEEDBACK OPERATIONS
  // ==========================================

  async createFeedback(data: Partial<IFeedback>): Promise<IFeedback> {
    try {
      const feedback = new Feedback(data);
      await feedback.save();
      return feedback;
    } catch (error: any) {
      throw new Error(`Failed to create feedback: ${error.message}`);
    }
  }

  async getFeedbackByConversionId(conversionId: string): Promise<IFeedback[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversionId)) {
        throw new Error('Invalid conversion ID');
      }

      return await Feedback.find({ 
        conversionId: new mongoose.Types.ObjectId(conversionId) 
      }).sort({ submittedAt: -1 });
    } catch (error: any) {
      throw new Error(`Failed to get feedback: ${error.message}`);
    }
  }

  // Deprecated - MongoDB connection handled by Database singleton
  async disconnect(): Promise<void> {
    console.log('⚠️  DatabaseService.disconnect() is deprecated. Use Database.disconnect() instead.');
  }
}

export default new DatabaseService();
