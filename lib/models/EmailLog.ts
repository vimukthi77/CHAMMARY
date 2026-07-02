import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IEmailLog extends Document {
  userId: Types.ObjectId;
  type: string;
  sentAt: Date;
  status: 'sent' | 'failed';
  error?: string;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    sentAt: { type: Date, required: true },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    error: { type: String },
  },
  { timestamps: false }
);

const EmailLog: Model<IEmailLog> =
  mongoose.models.EmailLog ?? mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);

export default EmailLog;
