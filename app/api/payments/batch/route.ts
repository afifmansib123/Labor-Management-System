import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Payment } from '@/lib/models/Payment'
import { Employee } from '@/lib/models/Employee'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const batchPaymentSchema = z.object({
  employeeIds: z.array(z.string()).min(1, 'At least one employee is required'),
  dueDate: z.string(),
  notes: z.string().optional(),
})

const batchMarkPaidSchema = z.object({
  paymentIds: z.array(z.string()).min(1, 'At least one payment is required'),
  proofUrl: z.string().url('Invalid proof URL').optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'masteradmin') {
      return NextResponse.json({ error: 'Only MasterAdmin can create batch payments' }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = batchPaymentSchema.parse(body)

    const employees = await Employee.find({
      _id: { $in: validated.employeeIds },
      approvalStatus: 'approved',
    })

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No approved employees found' }, { status: 400 })
    }

    const paymentDocs = employees.map((emp) => ({
      employeeId: emp._id,
      amount: emp.salary,
      dueDate: new Date(validated.dueDate),
      notes: validated.notes,
    }))

    const createdPayments = await Payment.insertMany(paymentDocs)

    return NextResponse.json(
      {
        message: `Successfully created ${createdPayments.length} payment records`,
        payments: createdPayments,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error batch creating payments:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = batchMarkPaidSchema.parse(body)

    const updateData: Record<string, unknown> = {
      paidDate: new Date(),
      paidBy: session.user.id,
    }

    if (session.user.role === 'masteradmin') {
      updateData.status = 'completed'
    } else {
      updateData.status = 'approved'
    }

    if (validated.proofUrl) {
      updateData.proofUrl = validated.proofUrl
    }

    const result = await Payment.updateMany(
      { _id: { $in: validated.paymentIds } },
      updateData
    )

    return NextResponse.json({
      message: `Successfully marked ${result.modifiedCount} payments as paid`,
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error('Error batch marking payments as paid:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
