import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Employee } from '@/lib/models/Employee'
import { Partner } from '@/lib/models/Partner'
import { authOptions } from '@/lib/auth'
import { createEmployeeSchema } from '@/lib/utils/validation'
import mongoose from 'mongoose'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(req.url)
    const level = searchParams.get('level')
    const partner = searchParams.get('partner')
    const status = searchParams.get('status')
    const minSalary = searchParams.get('minSalary')
    const maxSalary = searchParams.get('maxSalary')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const query: Record<string, unknown> = {}

    if (session.user.role === 'partner') {
      const partnerDoc = await Partner.findOne({ userId: session.user.id })
      if (!partnerDoc) {
        return NextResponse.json({ error: 'Partner profile not found' }, { status: 404 })
      }
      query.providedBy = partnerDoc._id
    } else if (session.user.role === 'staff') {
      query.providedBy = 'masteradmin'
    }

    if (level && mongoose.Types.ObjectId.isValid(level)) {
      query.level = new mongoose.Types.ObjectId(level)
    }

    if (partner) {
      if (partner === 'masteradmin') {
        query.providedBy = 'masteradmin'
      } else if (mongoose.Types.ObjectId.isValid(partner)) {
        query.providedBy = new mongoose.Types.ObjectId(partner)
      }
    }

    if (status && ['pending', 'approved'].includes(status)) {
      query.approvalStatus = status
    }

    if (minSalary || maxSalary) {
      query.salary = {}
      if (minSalary) (query.salary as Record<string, number>).$gte = parseFloat(minSalary)
      if (maxSalary) (query.salary as Record<string, number>).$lte = parseFloat(maxSalary)
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { uniqueId: { $regex: search, $options: 'i' } },
        { nid: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await Employee.countDocuments(query)
    const employees = await Employee.find(query)
      .populate('level', 'levelName baseSalary')
      .populate({
        path: 'providedBy',
        select: 'companyName',
        model: 'Partner',
        strictPopulate: false,
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    return NextResponse.json({
      employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = createEmployeeSchema.parse(body)

    const existingEmployee = await Employee.findOne({ uniqueId: validated.uniqueId })
    if (existingEmployee) {
      return NextResponse.json({ error: 'Employee ID already exists' }, { status: 400 })
    }

    let providedBy: string | mongoose.Types.ObjectId = 'masteradmin'
    let approvalStatus: 'pending' | 'approved' = 'approved'

    if (session.user.role === 'partner') {
      const partnerDoc = await Partner.findOne({ userId: session.user.id })
      if (!partnerDoc) {
        return NextResponse.json({ error: 'Partner profile not found' }, { status: 404 })
      }
      providedBy = partnerDoc._id
      approvalStatus = 'pending'
    } else if (session.user.role === 'staff') {
      providedBy = 'masteradmin'
      approvalStatus = 'approved'
    }

    const employee = new Employee({
      uniqueId: validated.uniqueId,
      name: validated.name,
      level: validated.levelId,
      salary: validated.salary,
      nid: validated.nid,
      details: validated.details,
      photo: body.photo,
      providedBy,
      approvalStatus,
    })

    await employee.save()
    await employee.populate('level', 'levelName baseSalary')

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
