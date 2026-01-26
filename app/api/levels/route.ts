import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { EmployeeLevel } from '@/lib/models/EmployeeLevel'
import { authOptions } from '@/lib/auth'
import { createEmployeeLevelSchema } from '@/lib/utils/validation'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const levels = await EmployeeLevel.find()
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 })

    return NextResponse.json(levels)
  } catch (error) {
    console.error('Error fetching levels:', error)
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
      return NextResponse.json({ error: 'Forbidden: MasterAdmin only' }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = createEmployeeLevelSchema.parse(body)

    const existingLevel = await EmployeeLevel.findOne({ levelName: validated.levelName })
    if (existingLevel) {
      return NextResponse.json({ error: 'Level name already exists' }, { status: 400 })
    }

    const level = new EmployeeLevel({
      levelName: validated.levelName,
      baseSalary: validated.baseSalary,
      createdBy: session.user.id,
    })

    await level.save()

    return NextResponse.json(level, { status: 201 })
  } catch (error) {
    console.error('Error creating level:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
