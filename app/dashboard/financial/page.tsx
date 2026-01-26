'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Plus,
  Loader2,
  Search,
  Check,
  X,
  Filter,
  Calendar as CalendarIcon,
  DollarSign,
  Upload,
  Users,
  FileText,
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
import { Select } from '@/components/ui/Select'
import { Calendar, DatePicker } from '@/components/ui/Calendar'
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

interface Employee {
  _id: string
  uniqueId: string
  name: string
  level?: { levelName: string; baseSalary: number }
  salary: number
  photo?: string
  providedBy: string | { companyName: string }
}

interface Payment {
  _id: string
  employeeId: Employee
  amount: number
  dueDate: string
  paidDate?: string
  status: 'pending' | 'approved' | 'completed'
  paidBy?: { email: string }
  proofUrl?: string
  notes?: string
  createdAt: string
}

interface PaymentDateInfo {
  _id: string
  count: number
  totalAmount: number
  pendingCount: number
}

export default function FinancialPage() {
  const { data: session, status } = useSession()
  const { success, error: showError } = useToast()
  const isMasterAdmin = session?.user?.role === 'masteradmin'
  const isPartner = session?.user?.role === 'partner'
  const isStaff = session?.user?.role === 'staff'

  const [tab, setTab] = useState('payments')
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentDates, setPaymentDates] = useState<PaymentDateInfo[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isProofModalOpen, setIsProofModalOpen] = useState(false)

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [proofUrl, setProofUrl] = useState('')

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDueDate, setPaymentDueDate] = useState<Date | undefined>()
  const [paymentNotes, setPaymentNotes] = useState('')

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 15

  const [batchEmployeeIds, setBatchEmployeeIds] = useState<string[]>([])
  const [batchDueDate, setBatchDueDate] = useState<Date | undefined>()

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        month: (selectedMonth + 1).toString(),
        year: selectedYear.toString(),
      })

      if (filterStatus) params.append('status', filterStatus)

      const res = await fetch(`/api/payments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch payments')
      const data = await res.json()
      setPayments(data.payments)
      setPaymentDates(data.paymentsByDate || [])
      setTotalPages(data.pagination.totalPages)
      setTotalItems(data.pagination.total)
    } catch (err) {
      showError('Failed to load payments')
    }
  }, [currentPage, selectedMonth, selectedYear, filterStatus, showError])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?status=approved&limit=1000')
      if (!res.ok) throw new Error('Failed to fetch employees')
      const data = await res.json()
      setEmployees(data.employees || [])
    } catch {
      // Employees are optional for viewing
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    Promise.all([fetchPayments(), fetchEmployees()]).then(() => setIsLoading(false))
  }, [status, fetchPayments, fetchEmployees])

  useEffect(() => {
    if (!isLoading) {
      fetchPayments()
    }
  }, [isLoading, currentPage, selectedMonth, selectedYear, filterStatus, fetchPayments])

  const onCreatePayment = async () => {
    if (!selectedEmployeeId || !paymentAmount || !paymentDueDate) {
      showError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          amount: parseFloat(paymentAmount),
          dueDate: paymentDueDate.toISOString(),
          notes: paymentNotes,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create payment')
      }

      success('Payment created successfully')
      setIsPaymentModalOpen(false)
      setSelectedEmployeeId('')
      setPaymentAmount('')
      setPaymentDueDate(undefined)
      setPaymentNotes('')
      fetchPayments()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onBatchCreate = async () => {
    if (batchEmployeeIds.length === 0 || !batchDueDate) {
      showError('Please select employees and due date')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/payments/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: batchEmployeeIds,
          dueDate: batchDueDate.toISOString(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create batch payments')
      }

      const result = await res.json()
      success(result.message)
      setIsBatchModalOpen(false)
      setBatchEmployeeIds([])
      setBatchDueDate(undefined)
      fetchPayments()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onMarkPaid = async () => {
    if (!selectedPayment) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/payments/${selectedPayment._id}/mark-paid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofUrl: proofUrl || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to mark payment as paid')

      success('Payment marked as paid')
      setIsProofModalOpen(false)
      setSelectedPayment(null)
      setProofUrl('')
      fetchPayments()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onApprovePayment = async (payment: Payment, approved: boolean) => {
    try {
      const res = await fetch(`/api/payments/${payment._id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })

      if (!res.ok) throw new Error('Failed to update payment')

      success(approved ? 'Payment approved' : 'Payment rejected')
      fetchPayments()
    } catch (err) {
      showError('Failed to update payment')
    }
  }

  const openProofModal = (payment: Payment) => {
    setSelectedPayment(payment)
    setProofUrl('')
    setIsProofModalOpen(true)
  }

  const onMonthChange = (month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    setCurrentPage(1)
  }

  const employeeOptions = employees.map((e) => ({
    value: e._id,
    label: `${e.uniqueId} - ${e.name} (${e.salary.toLocaleString()} BDT)`,
  }))

  const toggleBatchEmployee = (id: string) => {
    if (batchEmployeeIds.includes(id)) {
      setBatchEmployeeIds(batchEmployeeIds.filter((i) => i !== id))
    } else {
      setBatchEmployeeIds([...batchEmployeeIds, id])
    }
  }

  const selectAllEmployees = () => {
    if (batchEmployeeIds.length === employees.length) {
      setBatchEmployeeIds([])
    } else {
      setBatchEmployeeIds(employees.map((e) => e._id))
    }
  }

  const calendarHighlights = paymentDates.map((pd) => ({
    date: new Date(pd._id),
    color: pd.pendingCount > 0 ? 'bg-orange-500' : 'bg-green-500',
    count: pd.count,
  }))

  const filteredPayments = payments.filter((payment) => {
    if (!searchQuery) return true
    const emp = payment.employeeId
    return (
      emp?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp?.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>
      case 'approved':
        return <Badge variant="secondary">Awaiting Approval</Badge>
      default:
        return <Badge variant="warning">Pending</Badge>
    }
  }

  const getProviderName = (providedBy: string | { companyName: string }) => {
    if (providedBy === 'masteradmin') return 'Own Staff'
    if (typeof providedBy === 'object' && providedBy.companyName) {
      return providedBy.companyName
    }
    return 'Partner'
  }

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
          <h1 className="text-3xl font-bold">Financial Management</h1>
          <p className="text-muted-foreground">Track payments and financial transactions</p>
        </div>
        {isMasterAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBatchModalOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Batch Pay
            </Button>
            <Button onClick={() => setIsPaymentModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Payment
            </Button>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="payments">
            <FileText className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Records</CardTitle>
                  <CardDescription>
                    {totalItems} payment{totalItems !== 1 ? 's' : ''} for{' '}
                    {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by employee..."
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label>Status</Label>
                      <Select
                        options={[
                          { value: '', label: 'All Status' },
                          { value: 'pending', label: 'Pending' },
                          { value: 'approved', label: 'Awaiting Approval' },
                          { value: 'completed', label: 'Completed' },
                        ]}
                        value={filterStatus}
                        onChange={(v) => {
                          setFilterStatus(v)
                          setCurrentPage(1)
                        }}
                      />
                    </div>
                    <div>
                      <Label>Month</Label>
                      <Select
                        options={Array.from({ length: 12 }, (_, i) => ({
                          value: i.toString(),
                          label: new Date(2000, i).toLocaleDateString('en-US', { month: 'long' }),
                        }))}
                        value={selectedMonth.toString()}
                        onChange={(v) => {
                          setSelectedMonth(parseInt(v))
                          setCurrentPage(1)
                        }}
                      />
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Select
                        options={Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i
                          return { value: year.toString(), label: year.toString() }
                        })}
                        value={selectedYear.toString()}
                        onChange={(v) => {
                          setSelectedYear(parseInt(v))
                          setCurrentPage(1)
                        }}
                      />
                    </div>
                  </div>
                )}

                {filteredPayments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No payments found for this period.
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                          {isMasterAdmin && <TableHead>Provider</TableHead>}
                          <TableHead>Proof</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment._id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{payment.employeeId?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {payment.employeeId?.uniqueId}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">
                                {payment.amount.toLocaleString()} BDT
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(payment.dueDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(payment.status)}</TableCell>
                            {isMasterAdmin && (
                              <TableCell>
                                {payment.employeeId?.providedBy
                                  ? getProviderName(payment.employeeId.providedBy)
                                  : '-'}
                              </TableCell>
                            )}
                            <TableCell>
                              {payment.proofUrl ? (
                                <a
                                  href={payment.proofUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline text-sm"
                                >
                                  View Proof
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-sm">No proof</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {payment.status === 'pending' && (isMasterAdmin || isPartner || isStaff) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openProofModal(payment)}
                                    title="Mark as Paid"
                                  >
                                    <Upload className="h-4 w-4 text-primary" />
                                  </Button>
                                )}
                                {payment.status === 'approved' && isMasterAdmin && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onApprovePayment(payment, true)}
                                      title="Approve"
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onApprovePayment(payment, false)}
                                      title="Reject"
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </>
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

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Payment Calendar</CardTitle>
                <CardDescription>
                  Click on a date to view payments due
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  value={selectedCalendarDate}
                  onChange={(date) => {
                    setSelectedCalendarDate(date)
                  }}
                  highlightedDates={calendarHighlights}
                  onMonthChange={onMonthChange}
                />
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span>All Paid</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedCalendarDate
                    ? `Payments for ${selectedCalendarDate.toLocaleDateString()}`
                    : 'Monthly Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCalendarDate ? (
                  <div className="space-y-4">
                    {payments.filter(
                      (p) =>
                        new Date(p.dueDate).toDateString() ===
                        selectedCalendarDate.toDateString()
                    ).length === 0 ? (
                      <p className="text-muted-foreground">
                        No payments due on this date.
                      </p>
                    ) : (
                      payments
                        .filter(
                          (p) =>
                            new Date(p.dueDate).toDateString() ===
                            selectedCalendarDate.toDateString()
                        )
                        .map((payment) => (
                          <div
                            key={payment._id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{payment.employeeId?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {payment.employeeId?.uniqueId}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-medium">
                                {payment.amount.toLocaleString()} BDT
                              </p>
                              {getStatusBadge(payment.status)}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <span className="font-medium">Total Due</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {payments
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}{' '}
                        BDT
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="font-medium">Payments</span>
                      </div>
                      <p className="text-2xl font-bold">{payments.length}</p>
                      <p className="text-sm text-muted-foreground">
                        {payments.filter((p) => p.status === 'completed').length} completed
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setSelectedEmployeeId('')
          setPaymentAmount('')
          setPaymentDueDate(undefined)
          setPaymentNotes('')
        }}
        title="Create Payment"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select
              options={employeeOptions}
              value={selectedEmployeeId}
              onChange={(id) => {
                setSelectedEmployeeId(id)
                const emp = employees.find((e) => e._id === id)
                if (emp) setPaymentAmount(emp.salary.toString())
              }}
              placeholder="Select employee"
            />
          </div>

          <div>
            <Label>Amount (BDT)</Label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>

          <div>
            <Label>Due Date</Label>
            <DatePicker
              value={paymentDueDate}
              onChange={setPaymentDueDate}
              placeholder="Select due date"
            />
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Input
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Add notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentModalOpen(false)
                setSelectedEmployeeId('')
                setPaymentAmount('')
                setPaymentDueDate(undefined)
                setPaymentNotes('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={onCreatePayment} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false)
          setBatchEmployeeIds([])
          setBatchDueDate(undefined)
        }}
        title="Batch Create Payments"
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select employees to create payment records for. Payments will use each employee's
            current salary.
          </p>

          <div>
            <Label>Due Date</Label>
            <DatePicker
              value={batchDueDate}
              onChange={setBatchDueDate}
              placeholder="Select due date for all payments"
            />
          </div>

          <div className="border rounded-lg">
            <div className="flex items-center justify-between p-3 border-b bg-muted/50">
              <Label className="mb-0">Select Employees</Label>
              <Button variant="outline" size="sm" onClick={selectAllEmployees}>
                {batchEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {employees.map((emp) => (
                <label
                  key={emp._id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={batchEmployeeIds.includes(emp._id)}
                    onChange={() => toggleBatchEmployee(emp._id)}
                    className="rounded"
                  />
                  <span className="flex-1">
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">({emp.uniqueId})</span>
                  </span>
                  <span className="font-mono text-sm">{emp.salary.toLocaleString()} BDT</span>
                </label>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {batchEmployeeIds.length} employee{batchEmployeeIds.length !== 1 ? 's' : ''} selected
            {batchEmployeeIds.length > 0 && (
              <> - Total: {employees
                .filter((e) => batchEmployeeIds.includes(e._id))
                .reduce((sum, e) => sum + e.salary, 0)
                .toLocaleString()} BDT</>
            )}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsBatchModalOpen(false)
                setBatchEmployeeIds([])
                setBatchDueDate(undefined)
              }}
            >
              Cancel
            </Button>
            <Button onClick={onBatchCreate} disabled={isSubmitting || batchEmployeeIds.length === 0}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Create ${batchEmployeeIds.length} Payments`
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isProofModalOpen}
        onClose={() => {
          setIsProofModalOpen(false)
          setSelectedPayment(null)
          setProofUrl('')
        }}
        title="Mark Payment as Paid"
        size="md"
      >
        <div className="space-y-4">
          {selectedPayment && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium">{selectedPayment.employeeId?.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedPayment.employeeId?.uniqueId}
              </p>
              <p className="text-lg font-mono mt-2">
                {selectedPayment.amount.toLocaleString()} BDT
              </p>
            </div>
          )}

          <div>
            <Label>Payment Proof (Optional)</Label>
            <CloudinaryUploader
              value={proofUrl}
              onChange={setProofUrl}
              folder="labor-management/payment-proofs"
              placeholder="Upload payment proof (receipt, screenshot, etc.)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsProofModalOpen(false)
                setSelectedPayment(null)
                setProofUrl('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={onMarkPaid} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as Paid'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
