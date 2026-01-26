import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IEmployeeLevel extends Document {
  levelName: string
  baseSalary: number
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}

const employeeLevelSchema = new Schema<IEmployeeLevel>(
  {
    levelName: {
      type: String,
      required: true,
    },
    baseSalary: {
      type: Number,
      required: true,
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

export const EmployeeLevel: Model<IEmployeeLevel> =
  mongoose.models.EmployeeLevel ||
  mongoose.model('EmployeeLevel', employeeLevelSchema)
