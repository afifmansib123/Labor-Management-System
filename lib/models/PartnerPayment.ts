import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPartnerPayment extends Document {
  partnerId: mongoose.Types.ObjectId
  amount: number
  dueDate: Date
  paidDate?: Date
  status: 'pending' | 'approved' | 'completed'
  proofUrl?: string
  createdAt: Date
}

const partnerPaymentSchema = new Schema<IPartnerPayment>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidDate: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'completed'],
      default: 'pending',
    },
    proofUrl: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

export const PartnerPayment: Model<IPartnerPayment> =
  mongoose.models.PartnerPayment ||
  mongoose.model('PartnerPayment', partnerPaymentSchema)
