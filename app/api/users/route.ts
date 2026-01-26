import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { User } from '@/lib/models/User'

export async function POST(req: NextRequest) {
  try {
    await dbConnect()

    const { email, password, role } = await req.json()

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    const user = new User({
      email,
      password,
      role,
    })

    await user.save()

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
