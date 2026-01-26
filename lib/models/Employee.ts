import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IEmployee extends Document {
  uniqueId: string
  name: string
  level: mongoose.Types.ObjectId
  salary: number
  photo?: string
  nid: string
  providedBy: 'masteradmin' | mongoose.Types.ObjectId
  approvalStatus: 'pending' | 'approved'
  details?: Record<string, any>
  createdAt: Date
}

const employeeSchema = new Schema<IEmployee>(
  {
    uniqueId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    level: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeeLevel',
      required: true,
    },
    salary: {
      type: Number,
      required: true,
    },
    photo: String,
    nid: {
      type: String,
      required: true,
    },
    providedBy: {
      type: Schema.Types.Mixed,
      required: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved'],
      default: function (this: IEmployee) {
        return this.providedBy === 'masteradmin' ? 'approved' : 'pending'
      },
    },
    details: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

export const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model('Employee', employeeSchema)
