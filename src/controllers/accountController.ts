import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/accountService.js';

export class AccountController {
  public static async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.body;
      const account = await AccountService.createAccount(name);
      res.status(201).json({
        status: 'success',
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.params;
      const account = await AccountService.getAccountById(accountId);
      res.status(200).json({
        status: 'success',
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAccountBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.params;
      const balanceData = await AccountService.getAccountBalance(accountId);
      res.status(200).json({
        status: 'success',
        data: balanceData,
      });
    } catch (error) {
      next(error);
    }
  }
}
