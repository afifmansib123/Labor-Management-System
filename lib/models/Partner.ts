import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPartner extends Document {
  userId: mongoose.Types.ObjectId
  companyName: string
  companyDetails: string
  contactPerson?: string
  contactPhone?: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}

const partnerSchema = new Schema<IPartner>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    companyDetails: {
      type: String,
      required: true,
    },
    contactPerson: String,
    contactPhone: String,
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

export const Partner: Model<IPartner> =
  mongoose.models.Partner || mongoose.model('Partner', partnerSchema)
