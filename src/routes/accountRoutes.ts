import { Router } from 'express';
import { AccountController } from '../controllers/accountController.js';
import { TransactionController } from '../controllers/transactionController.js';
import { validateRequest } from '../middleware/validate.js';
import {
  accountIdParamSchema,
  createAccountSchema,
  createTransactionSchema,
  getTransactionsQuerySchema,
} from '../schemas/index.js';

const router = Router();

// Create account
router.post(
  '/',
  validateRequest({ body: createAccountSchema }),
  AccountController.createAccount
);

// Get account details
router.get(
  '/:accountId',
  validateRequest({ params: accountIdParamSchema }),
  AccountController.getAccount
);

// Get account balance
router.get(
  '/:accountId/balance',
  validateRequest({ params: accountIdParamSchema }),
  AccountController.getAccountBalance
);

// Add transaction to account
router.post(
  '/:accountId/transactions',
  validateRequest({ params: accountIdParamSchema, body: createTransactionSchema }),
  TransactionController.addTransactionForAccount
);

// Get transaction history
router.get(
  '/:accountId/transactions',
  validateRequest({ params: accountIdParamSchema, query: getTransactionsQuerySchema }),
  TransactionController.getTransactionHistory
);

export default router;
