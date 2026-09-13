import { z } from 'zod';
import { PAGE_REF_PATTERN } from '@/lib/pageRef';

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(80)
  .regex(/^[\p{L}\p{M}\s.'-]+$/u, 'Enter a valid name');

export const checkoutInputSchema = z.object({
  pageRef: z.string().regex(PAGE_REF_PATTERN),
  firstName: nameSchema,
  lastName: nameSchema,
  email: z.string().trim().email().max(254),
  countryCode: z.string().regex(/^\+\d{1,4}$/),
  phone: z.string().trim().regex(/^\d{7,15}$/, 'Enter a valid phone number'),
  note: z.string().trim().max(200).optional().default(''),
  acceptedTerms: z.literal(true),
  selectedItemIds: z.array(z.number().int().positive()).max(50).default([]),
  customValues: z.record(z.string(), z.string().max(200)).default({}),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
