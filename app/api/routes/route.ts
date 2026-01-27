import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Route } from '@/lib/models/Route'
import { authOptions } from '@/lib/auth'
import { createRouteSchema } from '@/lib/utils/validation'
import { ZodError } from 'zod'
import { formatZodError } from '@/lib/utils/helpers'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const routes = await Route.find({ createdBy: session.user.id }).sort({ createdAt: -1 })

    return NextResponse.json(routes)
  } catch (error) {
    console.error('Error fetching routes:', error)
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
    const validated = createRouteSchema.parse(body)

    const route = new Route({
      name: validated.name,
      pointA: validated.pointA,
      pointB: validated.pointB,
      operatingDays: validated.operatingDays,
      operatingHours: {
        start: validated.operatingHoursStart,
        end: validated.operatingHoursEnd,
      },
      createdBy: session.user.id,
      mapCoordinates: body.mapCoordinates || [],
      mapImageUrl: body.mapImageUrl,
    })

    await route.save()

    return NextResponse.json(route, { status: 201 })
  } catch (error) {
    console.error('Error creating route:', error)
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
