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
  X,
  Users,
  Layers,
  Filter,
  UserPlus,
  Image as ImageIcon,
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
import { Textarea } from '@/components/ui/Textarea'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
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
import { CloudinaryUploader } from '@/components/dashboard/CloudinaryUploader'
import { useToast } from '@/components/ui/Toast'

const levelFormSchema = z.object({
  levelName: z.string().min(1, 'Level name is required'),
  baseSalary: z.string().min(1, 'Base salary is required'),
})

const employeeFormSchema = z.object({
  uniqueId: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(1, 'Name is required'),
  levelId: z.string().min(1, 'Level is required'),
  salary: z.string().min(1, 'Salary is required'),
  nid: z.string().min(1, 'NID is required'),
  details: z.string().optional(),
})

type LevelFormData = z.infer<typeof levelFormSchema>
type EmployeeFormData = z.infer<typeof employeeFormSchema>

interface Level {
  _id: string
  levelName: string
  baseSalary: number
  createdAt: string
}

interface Employee {
  _id: string
  uniqueId: string
  name: string
  level: {
    _id: string
    levelName: string
    baseSalary: number
  }
  salary: number
  photo?: string
  nid: string
  providedBy: string | { _id: string; companyName: string }
  approvalStatus: 'pending' | 'approved'
  createdAt: string
}

interface Partner {
  _id: string
  companyName: string
  userId: { _id: string; email: string }
}

export default function WorkforcePage() {
  const { data: session, status } = useSession()
  const { success, error: showError } = useToast()
  const isMasterAdmin = session?.user?.role === 'masteradmin'
  const isPartner = session?.user?.role === 'partner'

  const [activeTab, setActiveTab] = useState('employees')
  const [levels, setLevels] = useState<Level[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false)
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const [editingLevel, setEditingLevel] = useState<Level | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deletingItem, setDeletingItem] = useState<{ type: 'level' | 'employee'; item: Level | Employee } | null>(null)
  const [employeePhoto, setEmployeePhoto] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterPartner, setFilterPartner] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 15

  const [batchEmployees, setBatchEmployees] = useState([
    { uniqueId: '', name: '', levelId: '', salary: '', nid: '' },
  ])

  const levelForm = useForm<LevelFormData>({
    resolver: zodResolver(levelFormSchema),
  })

  const employeeForm = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
  })

  const fetchLevels = useCallback(async () => {
    try {
      const res = await fetch('/api/levels')
      if (!res.ok) throw new Error('Failed to fetch levels')
      const data = await res.json()
      setLevels(data)
    } catch (err) {
      showError('Failed to load levels')
    }
  }, [showError])

  const fetchEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })

      if (searchQuery) params.append('search', searchQuery)
      if (filterLevel) params.append('level', filterLevel)
      if (filterPartner) params.append('partner', filterPartner)
      if (filterStatus) params.append('status', filterStatus)

      const res = await fetch(`/api/employees?${params}`)
      if (!res.ok) throw new Error('Failed to fetch employees')
      const data = await res.json()
      setEmployees(data.employees)
      setTotalPages(data.pagination.totalPages)
      setTotalItems(data.pagination.total)
    } catch (err) {
      showError('Failed to load employees')
    }
  }, [currentPage, searchQuery, filterLevel, filterPartner, filterStatus, showError])

  const fetchPartners = useCallback(async () => {
    if (!isMasterAdmin) return
    try {
      const res = await fetch('/api/partners')
      if (!res.ok) return
      const data = await res.json()
      setPartners(data)
    } catch {
      // Partners are optional
    }
  }, [isMasterAdmin])

  useEffect(() => {
    if (status === 'loading') return
    Promise.all([fetchLevels(), fetchPartners()]).then(() => setIsLoading(false))
  }, [status, fetchLevels, fetchPartners])

  useEffect(() => {
    if (!isLoading) {
      fetchEmployees()
    }
  }, [isLoading, fetchEmployees])

  const onLevelSubmit = async (data: LevelFormData) => {
    setIsSubmitting(true)
    try {
      const payload = {
        levelName: data.levelName,
        baseSalary: parseFloat(data.baseSalary),
      }

      if (editingLevel) {
        const res = await fetch(`/api/levels/${editingLevel._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update level')
        }
        success('Level updated successfully')
      } else {
        const res = await fetch('/api/levels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create level')
        }
        success('Level created successfully')
      }

      setIsLevelModalOpen(false)
      setEditingLevel(null)
      levelForm.reset()
      fetchLevels()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onEmployeeSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true)
    try {
      const payload = {
        uniqueId: data.uniqueId,
        name: data.name,
        levelId: data.levelId,
        salary: parseFloat(data.salary),
        nid: data.nid,
        details: data.details ? JSON.parse(data.details) : undefined,
        photo: employeePhoto || undefined,
      }

      if (editingEmployee) {
        const res = await fetch(`/api/employees/${editingEmployee._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update employee')
        }
        success('Employee updated successfully')
      } else {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create employee')
        }
        success('Employee created successfully')
      }

      setIsEmployeeModalOpen(false)
      setEditingEmployee(null)
      setEmployeePhoto('')
      employeeForm.reset()
      fetchEmployees()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onBatchSubmit = async () => {
    const validEmployees = batchEmployees.filter(
      (e) => e.uniqueId && e.name && e.levelId && e.salary && e.nid
    )

    if (validEmployees.length === 0) {
      showError('Please fill in at least one complete employee row')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/employees/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: validEmployees.map((e) => ({
            ...e,
            salary: parseFloat(e.salary),
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create employees')
      }

      const result = await res.json()
      success(result.message)
      setIsBatchModalOpen(false)
      setBatchEmployees([{ uniqueId: '', name: '', levelId: '', salary: '', nid: '' }])
      fetchEmployees()
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
        deletingItem.type === 'level'
          ? `/api/levels/${deletingItem.item._id}`
          : `/api/employees/${deletingItem.item._id}`

      const res = await fetch(endpoint, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Failed to delete ${deletingItem.type}`)

      success(`${deletingItem.type === 'level' ? 'Level' : 'Employee'} deleted successfully`)
      setIsDeleteModalOpen(false)
      setDeletingItem(null)

      if (deletingItem.type === 'level') {
        fetchLevels()
      } else {
        fetchEmployees()
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproval = async (employee: Employee, approved: boolean) => {
    try {
      const res = await fetch(`/api/employees/${employee._id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })

      if (!res.ok) throw new Error('Failed to update approval status')

      success(approved ? 'Employee approved' : 'Employee approval revoked')
      fetchEmployees()
    } catch (err) {
      showError('Failed to update approval status')
    }
  }

  const openEmployeeEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setEmployeePhoto(employee.photo || '')
    employeeForm.reset({
      uniqueId: employee.uniqueId,
      name: employee.name,
      levelId: employee.level._id,
      salary: employee.salary.toString(),
      nid: employee.nid,
      details: '',
    })
    setIsEmployeeModalOpen(true)
  }

  const openEmployeeCreate = () => {
    setEditingEmployee(null)
    setEmployeePhoto('')
    employeeForm.reset()
    setIsEmployeeModalOpen(true)
  }

  const openLevelEdit = (level: Level) => {
    setEditingLevel(level)
    levelForm.reset({
      levelName: level.levelName,
      baseSalary: level.baseSalary.toString(),
    })
    setIsLevelModalOpen(true)
  }

  const openLevelCreate = () => {
    setEditingLevel(null)
    levelForm.reset()
    setIsLevelModalOpen(true)
  }

  const addBatchRow = () => {
    setBatchEmployees([
      ...batchEmployees,
      { uniqueId: '', name: '', levelId: '', salary: '', nid: '' },
    ])
  }

  const removeBatchRow = (index: number) => {
    if (batchEmployees.length > 1) {
      setBatchEmployees(batchEmployees.filter((_, i) => i !== index))
    }
  }

  const updateBatchRow = (index: number, field: string, value: string) => {
    const updated = [...batchEmployees]
    updated[index] = { ...updated[index], [field]: value }
    setBatchEmployees(updated)
  }

  const getProviderName = (providedBy: string | { _id: string; companyName: string }) => {
    if (providedBy === 'masteradmin') return 'Own Staff'
    if (typeof providedBy === 'object' && providedBy.companyName) {
      return providedBy.companyName
    }
    return 'Partner'
  }

  const levelOptions = levels.map((l) => ({ value: l._id, label: `${l.levelName} (${l.baseSalary} BDT)` }))

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
          <h1 className="text-3xl font-bold">Workforce Management</h1>
          <p className="text-muted-foreground">Manage employees and salary levels</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            Employees
          </TabsTrigger>
          {isMasterAdmin && (
            <TabsTrigger value="levels">
              <Layers className="h-4 w-4 mr-2" />
              Salary Levels
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employees</CardTitle>
                  <CardDescription>
                    {totalItems} employee{totalItems !== 1 ? 's' : ''} total
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {(isMasterAdmin || isPartner) && (
                    <>
                      <Button variant="outline" onClick={() => setIsBatchModalOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Batch Add
                      </Button>
                      <Button onClick={openEmployeeCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Employee
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentPage(1)
                      }}
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>Level</Label>
                      <Select
                        options={[{ value: '', label: 'All Levels' }, ...levelOptions]}
                        value={filterLevel}
                        onChange={(v) => {
                          setFilterLevel(v)
                          setCurrentPage(1)
                        }}
                      />
                    </div>
                    {isMasterAdmin && (
                      <div>
                        <Label>Provider</Label>
                        <Select
                          options={[
                            { value: '', label: 'All Providers' },
                            { value: 'masteradmin', label: 'Own Staff' },
                            ...partners.map((p) => ({
                              value: p._id,
                              label: p.companyName,
                            })),
                          ]}
                          value={filterPartner}
                          onChange={(v) => {
                            setFilterPartner(v)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <Label>Status</Label>
                      <Select
                        options={[
                          { value: '', label: 'All Status' },
                          { value: 'approved', label: 'Approved' },
                          { value: 'pending', label: 'Pending' },
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

                {employees.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No employees found. Add your first employee to get started.
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Photo</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>NID</TableHead>
                          {isMasterAdmin && <TableHead>Provider</TableHead>}
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee._id}>
                            <TableCell>
                              {employee.photo ? (
                                <img
                                  src={employee.photo}
                                  alt={employee.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono">{employee.uniqueId}</TableCell>
                            <TableCell className="font-medium">{employee.name}</TableCell>
                            <TableCell>{employee.level?.levelName || '-'}</TableCell>
                            <TableCell>{employee.salary.toLocaleString()} BDT</TableCell>
                            <TableCell className="font-mono">{employee.nid}</TableCell>
                            {isMasterAdmin && (
                              <TableCell>{getProviderName(employee.providedBy)}</TableCell>
                            )}
                            <TableCell>
                              <Badge
                                variant={
                                  employee.approvalStatus === 'approved'
                                    ? 'success'
                                    : 'warning'
                                }
                              >
                                {employee.approvalStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isMasterAdmin &&
                                  employee.providedBy !== 'masteradmin' &&
                                  employee.approvalStatus === 'pending' && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleApproval(employee, true)}
                                        title="Approve"
                                      >
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                    </>
                                  )}
                                {isMasterAdmin &&
                                  employee.providedBy !== 'masteradmin' &&
                                  employee.approvalStatus === 'approved' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApproval(employee, false)}
                                      title="Revoke Approval"
                                    >
                                      <X className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEmployeeEdit(employee)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {(isMasterAdmin || isPartner) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDeletingItem({ type: 'employee', item: employee })
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

        {isMasterAdmin && (
          <TabsContent value="levels" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Salary Levels</CardTitle>
                    <CardDescription>
                      Define salary levels for employees
                    </CardDescription>
                  </div>
                  <Button onClick={openLevelCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Level
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {levels.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No salary levels defined. Add your first level to get started.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level Name</TableHead>
                        <TableHead>Base Salary</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {levels.map((level) => (
                        <TableRow key={level._id}>
                          <TableCell className="font-medium">{level.levelName}</TableCell>
                          <TableCell>{level.baseSalary.toLocaleString()} BDT</TableCell>
                          <TableCell>
                            {new Date(level.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openLevelEdit(level)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeletingItem({ type: 'level', item: level })
                                  setIsDeleteModalOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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
        )}
      </Tabs>

      <Modal
        isOpen={isLevelModalOpen}
        onClose={() => {
          setIsLevelModalOpen(false)
          setEditingLevel(null)
          levelForm.reset()
        }}
        title={editingLevel ? 'Edit Level' : 'Add New Level'}
        size="sm"
      >
        <form onSubmit={levelForm.handleSubmit(onLevelSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="levelName">Level Name</Label>
            <Input
              id="levelName"
              {...levelForm.register('levelName')}
              placeholder="e.g., Level 1, Senior, Junior"
            />
            {levelForm.formState.errors.levelName && (
              <p className="text-sm text-red-500 mt-1">
                {levelForm.formState.errors.levelName.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="baseSalary">Base Salary (BDT)</Label>
            <Input
              id="baseSalary"
              type="number"
              {...levelForm.register('baseSalary')}
              placeholder="15000"
            />
            {levelForm.formState.errors.baseSalary && (
              <p className="text-sm text-red-500 mt-1">
                {levelForm.formState.errors.baseSalary.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLevelModalOpen(false)
                setEditingLevel(null)
                levelForm.reset()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingLevel ? (
                'Update Level'
              ) : (
                'Create Level'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false)
          setEditingEmployee(null)
          setEmployeePhoto('')
          employeeForm.reset()
        }}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        size="lg"
      >
        <form onSubmit={employeeForm.handleSubmit(onEmployeeSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="uniqueId">Employee ID</Label>
              <Input
                id="uniqueId"
                {...employeeForm.register('uniqueId')}
                placeholder="EMP001"
                disabled={!!editingEmployee}
              />
              {employeeForm.formState.errors.uniqueId && (
                <p className="text-sm text-red-500 mt-1">
                  {employeeForm.formState.errors.uniqueId.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                {...employeeForm.register('name')}
                placeholder="John Doe"
              />
              {employeeForm.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {employeeForm.formState.errors.name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="levelId">Salary Level</Label>
              <Select
                options={levelOptions}
                value={employeeForm.watch('levelId') || ''}
                onChange={(v) => employeeForm.setValue('levelId', v)}
                placeholder="Select level"
              />
              {employeeForm.formState.errors.levelId && (
                <p className="text-sm text-red-500 mt-1">
                  {employeeForm.formState.errors.levelId.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="salary">Monthly Salary (BDT)</Label>
              <Input
                id="salary"
                type="number"
                {...employeeForm.register('salary')}
                placeholder="15000"
              />
              {employeeForm.formState.errors.salary && (
                <p className="text-sm text-red-500 mt-1">
                  {employeeForm.formState.errors.salary.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="nid">National ID (NID)</Label>
            <Input
              id="nid"
              {...employeeForm.register('nid')}
              placeholder="1234567890123"
            />
            {employeeForm.formState.errors.nid && (
              <p className="text-sm text-red-500 mt-1">
                {employeeForm.formState.errors.nid.message}
              </p>
            )}
          </div>

          <div>
            <Label>Employee Photo</Label>
            <CloudinaryUploader
              value={employeePhoto}
              onChange={setEmployeePhoto}
              folder="labor-management/employees"
            />
          </div>

          <div>
            <Label htmlFor="details">Additional Details (JSON)</Label>
            <Textarea
              id="details"
              {...employeeForm.register('details')}
              placeholder='{"address": "Dhaka", "phone": "01700000000"}'
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEmployeeModalOpen(false)
                setEditingEmployee(null)
                setEmployeePhoto('')
                employeeForm.reset()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingEmployee ? (
                'Update Employee'
              ) : (
                'Create Employee'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false)
          setBatchEmployees([{ uniqueId: '', name: '', levelId: '', salary: '', nid: '' }])
        }}
        title="Batch Add Employees"
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add multiple employees at once. Fill in the required fields for each employee.
          </p>

          <div className="max-h-96 overflow-y-auto space-y-3">
            {batchEmployees.map((emp, index) => (
              <div
                key={index}
                className="grid grid-cols-6 gap-2 items-end p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <Label className="text-xs">ID</Label>
                  <Input
                    value={emp.uniqueId}
                    onChange={(e) => updateBatchRow(index, 'uniqueId', e.target.value)}
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={emp.name}
                    onChange={(e) => updateBatchRow(index, 'name', e.target.value)}
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <Label className="text-xs">Level</Label>
                  <Select
                    options={levelOptions}
                    value={emp.levelId}
                    onChange={(v) => updateBatchRow(index, 'levelId', v)}
                    placeholder="Level"
                  />
                </div>
                <div>
                  <Label className="text-xs">Salary</Label>
                  <Input
                    type="number"
                    value={emp.salary}
                    onChange={(e) => updateBatchRow(index, 'salary', e.target.value)}
                    placeholder="15000"
                  />
                </div>
                <div>
                  <Label className="text-xs">NID</Label>
                  <Input
                    value={emp.nid}
                    onChange={(e) => updateBatchRow(index, 'nid', e.target.value)}
                    placeholder="NID Number"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBatchRow(index)}
                  disabled={batchEmployees.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addBatchRow}>
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBatchModalOpen(false)
                setBatchEmployees([{ uniqueId: '', name: '', levelId: '', salary: '', nid: '' }])
              }}
            >
              Cancel
            </Button>
            <Button onClick={onBatchSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Create ${batchEmployees.filter((e) => e.uniqueId && e.name).length} Employees`
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
        title={`Delete ${deletingItem?.type === 'level' ? 'Level' : 'Employee'}`}
        message={
          deletingItem?.type === 'level'
            ? `Are you sure you want to delete "${(deletingItem.item as Level).levelName}"? This cannot be undone.`
            : `Are you sure you want to delete employee "${(deletingItem?.item as Employee)?.name}"? This cannot be undone.`
        }
        confirmText="Delete"
        variant="destructive"
        isLoading={isSubmitting}
      />
    </div>
  )
}
