import { z } from 'zod';

/**
 * Common validation schemas used across DTOs
 */

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .max(255, 'Email is too long')
  .transform((val) => val.toLowerCase().trim());

export const phoneSchema = z
  .string()
  .regex(/^[+]?[\d\s-()]{10,20}$/, 'Invalid phone number')
  .optional();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
    },
  );

export const statusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
  'PENDING',
  'COMPLETED',
  'CANCELLED',
]);

export const moneySchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid monetary value')
  .transform((val) => parseFloat(val))
  .or(z.number().positive());

export const urlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL is too long')
  .optional();
