import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMealPrice extends Document {
  breakfastPrice: number;
  lunchPrice: number;
  dinnerPrice: number;
  breakfastCutoff: string;
  lunchCutoff: string;
  dinnerCutoff: string;
  updatedAt: Date;
}

const MealPriceSchema = new Schema<IMealPrice>(
  {
    breakfastPrice: { type: Number, required: true, min: 0 },
    lunchPrice: { type: Number, required: true, min: 0 },
    dinnerPrice: { type: Number, required: true, min: 0 },
    breakfastCutoff: { type: String, default: '07:00' },
    lunchCutoff: { type: String, default: '10:30' },
    dinnerCutoff: { type: String, default: '18:00' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

const MealPrice: Model<IMealPrice> =
  mongoose.models.MealPrice ?? mongoose.model<IMealPrice>('MealPrice', MealPriceSchema);

export default MealPrice;
