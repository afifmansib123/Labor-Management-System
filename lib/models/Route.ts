import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IRoute extends Document {
  name: string
  pointA: string
  pointB: string
  mapCoordinates: Array<{ lat: number; lng: number }>
  mapImageUrl?: string
  operatingDays: string[]
  operatingHours: {
    start: string
    end: string
  }
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}

const routeSchema = new Schema<IRoute>(
  {
    name: {
      type: String,
      required: true,
    },
    pointA: {
      type: String,
      required: true,
    },
    pointB: {
      type: String,
      required: true,
    },
    mapCoordinates: [
      {
        lat: Number,
        lng: Number,
      },
    ],
    mapImageUrl: String,
    operatingDays: [
      {
        type: String,
        enum: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
      },
    ],
    operatingHours: {
      start: String,
      end: String,
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

export const Route: Model<IRoute> =
  mongoose.models.Route || mongoose.model('Route', routeSchema)
