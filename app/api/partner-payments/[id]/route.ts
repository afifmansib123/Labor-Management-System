import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { PartnerPayment } from '@/lib/models/PartnerPayment'
import { Partner } from '@/lib/models/Partner'
import { authOptions } from '@/lib/auth'
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
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    }

    await dbConnect()

    const payment = await PartnerPayment.findById(id).populate('partnerId', 'email')

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (session.user.role === 'partner' && payment.partnerId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const partner = await Partner.findOne({ userId: payment.partnerId })

    return NextResponse.json({
      ...payment.toObject(),
      partnerInfo: partner
        ? {
            companyName: partner.companyName,
            contactPerson: partner.contactPerson,
            contactPhone: partner.contactPhone,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching partner payment:', error)
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
      return NextResponse.json({ error: 'Only MasterAdmin can delete partner payments' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    }

    await dbConnect()

    const payment = await PartnerPayment.findByIdAndDelete(id)
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Partner payment deleted successfully' })
  } catch (error) {
    console.error('Error deleting partner payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
