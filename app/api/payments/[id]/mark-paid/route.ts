import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Payment } from '@/lib/models/Payment'
import { Employee } from '@/lib/models/Employee'
import { Partner } from '@/lib/models/Partner'
import { authOptions } from '@/lib/auth'
import mongoose from 'mongoose'
import { z } from 'zod'

const markPaidSchema = z.object({
  proofUrl: z.string().url('Invalid proof URL').optional(),
  notes: z.string().optional(),
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

    const payment = await Payment.findById(id).populate('employeeId')
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (session.user.role === 'partner') {
      const partnerDoc = await Partner.findOne({ userId: session.user.id })
      if (!partnerDoc) {
        return NextResponse.json({ error: 'Partner profile not found' }, { status: 404 })
      }

      const employee = await Employee.findById(payment.employeeId)
      if (!employee || employee.providedBy.toString() !== partnerDoc._id.toString()) {
        return NextResponse.json({ error: 'Forbidden: Not your employee' }, { status: 403 })
      }
    }

    if (session.user.role === 'staff') {
      const employee = await Employee.findById(payment.employeeId)
      if (!employee || employee.providedBy !== 'masteradmin') {
        return NextResponse.json({ error: 'Staff can only pay masteradmin employees' }, { status: 403 })
      }
    }

    const body = await req.json()
    const validated = markPaidSchema.parse(body)

    const updateData: Record<string, unknown> = {
      paidDate: new Date(),
      paidBy: session.user.id,
    }

    if (session.user.role === 'masteradmin') {
      updateData.status = 'completed'
    } else {
      updateData.status = 'approved'
    }

    if (validated.proofUrl) updateData.proofUrl = validated.proofUrl
    if (validated.notes) updateData.notes = validated.notes

    const updatedPayment = await Payment.findByIdAndUpdate(id, updateData, { new: true })
      .populate({
        path: 'employeeId',
        select: 'uniqueId name level salary',
        populate: { path: 'level', select: 'levelName baseSalary' },
      })
      .populate('paidBy', 'email')

    return NextResponse.json({
      message: 'Payment marked as paid',
      payment: updatedPayment,
    })
  } catch (error) {
    console.error('Error marking payment as paid:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
