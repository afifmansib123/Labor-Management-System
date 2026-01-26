import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Employee } from '@/lib/models/Employee'
import { Partner } from '@/lib/models/Partner'
import { authOptions } from '@/lib/auth'
import mongoose from 'mongoose'
import { z } from 'zod'

const updateEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  levelId: z.string().min(1, 'Level is required').optional(),
  salary: z.number().positive('Salary must be positive').optional(),
  nid: z.string().min(1, 'NID is required').optional(),
  photo: z.string().optional(),
  details: z.record(z.any()).optional(),
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
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 })
    }

    await dbConnect()

    const employee = await Employee.findById(id)
      .populate('level', 'levelName baseSalary')
      .populate({
        path: 'providedBy',
        select: 'companyName',
        model: 'Partner',
        strictPopulate: false,
      })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (session.user.role === 'partner') {
      const partnerDoc = await Partner.findOne({ userId: session.user.id })
      if (!partnerDoc || employee.providedBy.toString() !== partnerDoc._id.toString()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error fetching employee:', error)
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

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 })
    }

    await dbConnect()

    const existingEmployee = await Employee.findById(id)
    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (session.user.role === 'partner') {
      const partnerDoc = await Partner.findOne({ userId: session.user.id })
      if (!partnerDoc || existingEmployee.providedBy.toString() !== partnerDoc._id.toString()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await req.json()
    const validated = updateEmployeeSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.name) updateData.name = validated.name
    if (validated.levelId) updateData.level = validated.levelId
    if (validated.salary) updateData.salary = validated.salary
    if (validated.nid) updateData.nid = validated.nid
    if (validated.photo !== undefined) updateData.photo = validated.photo
    if (validated.details) updateData.details = validated.details

    const employee = await Employee.findByIdAndUpdate(id, updateData, { new: true })
      .populate('level', 'levelName baseSalary')

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
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

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 })
    }

    await dbConnect()

    const existingEmployee = await Employee.findById(id)
    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (session.user.role === 'partner') {
      const partnerDoc = await Partner.findOne({ userId: session.user.id })
      if (!partnerDoc || existingEmployee.providedBy.toString() !== partnerDoc._id.toString()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (session.user.role === 'staff') {
      return NextResponse.json({ error: 'Staff cannot delete employees' }, { status: 403 })
    }

    await Employee.findByIdAndDelete(id)

    return NextResponse.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
