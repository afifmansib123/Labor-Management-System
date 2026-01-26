import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IJob extends Document {
  routeId: mongoose.Types.ObjectId
  scheduledDate: Date
  scheduledTime: string
  status: 'pending' | 'completed'
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}

const jobSchema = new Schema<IJob>(
  {
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

export const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model('Job', jobSchema)
