import { z } from 'zod';

/**
 * Schemas for all stubs-controller input validation.
 * Each schema is exported so controllers can use it with the ZodValidationPipe.
 */

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

// --- Helpdesk ---

export const CreateTicketSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().min(1, 'description is required'),
  type: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

export const SendTicketMessageSchema = z.object({
  content: z.string().min(1, 'content is required'),
  isInternal: z.boolean().optional().default(false),
});

export type SendTicketMessageInput = z.infer<typeof SendTicketMessageSchema>;