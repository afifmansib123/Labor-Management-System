'use client'
 
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
 
interface DashboardStats {
  totalEmployees: number
  approvedEmployees: number
  pendingApprovalEmployees: number
  totalRoutes: number
  totalJobs: number
  pendingJobs: number
  completedJobs: number
  totalPartners: number
  pendingPaymentCount: number
  pendingPaymentTotal: number
  completedPaymentTotal: number
}
 
interface ChartData {
  name: string
  employees: number
  jobs: number
  payments: number
}
 
interface RecentEmployee {
  _id: string
  uniqueId: string
  name: string
  level: { name: string } | null
  createdAt: string
}
 
interface RecentJob {
  _id: string
  routeId: { name: string; pointA: string; pointB: string } | null
  scheduledDate: string
  scheduledTime: string
  status: string
}
 
export default function DashboardPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([])
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
 
  const userRole = (session?.user as any)?.role
 
  useEffect(() => {
    fetchDashboardData()
  }, [])
 
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setChartData(data.chartData)
        setRecentEmployees(data.recentEmployees || [])
        setRecentJobs(data.recentJobs || [])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }
 
  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `৳${(amount / 100000).toFixed(1)}L`
    } else if (amount >= 1000) {
      return `৳${(amount / 1000).toFixed(1)}K`
    }
    return `৳${amount}`
  }
 
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
 
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
 
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.email}
          {userRole && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">{userRole}</span>}
        </p>
      </div>
 
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmployees?.toLocaleString() || 0}</div>
            {userRole === 'masteradmin' && stats?.pendingApprovalEmployees ? (
              <p className="text-xs text-amber-600">{stats.pendingApprovalEmployees} pending approval</p>
            ) : (
              <p className="text-xs text-muted-foreground">{stats?.approvedEmployees || 0} approved</p>
            )}
          </CardContent>
        </Card>
 
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Routes & Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRoutes || 0} / {stats?.totalJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingJobs || 0} pending, {stats?.completedJobs || 0} completed
            </p>
          </CardContent>
        </Card>
 
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.pendingPaymentTotal || 0)}</div>
            <p className="text-xs text-muted-foreground">{stats?.pendingPaymentCount || 0} transactions</p>
          </CardContent>
        </Card>
 
        {userRole === 'masteradmin' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Partners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPartners || 0}</div>
              <p className="text-xs text-muted-foreground">Active partners</p>
            </CardContent>
          </Card>
        )}
 
        {userRole !== 'masteradmin' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Payments Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.completedPaymentTotal || 0)}</div>
              <p className="text-xs text-muted-foreground">Total paid out</p>
            </CardContent>
          </Card>
        )}
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>Monthly statistics for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="employees" fill="#3b82f6" name="New Employees" />
                  <Bar dataKey="jobs" fill="#10b981" name="Jobs Created" />
                  <Bar dataKey="payments" fill="#f59e0b" name="Payments Completed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available yet
              </div>
            )}
          </CardContent>
        </Card>
 
        <Card>
          <CardHeader>
            <CardTitle>Recent Employees</CardTitle>
            <CardDescription>Latest employees added to the system</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEmployees.length > 0 ? (
              <div className="space-y-3">
                {recentEmployees.map((employee) => (
                  <div key={employee._id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {employee.uniqueId} - {employee.level?.name || 'No level'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(employee.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No employees yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
 
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Latest scheduled jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentJobs.map((job) => (
                <div key={job._id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{job.routeId?.name || 'Unknown Route'}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      job.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  {job.routeId && (
                    <p className="text-sm text-muted-foreground mb-1">
                      {job.routeId.pointA} → {job.routeId.pointB}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formatDate(job.scheduledDate)} at {job.scheduledTime}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-muted-foreground">
              No jobs scheduled yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}