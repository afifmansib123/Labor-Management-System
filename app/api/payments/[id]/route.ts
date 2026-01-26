import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Payment } from '@/lib/models/Payment'
import { authOptions } from '@/lib/auth'
import mongoose from 'mongoose'
import { z } from 'zod'

const updatePaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(
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

    const payment = await Payment.findById(id)
      .populate({
        path: 'employeeId',
        select: 'uniqueId name level salary photo providedBy',
        populate: [
          { path: 'level', select: 'levelName baseSalary' },
          { path: 'providedBy', select: 'companyName', model: 'Partner', strictPopulate: false },
        ],
      })
      .populate('paidBy', 'email')

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'masteradmin') {
      return NextResponse.json({ error: 'Only MasterAdmin can update payments' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = updatePaymentSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.amount) updateData.amount = validated.amount
    if (validated.dueDate) updateData.dueDate = new Date(validated.dueDate)
    if (validated.notes !== undefined) updateData.notes = validated.notes

    const payment = await Payment.findByIdAndUpdate(id, updateData, { new: true })
      .populate({
        path: 'employeeId',
        select: 'uniqueId name level salary',
        populate: { path: 'level', select: 'levelName baseSalary' },
      })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Error updating payment:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'masteradmin') {
      return NextResponse.json({ error: 'Only MasterAdmin can delete payments' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    }

    await dbConnect()

    const payment = await Payment.findByIdAndDelete(id)
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Payment deleted successfully' })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
