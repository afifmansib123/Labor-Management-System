import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db'
import { Employee } from '@/lib/models/Employee'
import { Partner } from '@/lib/models/Partner'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const batchEmployeeSchema = z.object({
  employees: z.array(
    z.object({
      uniqueId: z.string().min(1, 'Unique ID is required'),
      name: z.string().min(1, 'Name is required'),
      levelId: z.string().min(1, 'Level is required'),
      salary: z.number().positive('Salary must be positive'),
      nid: z.string().min(1, 'NID is required'),
      photo: z.string().optional(),
      details: z.record(z.any()).optional(),
    })
  ).min(1, 'At least one employee is required'),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = batchEmployeeSchema.parse(body)

    let providedBy: string | unknown = 'masteradmin'
    let approvalStatus: 'pending' | 'approved' = 'approved'

    if (session.user.role === 'partner') {
      const partnerDoc = await Partner.findOne({ userId: session.user.id })
      if (!partnerDoc) {
        return NextResponse.json({ error: 'Partner profile not found' }, { status: 404 })
      }
      providedBy = partnerDoc._id
      approvalStatus = 'pending'
    } else if (session.user.role === 'staff') {
      providedBy = 'masteradmin'
      approvalStatus = 'approved'
    }

    const uniqueIds = validated.employees.map((e) => e.uniqueId)
    const existingEmployees = await Employee.find({ uniqueId: { $in: uniqueIds } })

    if (existingEmployees.length > 0) {
      const existingIds = existingEmployees.map((e) => e.uniqueId)
      return NextResponse.json(
        { error: 'Some employee IDs already exist', existingIds },
        { status: 400 }
      )
    }

    const employeeDocs = validated.employees.map((emp) => ({
      uniqueId: emp.uniqueId,
      name: emp.name,
      level: emp.levelId,
      salary: emp.salary,
      nid: emp.nid,
      photo: emp.photo,
      details: emp.details,
      providedBy,
      approvalStatus,
    }))

    const createdEmployees = await Employee.insertMany(employeeDocs)

    return NextResponse.json(
      {
        message: `Successfully created ${createdEmployees.length} employees`,
        employees: createdEmployees,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error batch creating employees:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
