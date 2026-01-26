import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Employee } from '@/lib/models/Employee'
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

    if (session.user.role !== 'masteradmin') {
      return NextResponse.json({ error: 'Forbidden: MasterAdmin only' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 })
    }

    await dbConnect()

    const body = await req.json()
    const { approved } = body

    const employee = await Employee.findById(id)
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (employee.providedBy === 'masteradmin') {
      return NextResponse.json({ error: 'Cannot approve masteradmin employees' }, { status: 400 })
    }

    employee.approvalStatus = approved ? 'approved' : 'pending'
    await employee.save()

    await employee.populate('level', 'levelName baseSalary')

    return NextResponse.json({
      message: approved ? 'Employee approved' : 'Employee approval revoked',
      employee,
    })
  } catch (error) {
    console.error('Error approving employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
