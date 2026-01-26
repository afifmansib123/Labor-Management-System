import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Partner } from '@/lib/models/Partner'
import { User } from '@/lib/models/User'
import { authOptions } from '@/lib/auth'
import { createPartnerSchema } from '@/lib/utils/validation'

function generatePassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'masteradmin') {
      return NextResponse.json({ error: 'Forbidden: MasterAdmin only' }, { status: 403 })
    }

    await dbConnect()

    const partners = await Partner.find()
      .populate('userId', 'email createdAt')
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 })

    return NextResponse.json(partners)
  } catch (error) {
    console.error('Error fetching partners:', error)
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

    const password = body.password || generatePassword()
    const validationData = { ...body, password }
    const validated = createPartnerSchema.parse(validationData)

    const existingUser = await User.findOne({ email: validated.email })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const user = new User({
      email: validated.email,
      password: password,
      role: 'partner',
    })
    await user.save()

    const partner = new Partner({
      userId: user._id,
      companyName: validated.companyName,
      companyDetails: validated.companyDetails,
      contactPerson: validated.contactPerson,
      contactPhone: validated.contactPhone,
      createdBy: session.user.id,
    })
    await partner.save()

    return NextResponse.json(
      {
        partner,
        credentials: {
          email: validated.email,
          password: password,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating partner:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
