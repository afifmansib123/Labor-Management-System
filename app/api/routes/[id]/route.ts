import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Route } from '@/lib/models/Route'
import { Job } from '@/lib/models/Job'
import { authOptions } from '@/lib/auth'
import { createRouteSchema } from '@/lib/utils/validation'
import { ZodError } from 'zod'
import { formatZodError } from '@/lib/utils/helpers'
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
      return NextResponse.json({ error: 'Invalid route ID' }, { status: 400 })
    }

    await dbConnect()

    const route = await Route.findById(id)

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    return NextResponse.json(route)
  } catch (error) {
    console.error('Error fetching route:', error)
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
      return NextResponse.json({ error: 'Invalid route ID' }, { status: 400 })
    }

    await dbConnect()

    const route = await Route.findById(id)

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    const body = await req.json()
    const validated = createRouteSchema.parse(body)

    route.name = validated.name
    route.pointA = validated.pointA
    route.pointB = validated.pointB
    route.operatingDays = validated.operatingDays
    route.operatingHours = {
      start: validated.operatingHoursStart,
      end: validated.operatingHoursEnd,
    }
    if (body.mapCoordinates) {
      route.mapCoordinates = body.mapCoordinates
    }
    if (body.mapImageUrl) {
      route.mapImageUrl = body.mapImageUrl
    }

    await route.save()

    return NextResponse.json(route)
  } catch (error) {
    console.error('Error updating route:', error)
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

    const userRole = session.user?.role
    if (userRole !== 'masteradmin') {
      return NextResponse.json({ error: 'Only MasterAdmin can delete routes' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid route ID' }, { status: 400 })
    }

    await dbConnect()

    const route = await Route.findById(id)

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    // Check if there are any jobs using this route
    const jobsUsingRoute = await Job.countDocuments({ routeId: id })
    if (jobsUsingRoute > 0) {
      return NextResponse.json(
        { error: `Cannot delete route: ${jobsUsingRoute} job(s) are using this route` },
        { status: 400 }
      )
    }

    await Route.findByIdAndDelete(id)

    return NextResponse.json({ message: 'Route deleted successfully' })
  } catch (error) {
    console.error('Error deleting route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
