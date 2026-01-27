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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const query: Record<string, unknown> = {}

    if (routeId && mongoose.Types.ObjectId.isValid(routeId)) {
      query.routeId = new mongoose.Types.ObjectId(routeId)
    }

    if (status && ['pending', 'completed'].includes(status)) {
      query.status = status
    }

    if (startDate || endDate) {
      query.scheduledDate = {}
      if (startDate) (query.scheduledDate as Record<string, Date>).$gte = new Date(startDate)
      if (endDate) (query.scheduledDate as Record<string, Date>).$lte = new Date(endDate)
    }

    const total = await Job.countDocuments(query)
    const jobs = await Job.find(query)
      .populate('routeId', 'name pointA pointB')
      .populate('createdBy', 'email')
      .sort({ scheduledDate: -1, scheduledTime: -1 })
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

    if (session.user.role === 'partner') {
      return NextResponse.json({ error: 'Partners cannot create jobs' }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = createJobSchema.parse({
      ...body,
      scheduledDate: new Date(body.scheduledDate),
    })

    const job = new Job({
      routeId: validated.routeId,
      scheduledDate: validated.scheduledDate,
      scheduledTime: validated.scheduledTime,
      createdBy: session.user.id,
    })

    await job.save()
    await job.populate('routeId', 'name pointA pointB')

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
