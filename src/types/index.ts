export type TransactionType = 'credit' | 'debit';

export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface Transfer {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  reference_id: string;
  description: string;
  source_transaction_id: string;
  destination_transaction_id: string;
  created_at: string;
}

export interface PaginationResult<T> {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  transactions: T[];
}

export interface ErrorResponse {
  status: 'error';
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
