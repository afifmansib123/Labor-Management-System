import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Payment } from '@/lib/models/Payment'
import { Employee } from '@/lib/models/Employee'
import { Partner } from '@/lib/models/Partner'
import { authOptions } from '@/lib/auth'
import { createPaymentSchema } from '@/lib/utils/validation'
import mongoose from 'mongoose'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const partnerId = searchParams.get('partnerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const query: Record<string, unknown> = {}

    if (session.user.role === 'partner') {
      const partnerDoc = await Partner.findOne({ userId: session.user.id })
      if (!partnerDoc) {
        return NextResponse.json({ error: 'Partner profile not found' }, { status: 404 })
      }
      const partnerEmployees = await Employee.find({ providedBy: partnerDoc._id }).select('_id')
      const employeeIds = partnerEmployees.map((e) => e._id)
      query.employeeId = { $in: employeeIds }
    }

    if (session.user.role === 'staff') {
      const masteradminEmployees = await Employee.find({ providedBy: 'masteradmin' }).select('_id')
      const employeeIds = masteradminEmployees.map((e) => e._id)
      query.employeeId = { $in: employeeIds }
    }

    if (status && ['pending', 'approved', 'completed'].includes(status)) {
      query.status = status
    }

    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query.employeeId = new mongoose.Types.ObjectId(employeeId)
    }

    if (partnerId && mongoose.Types.ObjectId.isValid(partnerId)) {
      const partnerEmployees = await Employee.find({ providedBy: partnerId }).select('_id')
      const employeeIds = partnerEmployees.map((e) => e._id)
      query.employeeId = { $in: employeeIds }
    }

    if (startDate || endDate) {
      query.dueDate = {}
      if (startDate) (query.dueDate as Record<string, Date>).$gte = new Date(startDate)
      if (endDate) (query.dueDate as Record<string, Date>).$lte = new Date(endDate)
    }

    if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      const startOfMonth = new Date(yearNum, monthNum - 1, 1)
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59)
      query.dueDate = { $gte: startOfMonth, $lte: endOfMonth }
    }

    const total = await Payment.countDocuments(query)
    const payments = await Payment.find(query)
      .populate({
        path: 'employeeId',
        select: 'uniqueId name level salary photo providedBy',
        populate: [
          { path: 'level', select: 'levelName baseSalary' },
          { path: 'providedBy', select: 'companyName', model: 'Partner', strictPopulate: false },
        ],
      })
      .populate('paidBy', 'email')
      .sort({ dueDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const paymentsByDate = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$dueDate' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ])

    return NextResponse.json({
      payments,
      paymentsByDate,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
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
      return NextResponse.json({ error: 'Only MasterAdmin can create payments' }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = createPaymentSchema.parse({
      ...body,
      dueDate: new Date(body.dueDate),
    })

    const employee = await Employee.findById(validated.employeeId)
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (employee.approvalStatus !== 'approved') {
      return NextResponse.json({ error: 'Employee must be approved first' }, { status: 400 })
    }

    const payment = new Payment({
      employeeId: validated.employeeId,
      amount: validated.amount,
      dueDate: validated.dueDate,
      notes: validated.notes,
    })

    await payment.save()
    await payment.populate({
      path: 'employeeId',
      select: 'uniqueId name level salary',
      populate: { path: 'level', select: 'levelName baseSalary' },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
