import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPayment extends Document {
  employeeId: mongoose.Types.ObjectId
  amount: number
  dueDate: Date
  paidDate?: Date
  status: 'pending' | 'approved' | 'completed'
  paidBy?: mongoose.Types.ObjectId
  proofUrl?: string
  notes?: string
  createdAt: Date
}

const paymentSchema = new Schema<IPayment>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
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
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    proofUrl: String,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
