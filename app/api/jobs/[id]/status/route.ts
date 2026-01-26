import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Job } from '@/lib/models/Job'
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

    if (session.user.role === 'partner') {
      return NextResponse.json({ error: 'Partners cannot update job status' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
    }

    await dbConnect()

    const body = await req.json()
    const { status } = body

    if (!['pending', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const job = await Job.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('routeId', 'name pointA pointB')

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: `Job marked as ${status}`,
      job,
    })
  } catch (error) {
    console.error('Error updating job status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
