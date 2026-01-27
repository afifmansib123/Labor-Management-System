import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const createPartnerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().min(1, 'Company name is required'),
  companyDetails: z.string().min(1, 'Company details are required'),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
})

export const createEmployeeLevelSchema = z.object({
  levelName: z.string().min(1, 'Level name is required'),
  baseSalary: z.number().positive('Salary must be positive'),
})

export const createEmployeeSchema = z.object({
  uniqueId: z.string().min(1, 'Unique ID is required'),
  name: z.string().min(1, 'Name is required'),
  levelId: z.string().min(1, 'Level is required'),
  salary: z.number().positive('Salary must be positive'),
  nid: z.string().min(1, 'NID is required'),
  details: z.record(z.any()).optional(),
})

export const createRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  pointA: z.string().min(1, 'Start point is required'),
  pointB: z.string().min(1, 'End point is required'),
  operatingDays: z.array(z.string()).min(1, 'Select at least one day'),
  operatingHoursStart: z.string().min(1, 'Start time is required'),
  operatingHoursEnd: z.string().min(1, 'End time is required'),
})

export const createJobSchema = z.object({
  routeId: z.string().min(1, 'Route is required'),
  assignedEmployees: z.array(z.string()).min(1, 'At least one employee must be assigned'),
})

export const createPaymentSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.date(),
  notes: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>
export type CreateEmployeeLevelInput = z.infer<typeof createEmployeeLevelSchema>
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type CreateRouteInput = z.infer<typeof createRouteSchema>
export type CreateJobInput = z.infer<typeof createJobSchema>
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
