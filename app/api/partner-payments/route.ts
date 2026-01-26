import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { PartnerPayment } from '@/lib/models/PartnerPayment'
import { Partner } from '@/lib/models/Partner'
import { authOptions } from '@/lib/auth'
import mongoose from 'mongoose'
import { z } from 'zod'

const createPartnerPaymentSchema = z.object({
  partnerId: z.string().min(1, 'Partner is required'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const query: Record<string, unknown> = {}

    if (session.user.role === 'partner') {
      query.partnerId = session.user.id
    }

    if (status && ['pending', 'approved', 'completed'].includes(status)) {
      query.status = status
    }

    const total = await PartnerPayment.countDocuments(query)
    const payments = await PartnerPayment.find(query)
      .populate({
        path: 'partnerId',
        select: 'email',
      })
      .sort({ dueDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const paymentsWithPartnerInfo = await Promise.all(
      payments.map(async (payment) => {
        const partner = await Partner.findOne({ userId: payment.partnerId })
        return {
          ...payment.toObject(),
          partnerInfo: partner
            ? {
                companyName: partner.companyName,
                contactPerson: partner.contactPerson,
                contactPhone: partner.contactPhone,
              }
            : null,
        }
      })
    )

    return NextResponse.json({
      payments: paymentsWithPartnerInfo,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching partner payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'masteradmin') {
      return NextResponse.json({ error: 'Only MasterAdmin can create partner payments' }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = createPartnerPaymentSchema.parse(body)

    if (!mongoose.Types.ObjectId.isValid(validated.partnerId)) {
      return NextResponse.json({ error: 'Invalid partner ID' }, { status: 400 })
    }

    const partner = await Partner.findOne({ userId: validated.partnerId })
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const payment = new PartnerPayment({
      partnerId: validated.partnerId,
      amount: validated.amount,
      dueDate: new Date(validated.dueDate),
    })

    await payment.save()

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating partner payment:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
