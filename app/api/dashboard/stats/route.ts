import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { Employee } from '@/lib/models/Employee'
import { Partner } from '@/lib/models/Partner'
import { Route } from '@/lib/models/Route'
import { Job } from '@/lib/models/Job'
import { Payment } from '@/lib/models/Payment'
 
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user?.id) {
      console.error('Session user ID is missing:', session)
      return NextResponse.json({ error: 'Session invalid - please log out and log back in' }, { status: 401 })
    }

    await dbConnect()

    const userRole = session.user.role
    const userId = session.user.id
 
    // Build query filters based on role
    let employeeFilter: any = {}
    let paymentEmployeeIds: string[] = []
 
    if (userRole === 'partner') {
      // Partner can only see their own employees
      employeeFilter = { providedBy: userId, approvalStatus: 'approved' }
    } else if (userRole === 'staff') {
      // Staff can only see masteradmin employees
      employeeFilter = { providedBy: 'masteradmin' }
    }
    // masteradmin sees all
 
    // Get counts
    const [
      totalEmployees,
      approvedEmployees,
      pendingApprovalEmployees,
      totalRoutes,
      totalJobs,
      pendingJobs,
      completedJobs,
      totalPartners,
    ] = await Promise.all([
      Employee.countDocuments(employeeFilter),
      Employee.countDocuments({ ...employeeFilter, approvalStatus: 'approved' }),
      userRole === 'masteradmin'
        ? Employee.countDocuments({ approvalStatus: 'pending' })
        : 0,
      Route.countDocuments(),
      Job.countDocuments(),
      Job.countDocuments({ status: 'pending' }),
      Job.countDocuments({ status: 'completed' }),
      Partner.countDocuments(),
    ])
 
    // Get employee IDs for payment filtering
    let employees
    if (Object.keys(employeeFilter).length > 0) {
      employees = await Employee.find(employeeFilter).select('_id')
      paymentEmployeeIds = employees.map((e: any) => e._id.toString())
    }
 
    // Build payment filter
    let paymentFilter: any = {}
    if (paymentEmployeeIds.length > 0) {
      paymentFilter.employeeId = { $in: paymentEmployeeIds }
    } else if (userRole !== 'masteradmin') {
      // No employees found for this role, no payments to show
      paymentFilter.employeeId = { $in: [] }
    }
 
    // Get payment stats
    const pendingPayments = await Payment.find({
      ...paymentFilter,
      status: { $in: ['pending', 'approved'] }
    })
 
    const pendingPaymentCount = pendingPayments.length
    const pendingPaymentTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0)
 
    const completedPayments = await Payment.find({
      ...paymentFilter,
      status: 'completed'
    })
    const completedPaymentTotal = completedPayments.reduce((sum, p) => sum + p.amount, 0)
 
    // Get monthly chart data for last 6 months
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
 
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
 
      const monthName = monthStart.toLocaleString('default', { month: 'short' })
 
      const [monthEmployees, monthJobs, monthPayments] = await Promise.all([
        Employee.countDocuments({
          ...employeeFilter,
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }),
        Job.countDocuments({
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }),
        Payment.countDocuments({
          ...paymentFilter,
          status: 'completed',
          paidDate: { $gte: monthStart, $lte: monthEnd }
        }),
      ])
 
      monthlyData.push({
        name: monthName,
        employees: monthEmployees,
        jobs: monthJobs,
        payments: monthPayments,
      })
    }
 
    // Get recent activity
    const recentEmployees = await Employee.find(employeeFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('level', 'name')
      .lean()
 
    const recentJobs = await Job.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('routeId', 'name pointA pointB')
      .lean()
 
    return NextResponse.json({
      stats: {
        totalEmployees,
        approvedEmployees,
        pendingApprovalEmployees,
        totalRoutes,
        totalJobs,
        pendingJobs,
        completedJobs,
        totalPartners,
        pendingPaymentCount,
        pendingPaymentTotal,
        completedPaymentTotal,
      },
      chartData: monthlyData,
      recentEmployees,
      recentJobs,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}