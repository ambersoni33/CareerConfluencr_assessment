import { z } from 'zod';

export const accountIdParamSchema = z.object({
  accountId: z.string().trim().min(1, 'Account ID is required.'),
});

export const createAccountSchema = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .trim()
    .min(1, 'Name cannot be empty or whitespace only.'),
}).strict({
  message: 'Unexpected fields provided. The client is not allowed to set initial balance or identifiers.',
});

export const createTransactionSchema = z.object({
  type: z.enum(['credit', 'debit'], {
    errorMap: () => ({ message: "Transaction type must be either 'credit' or 'debit'." }),
  }),
  amount: z
    .number({
      required_error: 'Amount is required.',
      invalid_type_error: 'Amount must be a numeric value.',
    })
    .positive('Amount must be strictly greater than 0.')
    .refine((val) => Number.isFinite(val) && Math.round(val * 100) / 100 === Number(val.toFixed(2)), {
      message: 'Amount cannot have more than 2 decimal places.',
    }),
  description: z.string().optional().default(''),
  reference_id: z
    .string({ required_error: 'reference_id is required.' })
    .trim()
    .min(1, 'reference_id cannot be empty or whitespace only.'),
}).strict();

export const createTransactionWithAccountSchema = createTransactionSchema.extend({
  account_id: z.string().trim().min(1, 'account_id is required in request body.'),
}).strict();

export const getTransactionsQuerySchema = z.object({
  type: z
    .enum(['credit', 'debit'], {
      errorMap: () => ({ message: "Filter type must be either 'credit' or 'debit'." }),
    })
    .optional(),
  page: z.coerce
    .number({ invalid_type_error: 'Page must be a valid number.' })
    .int('Page must be an integer.')
    .min(1, 'Page must be greater than or equal to 1.')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be a valid number.' })
    .int('Limit must be an integer.')
    .min(1, 'Limit must be greater than or equal to 1.')
    .max(100, 'Limit cannot exceed 100.')
    .default(10),
});

export const createTransferSchema = z
  .object({
    source_account_id: z.string().trim().min(1, 'source_account_id is required.'),
    destination_account_id: z.string().trim().min(1, 'destination_account_id is required.'),
    amount: z
      .number({
        required_error: 'Amount is required.',
        invalid_type_error: 'Amount must be a numeric value.',
      })
      .positive('Amount must be strictly greater than 0.')
      .refine((val) => Number.isFinite(val) && Math.round(val * 100) / 100 === Number(val.toFixed(2)), {
        message: 'Amount cannot have more than 2 decimal places.',
      }),
    reference_id: z
      .string({ required_error: 'reference_id is required.' })
      .trim()
      .min(1, 'reference_id cannot be empty.'),
    description: z.string().optional().default(''),
  })
  .strict()
  .refine((data) => data.source_account_id !== data.destination_account_id, {
    message: 'Source and destination accounts must be different.',
    path: ['destination_account_id'],
  });
