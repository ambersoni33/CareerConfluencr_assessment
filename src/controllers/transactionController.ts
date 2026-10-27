import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transactionService.js';
import { TransactionType } from '../types/index.js';

export class TransactionController {
  /**
   * POST /accounts/:accountId/transactions
   */
  public static async addTransactionForAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.params;
      const { type, amount, description, reference_id } = req.body;

      const transaction = await TransactionService.addTransaction({
        accountId,
        type: type as TransactionType,
        amount: Number(amount),
        description,
        referenceId: reference_id,
      });

      res.status(201).json({
        status: 'success',
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /transactions (alternative endpoint where account_id is in request body)
   */
  public static async addTransactionDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { account_id, type, amount, description, reference_id } = req.body;

      const transaction = await TransactionService.addTransaction({
        accountId: account_id,
        type: type as TransactionType,
        amount: Number(amount),
        description,
        referenceId: reference_id,
      });

      res.status(201).json({
        status: 'success',
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /accounts/:accountId/transactions
   */
  public static async getTransactionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.params;
      const { type, page, limit } = req.query as {
        type?: TransactionType;
        page?: string;
        limit?: string;
      };

      const result = await TransactionService.getTransactions({
        accountId,
        type,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 10,
      });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
