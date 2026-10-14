import { z } from 'zod';
import { ClientStatus } from '@prisma/client';
import {
  TicketType,
  TicketCategory,
  TicketPriority,
  TicketSource,
  AssignmentType,
  EscalationLevel,
} from '@prisma/client';
import { EmploymentType, LeaveType } from '@prisma/client';

/**
 * Schemas for all stubs-controller input validation.
 * Each schema is exported so controllers can use it with the ZodValidationPipe.
 */

// --- Common / Shared ---

export const RefreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export type RefreshInput = z.infer<typeof RefreshSchema>;

export const ExchangeCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

export type ExchangeCodeInput = z.infer<typeof ExchangeCodeSchema>;

export const GenerateExchangeCodeSchema = z.object({
  redirectUrl: z
    .string()
    .url('Invalid redirect URL')
    .min(1, 'Redirect URL is required'),
});

export type GenerateExchangeCodeInput = z.infer<
  typeof GenerateExchangeCodeSchema
>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// --- CRM / Leads ---

export const CreateLeadSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().email('invalid email'),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  stage: z.string().optional(),
  value: z.number().optional(),
  estimatedValue: z.number().optional(),
  notes: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const CreateSubmissionSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().email('invalid email'),
  phone: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, 'message is required'),
  source: z.string().optional(),
  organizationId: z.string().optional(),
});

export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

export const MoveLeadStageSchema = z.object({
  stage: z.string().min(1, 'stage is required'),
});

export type MoveLeadStageInput = z.infer<typeof MoveLeadStageSchema>;

export const CreateClientSchema = z.object({
  name: z.string().min(1).max(255),
  companyName: z.string().max(255).optional(),
  email: z
    .string()
    .email('invalid email')
    .min(1)
    .max(255)
    .transform((val) => val.toLowerCase().trim()),
  phone: z
    .string()
    .regex(/^[+]?[\d\s-()]{10,20}$/, 'Invalid phone number')
    .optional(),
  address: z.string().max(500).optional(),
  gstNumber: z.string().max(50).optional(),
  status: z.nativeEnum(ClientStatus).optional(),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;

// --- Helpdesk Tickets ---

export const CreateTicketSchema = z.object({
  title: z.string().min(4, 'Title must be at least 4 characters').max(200),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(20000),
  type: z.nativeEnum(TicketType).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  source: z.nativeEnum(TicketSource).optional(),
  projectId: z.string().uuid('Invalid project ID').optional(),
  departmentId: z.string().uuid('Invalid department ID').optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

export const UpdateTicketSchema = z.object({
  title: z.string().min(4).max(200).optional(),
  description: z.string().min(10).max(20000).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  projectId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;

export const TicketAssignmentInputSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  type: z.nativeEnum(AssignmentType).optional(),
});

export type TicketAssignmentInput = z.infer<typeof TicketAssignmentInputSchema>;

export const AssignTicketSchema = z.object({
  primary: z.array(TicketAssignmentInputSchema).optional(),
  supporting: z.array(TicketAssignmentInputSchema).optional(),
  replaceAll: z.boolean().optional(),
});

export type AssignTicketInput = z.infer<typeof AssignTicketSchema>;

export const UnassignTicketSchema = z.object({
  assignmentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  reason: z.string().max(1000).optional(),
});

export type UnassignTicketInput = z.infer<typeof UnassignTicketSchema>;

export const AddCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  isInternal: z.boolean().optional().default(false),
});

export type AddCommentInput = z.infer<typeof AddCommentSchema>;

export const AddAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().min(1).max(2000).url('Invalid file URL'),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(3).max(100),
});

export type AddAttachmentInput = z.infer<typeof AddAttachmentSchema>;

export const SubmitResolutionSchema = z.object({
  resolution: z.string().min(10).max(20000),
});

export type SubmitResolutionInput = z.infer<typeof SubmitResolutionSchema>;

export const VerifyResolutionSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().max(5000).optional(),
});

export type VerifyResolutionInput = z.infer<typeof VerifyResolutionSchema>;

export const ReopenTicketSchema = z.object({
  reason: z.string().min(5).max(5000),
});

export type ReopenTicketInput = z.infer<typeof ReopenTicketSchema>;

export const CloseTicketSchema = z.object({
  note: z.string().max(2000).optional(),
});

export type CloseTicketInput = z.infer<typeof CloseTicketSchema>;

export const CloseOverrideSchema = z.object({
  reason: z.string().min(10).max(2000),
});

export type CloseOverrideInput = z.infer<typeof CloseOverrideSchema>;

export const CancelTicketSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export type CancelTicketInput = z.infer<typeof CancelTicketSchema>;

export const EscalateTicketSchema = z.object({
  level: z.nativeEnum(EscalationLevel),
  reason: z.string().min(5).max(2000),
});

export type EscalateTicketInput = z.infer<typeof EscalateTicketSchema>;

export const ClearEscalationSchema = z.object({
  note: z.string().max(2000).optional(),
});

export type ClearEscalationInput = z.infer<typeof ClearEscalationSchema>;

export const TicketQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  assignedAgentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  search: z.string().optional(),
  slaState: z.enum(['breached', 'warning', 'paused']).optional(),
  escalatedOnly: z.string().optional(),
  scope: z.enum(['mine', 'assigned', 'unassigned', 'all']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type TicketQueryInput = z.infer<typeof TicketQuerySchema>;

// --- Billing ---

export const CreateInvoiceSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  projectId: z.string().optional(),
  quoteId: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        total: z.number().nonnegative(),
      }),
    )
    .min(1, 'items must contain at least one line'),
  subtotal: z.number().nonnegative(),
  gstPercentage: z.number().nonnegative().default(18),
  gstAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  dueDate: z.string().or(z.date()),
  notes: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const RecordPaymentSchema = z.object({
  amount: z.number().positive('amount must be positive'),
  method: z.string().min(1, 'method is required'),
  transactionRef: z.string().optional(),
  paidAt: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

// --- Projects ---

export const CreateTaskSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedToId: z.string().optional(),
  dueDate: z.string().or(z.date()).optional(),
  sprintId: z.string().optional(),
  order: z.number().int().nonnegative().default(0),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const MoveTaskSchema = z.object({
  status: z.string().min(1, 'status is required'),
  order: z.number().int().nonnegative().optional(),
});

export type MoveTaskInput = z.infer<typeof MoveTaskSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Client ID is required'),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  budget: z.number().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const AddMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['lead', 'member', 'viewer']).optional().default('member'),
});

export type AddMemberInput = z.infer<typeof AddMemberSchema>;

// --- Automation ---

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'name is required'),
  triggerType: z.string().min(1, 'triggerType is required'),
  triggerConfig: z.record(z.string(), z.unknown()),
  actions: z
    .array(
      z.object({
        type: z.string().min(1),
        config: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1, 'actions must contain at least one step'),
});

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;

// --- AI ---

export const GenerateProposalSchema = z.object({
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  requirements: z.string().min(1, 'requirements is required'),
});

export type GenerateProposalInput = z.infer<typeof GenerateProposalSchema>;

// --- HR ---

export const CreateEmployeeSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  departmentId: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().or(z.date()),
  employmentType: z.nativeEnum(EmploymentType).optional(),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

export const CreateLeaveSchema = z.object({
  type: z.nativeEnum(LeaveType),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  reason: z.string().optional(),
});

export type CreateLeaveInput = z.infer<typeof CreateLeaveSchema>;
