import { Request, Response, NextFunction } from 'express';
import { TransferService } from '../services/transferService.js';

export class TransferController {
  /**
   * POST /transfers
   */
  public static async transferMoney(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { source_account_id, destination_account_id, amount, reference_id, description } = req.body;

      const transfer = await TransferService.transferMoney({
        sourceAccountId: source_account_id,
        destinationAccountId: destination_account_id,
        amount: Number(amount),
        referenceId: reference_id,
        description,
      });

      res.status(201).json({
        status: 'success',
        data: transfer,
      });
    } catch (error) {
      next(error);
    }
  }
}
