# High-Integrity Transaction Ledger REST API

A production-ready, ACID-compliant Transaction Ledger REST API built with **Node.js**, **TypeScript**, **Express**, and **PostgreSQL**.

Designed for financial integrity, high concurrency, strict idempotency, and automated audit logging.

---

## 🌟 Key Features

* **Zero-Initial Balance**: Accounts strictly initialize with a balance of `0.00`. Clients cannot specify starting balances; all funding must occur via explicit credit ledger transactions.
* **ACID Transactions**: Financial operations run in atomic PostgreSQL transaction blocks (`BEGIN` / `COMMIT` / `ROLLBACK`). If any step fails, changes are completely rolled back.
* **Deterministic Concurrency & Deadlock Prevention**: Account rows are locked using pessimistic locking (`SELECT ... FOR UPDATE`) sorted in deterministic order (`[source_id, dest_id].sort()`), preventing deadlocks during simultaneous cross-account transfers.
* **Strict Balance Invariant**: Enforced both at the application level and at the database level (`CHECK (balance >= 0.00)`). Accounts can never become negative.
* **Idempotency & Deduplication**: Clients provide a unique `reference_id` per operation. Duplicate requests are rejected with `409 Conflict` without double-debiting or double-crediting.
* **Immutable Double-Entry Transfers**: Inter-account transfers atomically produce a debit transaction on the source, a credit transaction on the destination, and a linking transfer record.
* **Arbitrary Precision Arithmetic**: Uses PostgreSQL `NUMERIC(15, 2)` to eliminate floating-point rounding errors typical of standard binary floats.
* **Comprehensive Documentation**: Interactive Swagger UI documentation served live at `/docs`.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime & Language** | Node.js (v20+ / v22+ / v23+) & TypeScript 5 | Type-safe enterprise JavaScript runtime |
| **Framework** | Express 4 | Fast, unopinionated HTTP routing and middleware |
| **Database** | PostgreSQL 16+ / 18+ with `pg` connection pool | Relational ACID database with row-level locking |
| **Validation** | Zod 3 | Runtime schema validation and sanitization |
| **Documentation** | Swagger UI (`swagger-ui-express`) & OpenAPI 3.0 | Live, interactive API exploration and testing |
| **Testing** | Jest 29, `ts-jest`, & Supertest 7 | Integration and end-to-end HTTP test runner |

### Project Structure

```
├── src/
│   ├── app.ts                  # Express application factory & middleware setup
│   ├── index.ts                # Server startup & graceful shutdown lifecycle
│   ├── config/                 # Environment configuration loader
│   ├── controllers/            # HTTP request controllers (Account, Transaction, Transfer)
│   ├── db/                     # PostgreSQL connection pool, migrations, and runTransaction
│   ├── docs/                   # OpenAPI 3.0 specification definition
│   ├── errors/                 # Standardized AppError hierarchy (400, 404, 409, 500)
│   ├── middleware/             # Validation (Zod) and centralized error handling
│   ├── routes/                 # Express routing modularization
│   ├── schemas/                # Request validation schemas
│   ├── services/               # Core business logic and database query execution
│   └── types/                  # TypeScript interface definitions
├── tests/                      # Jest test suites
├── .env.example                # Example environment variables
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites

* **Node.js** (v20.x or higher; tested on v23.11)
* **PostgreSQL** (v15 or higher; running locally or via Docker)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd CareerConfluencr
npm install
```

### 3. Environment Configuration

Copy the sample environment file:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
PORT=3000
NODE_ENV=development

# PostgreSQL Connection
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/careerconfluencr
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=careerconfluencr
```

> **Note**: The application automatically checks for and creates the target database (`careerconfluencr`) and schema tables upon first boot.

### 4. Running the Application

* **Development Mode** (with hot reload):
  ```bash
  npm run dev
  ```

* **Production Build**:
  ```bash
  npm run build
  npm start
  ```

The server will start on `http://localhost:3000`.

---

## 📖 API Documentation & Testing

* **Interactive Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
* **Raw OpenAPI Specification**: [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)
* **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)
* **Markdown Reference**: See [API_DOCUMENTATION.md](file:///c:/Users/Amber/OneDrive/Desktop/CareerConfluencr/API_DOCUMENTATION.md) for detailed endpoint schemas, payload formats, and curl commands.
* **Assumptions & Invariants**: See [ASSUMPTIONS.md](file:///c:/Users/Amber/OneDrive/Desktop/CareerConfluencr/ASSUMPTIONS.md) for architectural and business decisions.

### Running Automated Tests

Run the test suite using Jest and Supertest:

```bash
npm test
```

---

## 🔒 Security & Concurrency Design

1. **Pessimistic Locking**: All write operations against accounts acquire `SELECT ... FOR UPDATE` locks within transaction blocks to avoid read-modify-write race conditions.
2. **Deterministic Locking Sequence**: When transferring between two accounts, row locks are always acquired in ascending lexicographical order of account IDs (`accountA < accountB`), mathematically preventing circular wait deadlocks.
3. **Defense-in-Depth Validation**: Request parameters are validated and stripped using Zod before reaching controllers, and verified against database constraints (`CHECK` clauses) upon insertion.
