import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPasskey {
  credentialID: string;
  publicKey: string; // Base64url representation
  counter: number;
  transports?: string[];
}

export interface IUser extends Document {
  fullName: string;
  employeeId: string;
  workEmail: string;
  passwordHash: string;
  walletBalance: number;
  isActive: boolean;
  role: 'admin' | 'staff';
  createdAt: Date;
  passkeys: IPasskey[];
  currentChallenge?: string;
  resetOtp?: string;
  resetOtpExpiry?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, trim: true },
    workEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    walletBalance: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    passkeys: {
      type: [
        {
          credentialID: { type: String, required: true },
          publicKey: { type: String, required: true },
          counter: { type: Number, required: true },
          transports: [String],
        },
      ],
      default: [],
    },
    currentChallenge: { type: String },
    resetOtp: { type: String },
    resetOtpExpiry: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);

export default User;
