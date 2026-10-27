import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController.js';
import { validateRequest } from '../middleware/validate.js';
import { createTransactionWithAccountSchema } from '../schemas/index.js';

const router = Router();

// Add transaction direct (with account_id in body)
router.post(
  '/',
  validateRequest({ body: createTransactionWithAccountSchema }),
  TransactionController.addTransactionDirect
);

export default router;
