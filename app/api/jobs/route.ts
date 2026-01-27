import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Job } from '@/lib/models/Job'
import { authOptions } from '@/lib/auth'
import { createJobSchema } from '@/lib/utils/validation'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { formatZodError } from '@/lib/utils/helpers'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(req.url)
    const routeId = searchParams.get('routeId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const query: Record<string, unknown> = {}

    if (routeId && mongoose.Types.ObjectId.isValid(routeId)) {
      query.routeId = new mongoose.Types.ObjectId(routeId)
    }

    if (status && ['active', 'inactive'].includes(status)) {
      query.status = status
    }

    const total = await Job.countDocuments(query)
    const jobs = await Job.find(query)
      .populate('routeId', 'name pointA pointB operatingDays operatingHours')
      .populate('createdBy', 'email')
      .populate('assignedEmployees', 'uniqueId name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user?.id) {
      console.error('Session user ID is missing:', session)
      return NextResponse.json({ error: 'Session invalid - please log out and log back in' }, { status: 401 })
    }

    if (session.user.role === 'partner') {
      return NextResponse.json({ error: 'Partners cannot create jobs' }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = createJobSchema.parse(body)

    // Check if a job already exists for this route
    const existingJob = await Job.findOne({ routeId: validated.routeId })
    if (existingJob) {
      return NextResponse.json(
        { error: 'A job assignment already exists for this route. Edit the existing job instead.' },
        { status: 400 }
      )
    }

    const job = new Job({
      routeId: validated.routeId,
      assignedEmployees: validated.assignedEmployees,
      createdBy: session.user.id,
    })

    await job.save()
    await job.populate('routeId', 'name pointA pointB operatingDays operatingHours')
    await job.populate('assignedEmployees', 'uniqueId name')

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
