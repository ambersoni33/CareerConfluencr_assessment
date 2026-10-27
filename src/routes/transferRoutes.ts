import { Router } from 'express';
import { TransferController } from '../controllers/transferController.js';
import { validateRequest } from '../middleware/validate.js';
import { createTransferSchema } from '../schemas/index.js';

const router = Router();

// Transfer money atomically between accounts
router.post(
  '/',
  validateRequest({ body: createTransferSchema }),
  TransferController.transferMoney
);

export default router;
