# Connect-Ed API Routes

## Base URL

```
Production: https://connect-ed.com/api
Development: http://localhost:3000/api
```

## Authentication

All protected routes require an `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Auth Routes

### POST /api/auth/signup

Create a new school and admin account.

**Request:**
```json
{
  "email": "admin@school.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "..." },
    "school": { "id": "...", "plan": "LITE" },
    "accessToken": "..."
  }
}
```

### POST /api/auth/login

Authenticate a user.

**Request:**
```json
{
  "email": "admin@school.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "ADMIN" },
    "school": { "id": "...", "plan": "GROWTH", "isActive": true },
    "accessToken": "..."
  }
}
```

### POST /api/auth/refresh

Refresh access token using refresh token cookie.

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "..."
  }
}
```

### POST /api/auth/logout

Log out and invalidate refresh token.

**Response:**
```json
{
  "success": true
}
```

### POST /api/auth/forgot-password

Request password reset email.

**Request:**
```json
{
  "email": "admin@school.com"
}
```

### POST /api/auth/reset-password

Reset password with token.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123"
}
```

---

## Payment Routes

### POST /api/payments/create-checkout

Create Dodo Payments checkout session.

**Request:**
```json
{
  "planType": "GROWTH",
  "paymentType": "SIGNUP"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.dodopayments.com/...",
    "sessionId": "session_..."
  }
}
```

### POST /api/webhooks/dodo

Dodo Payments webhook endpoint (no auth required, signature verified).

### GET /api/payments/history

Get school's payment history.

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "...",
        "amount": 750,
        "type": "SIGNUP_FEE",
        "status": "COMPLETED",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

## Student Routes

### GET /api/students

List all students (with pagination and filters).

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` (optional)
- `classId` (optional)
- `status` (optional: active/inactive)

**Response:**
```json
{
  "success": true,
  "data": {
    "students": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### GET /api/students/:id

Get a single student.

### POST /api/students

Create a new student.

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "2015-05-15",
  "gender": "FEMALE",
  "admissionNumber": "STU-2024-001",
  "classId": "class_id",
  "parentId": "parent_id"
}
```

### PATCH /api/students/:id

Update a student.

### DELETE /api/students/:id

Soft delete a student (set isActive: false).

---

## Fee Routes

### GET /api/fees

List fees with filters.

**Query Parameters:**
- `studentId` (optional)
- `status` (optional: PENDING/PARTIAL/PAID/OVERDUE)
- `dateFrom` (optional)
- `dateTo` (optional)

### GET /api/fees/:id

Get fee details with payments.

### POST /api/fees

Create a new fee.

**Request:**
```json
{
  "studentId": "student_id",
  "amount": 500,
  "description": "Term 1 Tuition",
  "dueDate": "2024-02-15"
}
```

### POST /api/fees/:id/payments

Record a payment for a fee.

**Request:**
```json
{
  "amount": 250,
  "paymentMethod": "CASH",
  "reference": "RCP-001",
  "notes": "Partial payment"
}
```

### POST /api/fees/reminders

Send fee reminders.

**Request:**
```json
{
  "feeIds": ["fee_1", "fee_2"],
  "channels": ["EMAIL", "WHATSAPP"]
}
```

---

## Class Routes (Growth+ Plans)

### GET /api/classes

List all classes.

### GET /api/classes/:id

Get class with students.

### POST /api/classes

Create a new class.

**Request:**
```json
{
  "name": "Grade 5A",
  "classTeacherId": "teacher_id"
}
```

### PATCH /api/classes/:id

Update a class.

### POST /api/classes/:id/students

Add students to a class.

**Request:**
```json
{
  "studentIds": ["student_1", "student_2"]
}
```

---

## Teacher Routes (Growth+ Plans)

### GET /api/teachers

List all teachers.

### POST /api/teachers

Create a new teacher account.

**Request:**
```json
{
  "email": "teacher@school.com",
  "password": "TempPass123",
  "name": "Mr. Smith"
}
```

---

## Expense Routes

### GET /api/expenses

List expenses with filters.

**Query Parameters:**
- `category` (optional)
- `dateFrom` (optional)
- `dateTo` (optional)

### POST /api/expenses

Create a new expense.

**Request:**
```json
{
  "amount": 150,
  "category": "Supplies",
  "description": "Classroom materials",
  "date": "2024-01-20"
}
```

---

## Report Routes

### GET /api/reports/financial

Get financial summary report.

**Query Parameters:**
- `period` (monthly/quarterly/yearly)
- `dateFrom`
- `dateTo`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFeesExpected": 50000,
    "totalFeesCollected": 42000,
    "totalExpenses": 15000,
    "netIncome": 27000,
    "collectionRate": 84,
    "breakdown": {
      "byMonth": [...],
      "byClass": [...]
    }
  }
}
```

### GET /api/reports/students

Get student statistics report.

### GET /api/reports/fees/outstanding

Get outstanding fees report.

---

## School Settings Routes

### GET /api/settings

Get school settings.

### PATCH /api/settings

Update school settings.

### POST /api/settings/users

Create new user (receptionist/teacher).

### DELETE /api/settings/users/:id

Deactivate a user.

---

## Message Routes

### GET /api/messages/quota

Get current messaging quota status.

**Response:**
```json
{
  "success": true,
  "data": {
    "email": { "used": 150, "limit": 500 },
    "whatsapp": { "used": 80, "limit": 500 },
    "sms": { "used": 45, "limit": 300 }
  }
}
```

### GET /api/messages/history

Get message send history.

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `QUOTA_EXCEEDED` | 429 | Message quota exceeded |
| `PAYMENT_REQUIRED` | 402 | School payment overdue |
| `PLAN_UPGRADE_REQUIRED` | 403 | Feature not in current plan |
| `INTERNAL_ERROR` | 500 | Server error |
