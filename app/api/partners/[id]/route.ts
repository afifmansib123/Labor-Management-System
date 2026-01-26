import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Partner } from '@/lib/models/Partner'
import { User } from '@/lib/models/User'
import { authOptions } from '@/lib/auth'
import mongoose from 'mongoose'
import { z } from 'zod'

const updatePartnerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyDetails: z.string().min(1, 'Company details are required'),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
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

    if (session.user.role !== 'masteradmin') {
      return NextResponse.json({ error: 'Forbidden: MasterAdmin only' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid partner ID' }, { status: 400 })
    }

    await dbConnect()

    const partner = await Partner.findById(id)
      .populate('userId', 'email createdAt')
      .populate('createdBy', 'email')

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    return NextResponse.json(partner)
  } catch (error) {
    console.error('Error fetching partner:', error)
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
      return NextResponse.json({ error: 'Invalid partner ID' }, { status: 400 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = updatePartnerSchema.parse(body)

    const partner = await Partner.findByIdAndUpdate(
      id,
      {
        companyName: validated.companyName,
        companyDetails: validated.companyDetails,
        contactPerson: validated.contactPerson,
        contactPhone: validated.contactPhone,
      },
      { new: true }
    ).populate('userId', 'email createdAt')

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    return NextResponse.json(partner)
  } catch (error) {
    console.error('Error updating partner:', error)
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
      return NextResponse.json({ error: 'Invalid partner ID' }, { status: 400 })
    }

    await dbConnect()

    const partner = await Partner.findById(id)
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    await User.findByIdAndDelete(partner.userId)
    await Partner.findByIdAndDelete(id)

    return NextResponse.json({ message: 'Partner deleted successfully' })
  } catch (error) {
    console.error('Error deleting partner:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
