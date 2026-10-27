# Transaction Ledger REST API Documentation

* **Base URL**: `http://localhost:3000`
* **Interactive Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
* **OpenAPI 3.0 Spec**: [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)

---

## 📌 Standard Response Envelopes

### Successful Response Format
All successful responses return HTTP `200 OK` or `201 Created` with a uniform JSON envelope:
```json
{
  "status": "success",
  "data": { ... }
}
```

### Error Response Format
All client or server errors return a consistent envelope with an error code, message, and optional context details:
```json
{
  "status": "error",
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance. Current balance is 50.00, but requested debit is 100.00.",
    "details": {
      "current_balance": 50,
      "requested_amount": 100
    }
  }
}
```

---

## 🩺 System Endpoints

### 1. Health Check
* **Method & Route**: `GET /health`
* **Description**: Verifies service operational status.
* **Response `200 OK`**:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-28T01:00:00.000Z",
  "service": "Transaction Ledger API"
}
```

---

## 👤 Account Endpoints

### 1. Create Account
* **Method & Route**: `POST /accounts`
* **Description**: Creates a new user account. Initial balance is strictly set to `0.00`. Clients cannot set an initial balance or specify account IDs.
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "name": "Alice Johnson"
}
```
* **Response `201 Created`**:
```json
{
  "status": "success",
  "data": {
    "id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6",
    "name": "Alice Johnson",
    "balance": 0,
    "created_at": "2026-10-28T01:05:00.000Z"
  }
}
```
* **cURL Example**:
```bash
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson"}'
```

---

### 2. Get Account Details
* **Method & Route**: `GET /accounts/:accountId`
* **Description**: Retrieves account information by ID.
* **Path Parameters**:
  * `accountId` (UUID string, required)
* **Response `200 OK`**:
```json
{
  "status": "success",
  "data": {
    "id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6",
    "name": "Alice Johnson",
    "balance": 1500.50,
    "created_at": "2026-10-28T01:05:00.000Z"
  }
}
```
* **Response `404 Not Found`**:
```json
{
  "status": "error",
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account with id 'e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6' was not found."
  }
}
```

---

### 3. Get Account Balance
* **Method & Route**: `GET /accounts/:accountId/balance`
* **Description**: Returns only the balance and identity information for an account.
* **Path Parameters**:
  * `accountId` (UUID string, required)
* **Response `200 OK`**:
```json
{
  "status": "success",
  "data": {
    "account_id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6",
    "name": "Alice Johnson",
    "balance": 1500.50
  }
}
```

---

## 💳 Transaction Endpoints

### 1. Add Transaction to Account
* **Method & Route**: `POST /accounts/:accountId/transactions`
* **Description**: Executes an atomic credit or debit on an account. Requires a unique `reference_id` to guarantee idempotency. Debits that cause negative balances are rejected.
* **Path Parameters**:
  * `accountId` (UUID string, required)
* **Request Body**:
```json
{
  "type": "credit",
  "amount": 250.75,
  "reference_id": "PAYROLL-2026-10-A",
  "description": "October Monthly Salary"
}
```
* **Validation Rules**:
  * `type`: Exactly `"credit"` or `"debit"`.
  * `amount`: Positive number strictly greater than 0, maximum 2 decimal places.
  * `reference_id`: Non-empty string; unique within this account.
  * `description`: Optional string (defaults to `""`).
* **Response `201 Created`**:
```json
{
  "status": "success",
  "data": {
    "id": "8c6fe958-386b-4e6f-a88a-2454a8da427e",
    "account_id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6",
    "type": "credit",
    "amount": 250.75,
    "description": "October Monthly Salary",
    "reference_id": "PAYROLL-2026-10-A",
    "created_at": "2026-10-28T01:10:00.000Z"
  }
}
```
* **Response `409 Conflict` (Duplicate Reference ID)**:
```json
{
  "status": "error",
  "error": {
    "code": "DUPLICATE_REFERENCE_ID",
    "message": "Transaction with reference_id 'PAYROLL-2026-10-A' already exists for account 'e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6'.",
    "details": {
      "reference_id": "PAYROLL-2026-10-A",
      "account_id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6"
    }
  }
}
```
* **cURL Example**:
```bash
curl -X POST http://localhost:3000/accounts/e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 250.75,
    "reference_id": "PAYROLL-2026-10-A",
    "description": "October Monthly Salary"
  }'
```

---

### 2. Direct Transaction Endpoint
* **Method & Route**: `POST /transactions`
* **Description**: Alternative endpoint where `account_id` is passed directly in the JSON request body.
* **Request Body**:
```json
{
  "account_id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6",
  "type": "debit",
  "amount": 50.00,
  "reference_id": "GROCERY-TX-9981",
  "description": "Supermarket purchase"
}
```

---

### 3. Get Account Transaction History
* **Method & Route**: `GET /accounts/:accountId/transactions`
* **Description**: Retrieves paginated transaction history, sorted latest-first (`created_at DESC`), with optional type filtering.
* **Query Parameters**:
  * `type` (optional): `"credit"` or `"debit"`
  * `page` (optional): Integer $\ge 1$ (default: `1`)
  * `limit` (optional): Integer between `1` and `100` (default: `10`)
* **Response `200 OK`**:
```json
{
  "status": "success",
  "data": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 2,
    "total_pages": 1,
    "transactions": [
      {
        "id": "8c6fe958-386b-4e6f-a88a-2454a8da427e",
        "account_id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6",
        "type": "credit",
        "amount": 250.75,
        "description": "October Monthly Salary",
        "reference_id": "PAYROLL-2026-10-A",
        "created_at": "2026-10-28T01:10:00.000Z"
      }
    ]
  }
}
```
* **cURL Example**:
```bash
curl -X GET "http://localhost:3000/accounts/e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6/transactions?type=credit&page=1&limit=10"
```

---

## 🔄 Transfers Endpoint

### 1. Atomic Money Transfer Between Accounts
* **Method & Route**: `POST /transfers`
* **Description**: Atomically transfers funds from `source_account_id` to `destination_account_id`.
  * Uses deterministic pessimistic row locking (`SELECT ... FOR UPDATE`) to prevent deadlocks.
  * Ensures sufficient balance in source account before deducting funds.
  * Automatically creates two matching transaction records: a `debit` on source and a `credit` on destination.
  * Tying transfer record is inserted in the same atomic transaction.
* **Request Body**:
```json
{
  "source_account_id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6",
  "destination_account_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "amount": 100.00,
  "reference_id": "TRF-2026-0001",
  "description": "Dinner split"
}
```
* **Validation Rules**:
  * `source_account_id` must not equal `destination_account_id`.
  * `amount`: Positive number $> 0$, max 2 decimal places.
  * `reference_id`: Unique non-empty string.
* **Response `201 Created`**:
```json
{
  "status": "success",
  "data": {
    "id": "4bf8b2a5-b9b5-4180-a63e-b8ea4cb46995",
    "source_account_id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6",
    "destination_account_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "amount": 100,
    "reference_id": "TRF-2026-0001",
    "description": "Dinner split",
    "source_transaction_id": "4a18a5fa-c335-4ae0-a29d-47fe016a1c1d",
    "destination_transaction_id": "b3f02497-2007-4bf5-b749-8c9df43d4679",
    "created_at": "2026-10-28T01:15:00.000Z"
  }
}
```
* **cURL Example**:
```bash
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "source_account_id": "e2c040d9-7bd4-44b2-a4cb-ec7f0b9576c6",
    "destination_account_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "amount": 100.00,
    "reference_id": "TRF-2026-0001",
    "description": "Dinner split"
  }'
```

---

## ⚠️ Common Error Codes Reference

| HTTP Status | Error Code | Description |
|---|---|---|
| `400 Bad Request` | `VALIDATION_ERROR` | Request payload failed schema checks (e.g., negative amount, extra fields). |
| `400 Bad Request` | `INSUFFICIENT_BALANCE` | Account does not possess enough funds to perform debit or transfer. |
| `400 Bad Request` | `INVALID_TRANSFER_SELF` | Source and destination account IDs in transfer request are identical. |
| `404 Not Found` | `ACCOUNT_NOT_FOUND` | Specified account ID does not exist in the database. |
| `404 Not Found` | `ROUTE_NOT_FOUND` | Requested endpoint path does not exist. |
| `409 Conflict` | `DUPLICATE_REFERENCE_ID` | A transaction or transfer with the provided `reference_id` already exists. |
| `500 Server Error`| `INTERNAL_SERVER_ERROR`| Unhandled server or database connection exception. |
