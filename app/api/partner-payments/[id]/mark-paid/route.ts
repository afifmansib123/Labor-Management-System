import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { PartnerPayment } from '@/lib/models/PartnerPayment'
import { authOptions } from '@/lib/auth'
import mongoose from 'mongoose'
import { z } from 'zod'

const markPaidSchema = z.object({
  proofUrl: z.string().url('Invalid proof URL').optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    }

    await dbConnect()

    const payment = await PartnerPayment.findById(id)
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (session.user.role === 'partner') {
      if (payment.partnerId.toString() !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await req.json()
    const validated = markPaidSchema.parse(body)

    const updateData: Record<string, unknown> = {
      paidDate: new Date(),
    }

    if (session.user.role === 'masteradmin') {
      updateData.status = 'completed'
    } else {
      updateData.status = 'approved'
    }

    if (validated.proofUrl) {
      updateData.proofUrl = validated.proofUrl
    }

    const updatedPayment = await PartnerPayment.findByIdAndUpdate(id, updateData, { new: true })
      .populate('partnerId', 'email')

    return NextResponse.json({
      message: 'Payment marked as paid',
      payment: updatedPayment,
    })
  } catch (error) {
    console.error('Error marking partner payment as paid:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
