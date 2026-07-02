import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMealRequest extends Document {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD UTC
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  totalAmount: number;
  balanceAfter: number;
  createdAt: Date;
}

const MealRequestSchema = new Schema<IMealRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // e.g. "2024-07-02"
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false },
    totalAmount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Enforce one request per user per day
MealRequestSchema.index({ userId: 1, date: 1 }, { unique: true });

const MealRequest: Model<IMealRequest> =
  mongoose.models.MealRequest ??
  mongoose.model<IMealRequest>('MealRequest', MealRequestSchema);

export default MealRequest;
