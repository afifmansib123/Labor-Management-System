'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Copy, Eye, EyeOff, Loader2, Search } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Pagination, PaginationInfo } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'

const partnerFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  companyName: z.string().min(1, 'Company name is required'),
  companyDetails: z.string().min(1, 'Company details are required'),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
})

type PartnerFormData = z.infer<typeof partnerFormSchema>

interface Partner {
  _id: string
  userId: {
    _id: string
    email: string
    createdAt: string
  }
  companyName: string
  companyDetails: string
  contactPerson?: string
  contactPhone?: string
  createdAt: string
}

interface NewPartnerCredentials {
  email: string
  password: string
}

export default function PartnersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success, error: showError } = useToast()

  const [partners, setPartners] = useState<Partner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [deletingPartner, setDeletingPartner] = useState<Partner | null>(null)
  const [newCredentials, setNewCredentials] = useState<NewPartnerCredentials | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerFormSchema),
  })

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch('/api/partners')
      if (!res.ok) throw new Error('Failed to fetch partners')
      const data = await res.json()
      setPartners(data)
    } catch (err) {
      showError('Failed to load partners')
    } finally {
      setIsLoading(false)
    }
  }, [showError])

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'masteradmin') {
      router.push('/dashboard')
      return
    }
    fetchPartners()
  }, [session, status, router, fetchPartners])

  const onSubmit = async (data: PartnerFormData) => {
    setIsSubmitting(true)
    try {
      if (editingPartner) {
        const res = await fetch(`/api/partners/${editingPartner._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: data.companyName,
            companyDetails: data.companyDetails,
            contactPerson: data.contactPerson,
            contactPhone: data.contactPhone,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to update partner')
        }

        success('Partner updated successfully')
      } else {
        const res = await fetch('/api/partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: autoGeneratePassword ? undefined : data.password,
            companyName: data.companyName,
            companyDetails: data.companyDetails,
            contactPerson: data.contactPerson,
            contactPhone: data.contactPhone,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to create partner')
        }

        const result = await res.json()
        setNewCredentials(result.credentials)
        setIsCredentialsModalOpen(true)
        success('Partner created successfully')
      }

      setIsModalOpen(false)
      setEditingPartner(null)
      reset()
      fetchPartners()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingPartner) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/partners/${deletingPartner._id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete partner')

      success('Partner deleted successfully')
      setIsDeleteModalOpen(false)
      setDeletingPartner(null)
      fetchPartners()
    } catch (err) {
      showError('Failed to delete partner')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (partner: Partner) => {
    setEditingPartner(partner)
    reset({
      email: partner.userId.email,
      companyName: partner.companyName,
      companyDetails: partner.companyDetails,
      contactPerson: partner.contactPerson || '',
      contactPhone: partner.contactPhone || '',
    })
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingPartner(null)
    reset({
      email: '',
      password: '',
      companyName: '',
      companyDetails: '',
      contactPerson: '',
      contactPhone: '',
    })
    setAutoGeneratePassword(true)
    setIsModalOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    success('Copied to clipboard')
  }

  const filteredPartners = partners.filter(
    (partner) =>
      partner.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.userId.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredPartners.length / itemsPerPage)
  const paginatedPartners = filteredPartners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session || session.user.role !== 'masteradmin') {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Management</h1>
          <p className="text-muted-foreground">Manage labor supply partners</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Partner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
          <CardDescription>
            {partners.length} partner{partners.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search partners..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
            </div>
          </div>

          {paginatedPartners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? 'No partners found matching your search' : 'No partners yet. Add your first partner to get started.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Contact Phone</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPartners.map((partner) => (
                    <TableRow key={partner._id}>
                      <TableCell className="font-medium">
                        {partner.companyName}
                      </TableCell>
                      <TableCell>{partner.userId.email}</TableCell>
                      <TableCell>{partner.contactPerson || '-'}</TableCell>
                      <TableCell>{partner.contactPhone || '-'}</TableCell>
                      <TableCell>
                        {new Date(partner.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(partner)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingPartner(partner)
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

              {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <PaginationInfo
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredPartners.length}
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
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingPartner(null)
          reset()
        }}
        title={editingPartner ? 'Edit Partner' : 'Add New Partner'}
        description={
          editingPartner
            ? 'Update partner details'
            : 'Create a new partner account with credentials'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!editingPartner && (
            <>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="partner@company.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="password">Password</Label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoGeneratePassword}
                      onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                      className="rounded"
                    />
                    Auto-generate
                  </label>
                </div>
                {!autoGeneratePassword && (
                  <>
                    <Input
                      id="password"
                      type="password"
                      {...register('password')}
                      placeholder="Enter password"
                    />
                    {errors.password && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </>
                )}
                {autoGeneratePassword && (
                  <p className="text-sm text-muted-foreground">
                    A secure password will be generated automatically
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              {...register('companyName')}
              placeholder="ABC Transport Ltd"
            />
            {errors.companyName && (
              <p className="text-sm text-red-500 mt-1">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="companyDetails">Company Details</Label>
            <Textarea
              id="companyDetails"
              {...register('companyDetails')}
              placeholder="Brief description of the company and services..."
              rows={3}
            />
            {errors.companyDetails && (
              <p className="text-sm text-red-500 mt-1">
                {errors.companyDetails.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                {...register('contactPerson')}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                {...register('contactPhone')}
                placeholder="+880 1700 000000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                setEditingPartner(null)
                reset()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingPartner ? 'Updating...' : 'Creating...'}
                </>
              ) : editingPartner ? (
                'Update Partner'
              ) : (
                'Create Partner'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeletingPartner(null)
        }}
        onConfirm={handleDelete}
        title="Delete Partner"
        message={`Are you sure you want to delete "${deletingPartner?.companyName}"? This will also delete their user account and cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isSubmitting}
      />

      <Modal
        isOpen={isCredentialsModalOpen}
        onClose={() => {
          setIsCredentialsModalOpen(false)
          setNewCredentials(null)
        }}
        title="Partner Credentials"
        description="Save these credentials - the password will not be shown again!"
        size="md"
      >
        {newCredentials && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">
                Important: Save these credentials now!
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                The password cannot be retrieved later. Share these securely with the partner.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={newCredentials.email} readOnly className="bg-muted" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newCredentials.email)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newCredentials.password}
                    readOnly
                    className="bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newCredentials.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  setIsCredentialsModalOpen(false)
                  setNewCredentials(null)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
