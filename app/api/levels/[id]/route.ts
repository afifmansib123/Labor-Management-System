import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { EmployeeLevel } from '@/lib/models/EmployeeLevel'
import { authOptions } from '@/lib/auth'
import { createEmployeeLevelSchema } from '@/lib/utils/validation'
import mongoose from 'mongoose'

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
      return NextResponse.json({ error: 'Invalid level ID' }, { status: 400 })
    }

    await dbConnect()

    const level = await EmployeeLevel.findById(id).populate('createdBy', 'email')
    if (!level) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 })
    }

    return NextResponse.json(level)
  } catch (error) {
    console.error('Error fetching level:', error)
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
      return NextResponse.json({ error: 'Forbidden: MasterAdmin only' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid level ID' }, { status: 400 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = createEmployeeLevelSchema.parse(body)

    const existingLevel = await EmployeeLevel.findOne({
      levelName: validated.levelName,
      _id: { $ne: id },
    })
    if (existingLevel) {
      return NextResponse.json({ error: 'Level name already exists' }, { status: 400 })
    }

    const level = await EmployeeLevel.findByIdAndUpdate(
      id,
      {
        levelName: validated.levelName,
        baseSalary: validated.baseSalary,
      },
      { new: true }
    )

    if (!level) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 })
    }

    return NextResponse.json(level)
  } catch (error) {
    console.error('Error updating level:', error)
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
      return NextResponse.json({ error: 'Forbidden: MasterAdmin only' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid level ID' }, { status: 400 })
    }

    await dbConnect()

    const level = await EmployeeLevel.findByIdAndDelete(id)
    if (!level) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Level deleted successfully' })
  } catch (error) {
    console.error('Error deleting level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
