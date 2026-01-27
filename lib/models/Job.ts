import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IJob extends Document {
  routeId: mongoose.Types.ObjectId
  assignedEmployees: mongoose.Types.ObjectId[]
  status: 'active' | 'inactive'
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
    assignedEmployees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
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
