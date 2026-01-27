import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Job } from '@/lib/models/Job'
import { authOptions } from '@/lib/auth'
import mongoose from 'mongoose'
import { z, ZodError } from 'zod'
import { formatZodError } from '@/lib/utils/helpers'

const updateJobSchema = z.object({
  routeId: z.string().min(1, 'Route is required').optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  assignedEmployees: z.array(z.string()).optional(),
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
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }

    await dbConnect()

    const job = await Job.findById(id)
      .populate('routeId', 'name pointA pointB operatingDays operatingHours')
      .populate('createdBy', 'email')
      .populate('assignedEmployees', 'uniqueId name')

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
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

    if (session.user.role === 'partner') {
      return NextResponse.json({ error: 'Partners cannot update jobs' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = updateJobSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.routeId) updateData.routeId = validated.routeId
    if (validated.scheduledDate) updateData.scheduledDate = new Date(validated.scheduledDate)
    if (validated.scheduledTime !== undefined) updateData.scheduledTime = validated.scheduledTime
    if (validated.assignedEmployees) updateData.assignedEmployees = validated.assignedEmployees

    const job = await Job.findByIdAndUpdate(id, updateData, { new: true })
      .populate('routeId', 'name pointA pointB operatingHours')
      .populate('assignedEmployees', 'uniqueId name')

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error updating job:', error)
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 })
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
      return NextResponse.json({ error: 'Only MasterAdmin can delete jobs' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }

    await dbConnect()

    const job = await Job.findByIdAndDelete(id)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Job deleted successfully' })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
