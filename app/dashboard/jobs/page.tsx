'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Search,
  Check,
  MapPin,
  Route as RouteIcon,
  Filter,
  Users,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Select, MultiSelect } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Pagination, PaginationInfo } from '@/components/ui/Pagination'
import MapUploader from '@/components/dashboard/MapUploader'
import { useToast } from '@/components/ui/Toast'
import { createRouteSchema } from '@/lib/utils/validation'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Route {
  _id: string
  name: string
  pointA: string
  pointB: string
  operatingDays: string[]
  operatingHours: { start: string; end: string }
  mapImageUrl?: string
  createdAt: string
}

interface Employee {
  _id: string
  uniqueId: string
  name: string
}

interface Job {
  _id: string
  routeId: {
    _id: string
    name: string
    pointA: string
    pointB: string
    operatingDays?: string[]
    operatingHours?: { start: string; end: string }
  }
  assignedEmployees?: Array<{ _id: string; uniqueId: string; name: string }>
  status: 'active' | 'inactive'
  createdBy: { email: string }
  createdAt: string
}

export default function JobManagementPage() {
  const { data: session, status } = useSession()
  const { success, error: showError } = useToast()
  const isMasterAdmin = session?.user?.role === 'masteradmin'
  const isStaff = session?.user?.role === 'staff'

  const [tab, setTab] = useState('jobs')
  const [routes, setRoutes] = useState<Route[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false)
  const [isJobModalOpen, setIsJobModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deletingItem, setDeletingItem] = useState<{ type: 'route' | 'job'; item: Route | Job } | null>(null)

  const [mapData, setMapData] = useState<{ file: File; preview: string } | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterRoute, setFilterRoute] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 15

  const routeForm = useForm({
    resolver: zodResolver(createRouteSchema),
    defaultValues: {
      name: '',
      pointA: '',
      pointB: '',
      operatingDays: [] as string[],
      operatingHoursStart: '',
      operatingHoursEnd: '',
    },
  })

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch('/api/routes')
      if (!res.ok) throw new Error('Failed to fetch routes')
      const data = await res.json()
      setRoutes(data)
    } catch (err) {
      showError('Failed to load routes')
    }
  }, [showError])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?approvalStatus=approved')
      if (!res.ok) throw new Error('Failed to fetch employees')
      const data = await res.json()
      setEmployees(data.employees || [])
    } catch (err) {
      console.error('Failed to load employees:', err)
    }
  }, [])

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })

      if (filterRoute) params.append('routeId', filterRoute)
      if (filterStatus) params.append('status', filterStatus)

      const res = await fetch(`/api/jobs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch jobs')
      const data = await res.json()
      setJobs(data.jobs)
      setTotalPages(data.pagination.totalPages)
      setTotalItems(data.pagination.total)
    } catch (err) {
      showError('Failed to load jobs')
    }
  }, [currentPage, filterRoute, filterStatus, showError])

  useEffect(() => {
    if (status === 'loading') return
    Promise.all([fetchRoutes(), fetchEmployees()]).then(() => setIsLoading(false))
  }, [status, fetchRoutes, fetchEmployees])

  useEffect(() => {
    if (!isLoading) {
      fetchJobs()
    }
  }, [isLoading, fetchJobs])

  const onRouteSubmit = async (data: Record<string, unknown>) => {
    if (selectedDays.length === 0) {
      showError('Please select at least one operating day')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        operatingDays: selectedDays,
        mapImageUrl: mapData?.preview,
        mapCoordinates: [],
      }

      if (editingRoute) {
        const res = await fetch(`/api/routes/${editingRoute._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update route')
        }
        success('Route updated successfully')
      } else {
        const res = await fetch('/api/routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create route')
        }
        success('Route created successfully')
      }

      setIsRouteModalOpen(false)
      setEditingRoute(null)
      routeForm.reset()
      setSelectedDays([])
      setMapData(null)
      fetchRoutes()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onJobSubmit = async () => {
    if (!selectedRouteId) {
      showError('Please select a route')
      return
    }
    if (selectedEmployees.length === 0) {
      showError('Please assign at least one employee')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        routeId: selectedRouteId,
        assignedEmployees: selectedEmployees,
      }

      if (editingJob) {
        const res = await fetch(`/api/jobs/${editingJob._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedEmployees: selectedEmployees }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update job')
        }
        success('Job updated successfully')
      } else {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create job')
        }
        success('Employees assigned to route successfully')
      }

      setIsJobModalOpen(false)
      setEditingJob(null)
      setSelectedRouteId('')
      setSelectedEmployees([])
      fetchJobs()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    setIsSubmitting(true)
    try {
      const endpoint =
        deletingItem.type === 'route'
          ? `/api/routes/${deletingItem.item._id}`
          : `/api/jobs/${deletingItem.item._id}`

      const res = await fetch(endpoint, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Failed to delete ${deletingItem.type}`)
      }

      success(`${deletingItem.type === 'route' ? 'Route' : 'Job'} deleted successfully`)
      setIsDeleteModalOpen(false)
      setDeletingItem(null)

      if (deletingItem.type === 'route') {
        fetchRoutes()
      } else {
        fetchJobs()
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (job: Job) => {
    const newStatus = job.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/jobs/${job._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update status')
      }

      success(`Job marked as ${newStatus}`)
      fetchJobs()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update job status')
    }
  }

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const newDays = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      routeForm.setValue('operatingDays', newDays)
      return newDays
    })
  }

  const openJobCreate = () => {
    setEditingJob(null)
    setSelectedRouteId('')
    setSelectedEmployees([])
    setIsJobModalOpen(true)
  }

  const openJobEdit = (job: Job) => {
    setEditingJob(job)
    setSelectedRouteId(job.routeId._id)
    setSelectedEmployees(job.assignedEmployees?.map(e => e._id) || [])
    setIsJobModalOpen(true)
  }

  const routeOptions = routes.map((r) => ({ value: r._id, label: `${r.name} (${r.pointA} - ${r.pointB})` }))
  const employeeOptions = employees.map((e) => ({ value: e._id, label: `${e.name} (${e.uniqueId})` }))

  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery) return true
    return (
      job.routeId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.routeId.pointA.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.routeId.pointB.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Management</h1>
          <p className="text-muted-foreground">Manage routes and jobs for transportation</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="jobs">
            <Users className="h-4 w-4 mr-2" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="routes">
            <RouteIcon className="h-4 w-4 mr-2" />
            Routes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Route Assignments</CardTitle>
                  <CardDescription>
                    {totalItems} assignment{totalItems !== 1 ? 's' : ''} total
                  </CardDescription>
                </div>
                {(isMasterAdmin || isStaff) && (
                  <Button onClick={openJobCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Employees
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>Route</Label>
                      <Select
                        options={[{ value: '', label: 'All Routes' }, ...routeOptions]}
                        value={filterRoute}
                        onChange={(v) => {
                          setFilterRoute(v)
                          setCurrentPage(1)
                        }}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        options={[
                          { value: '', label: 'All Status' },
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                        ]}
                        value={filterStatus}
                        onChange={(v) => {
                          setFilterStatus(v)
                          setCurrentPage(1)
                        }}
                      />
                    </div>
                  </div>
                )}

                {filteredJobs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No jobs found. Create your first job to get started.
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Route</TableHead>
                          <TableHead>From / To</TableHead>
                          <TableHead>Schedule</TableHead>
                          <TableHead>Assigned Employees</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs.map((job) => (
                          <TableRow key={job._id}>
                            <TableCell className="font-medium">{job.routeId.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {job.routeId.pointA} → {job.routeId.pointB}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {job.routeId.operatingDays?.map((day) => (
                                    <Badge key={day} variant="outline" className="text-xs">
                                      {day.slice(0, 3)}
                                    </Badge>
                                  ))}
                                </div>
                                {job.routeId.operatingHours && (
                                  <span className="text-muted-foreground">
                                    {job.routeId.operatingHours.start} - {job.routeId.operatingHours.end}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {job.assignedEmployees && job.assignedEmployees.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {job.assignedEmployees.map((emp) => (
                                    <Badge key={emp._id} variant="secondary" className="text-xs">
                                      {emp.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No employees</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={job.status === 'active' ? 'success' : 'secondary'}
                              >
                                {job.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {(isMasterAdmin || isStaff) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusChange(job)}
                                    title={job.status === 'active' ? 'Deactivate' : 'Activate'}
                                  >
                                    <Check className={`h-4 w-4 ${job.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`} />
                                  </Button>
                                )}
                                {(isMasterAdmin || isStaff) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openJobEdit(job)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {isMasterAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDeletingItem({ type: 'job', item: job })
                                      setIsDeleteModalOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {totalPages > 1 && (
                      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <PaginationInfo
                          currentPage={currentPage}
                          totalPages={totalPages}
                          totalItems={totalItems}
                          itemsPerPage={itemsPerPage}
                        />
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={setCurrentPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MapUploader onMapSelect={(file, preview) => setMapData({ file, preview })} />

            <Card>
              <CardHeader>
                <CardTitle>Create Route</CardTitle>
                <CardDescription>Add a new transportation route</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={routeForm.handleSubmit(onRouteSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Route Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Agartola to Mohammadpur"
                      {...routeForm.register('name')}
                    />
                    {routeForm.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {routeForm.formState.errors.name.message as string}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pointA">Start Point</Label>
                      <Input
                        id="pointA"
                        placeholder="e.g., Agartola"
                        {...routeForm.register('pointA')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointB">End Point</Label>
                      <Input
                        id="pointB"
                        placeholder="e.g., Mohammadpur"
                        {...routeForm.register('pointB')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Operating Days</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`p-2 rounded text-sm border transition-colors ${
                            selectedDays.includes(day)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border bg-background hover:bg-muted'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start">Start Time</Label>
                      <Input
                        id="start"
                        type="time"
                        {...routeForm.register('operatingHoursStart')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end">End Time</Label>
                      <Input
                        id="end"
                        type="time"
                        {...routeForm.register('operatingHoursEnd')}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Create Route'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Existing Routes</CardTitle>
              <CardDescription>{routes.length} routes defined</CardDescription>
            </CardHeader>
            <CardContent>
              {routes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No routes yet. Create your first route above.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>From / To</TableHead>
                      <TableHead>Operating Days</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => (
                      <TableRow key={route._id}>
                        <TableCell className="font-medium">{route.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {route.pointA} → {route.pointB}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {route.operatingDays.map((day) => (
                              <Badge key={day} variant="secondary" className="text-xs">
                                {day.slice(0, 3)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {route.operatingHours.start} - {route.operatingHours.end}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isMasterAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeletingItem({ type: 'route', item: route })
                                  setIsDeleteModalOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Modal
        isOpen={isJobModalOpen}
        onClose={() => {
          setIsJobModalOpen(false)
          setEditingJob(null)
          setSelectedRouteId('')
          setSelectedEmployees([])
        }}
        title={editingJob ? 'Edit Assignment' : 'Assign Employees to Route'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label>Route</Label>
            <Select
              options={routeOptions}
              value={selectedRouteId}
              onChange={setSelectedRouteId}
              placeholder="Select a route"
              disabled={!!editingJob}
            />
            {editingJob && (
              <p className="text-xs text-muted-foreground mt-1">
                Route cannot be changed. Delete and create a new assignment instead.
              </p>
            )}
          </div>

          <div>
            <Label>Assign Employees</Label>
            <MultiSelect
              options={employeeOptions}
              value={selectedEmployees}
              onChange={setSelectedEmployees}
              placeholder="Select employees to assign"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsJobModalOpen(false)
                setEditingJob(null)
                setSelectedRouteId('')
                setSelectedEmployees([])
              }}
            >
              Cancel
            </Button>
            <Button onClick={onJobSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingJob ? (
                'Update Assignment'
              ) : (
                'Assign Employees'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeletingItem(null)
        }}
        onConfirm={handleDelete}
        title={`Delete ${deletingItem?.type === 'route' ? 'Route' : 'Job'}`}
        message={
          deletingItem?.type === 'route'
            ? `Are you sure you want to delete this route? This cannot be undone.`
            : `Are you sure you want to delete this job? This cannot be undone.`
        }
        confirmText="Delete"
        variant="destructive"
        isLoading={isSubmitting}
      />
    </div>
  )
}
