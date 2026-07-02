import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITopUp extends Document {
  userId: Types.ObjectId;
  amount: number;
  balanceAfter: number;
  addedBy: string;
  createdAt: Date;
}

const TopUpSchema = new Schema<ITopUp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, required: true, min: 0 },
    addedBy: { type: String, default: 'Ajith' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const TopUp: Model<ITopUp> =
  mongoose.models.TopUp ?? mongoose.model<ITopUp>('TopUp', TopUpSchema);

export default TopUp;
