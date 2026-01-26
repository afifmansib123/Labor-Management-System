import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Payment } from '@/lib/models/Payment'
import { authOptions } from '@/lib/auth'
import mongoose from 'mongoose'

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
      return NextResponse.json({ error: 'Only MasterAdmin can approve payments' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    }

    await dbConnect()

    const body = await req.json()
    const { approved } = body

    const payment = await Payment.findById(id)
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status !== 'approved') {
      return NextResponse.json({ error: 'Payment must be in approved status to complete' }, { status: 400 })
    }

    payment.status = approved ? 'completed' : 'pending'
    await payment.save()

    await payment.populate({
      path: 'employeeId',
      select: 'uniqueId name level salary',
      populate: { path: 'level', select: 'levelName baseSalary' },
    })
    await payment.populate('paidBy', 'email')

    return NextResponse.json({
      message: approved ? 'Payment approved and completed' : 'Payment rejected',
      payment,
    })
  } catch (error) {
    console.error('Error approving payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
