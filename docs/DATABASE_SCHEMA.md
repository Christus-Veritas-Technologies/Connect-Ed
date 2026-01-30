# Connect-Ed Database Schema

## Overview

The database uses PostgreSQL with Prisma ORM. All entities are scoped to a school (multi-tenant architecture).

## Enums

```prisma
enum Plan {
  LITE
  GROWTH
  ENTERPRISE
}

enum Role {
  ADMIN
  RECEPTIONIST
  TEACHER
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum FeeStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  ONLINE
}

enum PaymentType {
  SIGNUP_FEE
  TERM_PAYMENT
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
}

enum MessageType {
  EMAIL
  WHATSAPP
  SMS
}

enum MessageStatus {
  PENDING
  SENT
  FAILED
}
```

## Models

### School

```prisma
model School {
  id              String    @id @default(cuid())
  name            String?
  plan            Plan      @default(LITE)
  isActive        Boolean   @default(false)
  signupFeePaid   Boolean   @default(false)
  onboardingComplete Boolean @default(false)
  
  // Analytics
  studentCount    Int?
  teacherCount    Int?
  
  // Messaging quotas (reset monthly)
  emailQuota      Int       @default(200)
  whatsappQuota   Int       @default(200)
  smsQuota        Int       @default(100)
  emailUsed       Int       @default(0)
  whatsappUsed    Int       @default(0)
  smsUsed         Int       @default(0)
  quotaResetDate  DateTime  @default(now())
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  users           User[]
  students        Student[]
  parents         Parent[]
  classes         Class[]
  subjects        Subject[]
  fees            Fee[]
  feePayments     FeePayment[]
  expenses        Expense[]
  schoolPayments  SchoolPayment[]
  messageLogs     MessageLog[]
  
  @@map("schools")
}
```

### User

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  password        String
  name            String
  role            Role
  isActive        Boolean   @default(true)
  tokenVersion    Int       @default(0)  // For refresh token invalidation
  
  // Password reset
  resetToken      String?
  resetTokenExpiry DateTime?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  schoolId        String
  school          School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  // As class teacher
  classes         Class[]   @relation("ClassTeacher")
  
  // Recorded payments/expenses
  recordedPayments FeePayment[] @relation("ReceivedBy")
  recordedExpenses Expense[]    @relation("RecordedBy")
  
  @@index([schoolId])
  @@index([email])
  @@map("users")
}
```

### Student

```prisma
model Student {
  id              String    @id @default(cuid())
  firstName       String
  lastName        String
  dateOfBirth     DateTime?
  gender          Gender?
  admissionNumber String
  admissionDate   DateTime  @default(now())
  isActive        Boolean   @default(true)
  
  // Contact (optional, for direct student communication in Enterprise)
  email           String?
  phone           String?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  schoolId        String
  school          School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  classId         String?
  class           Class?    @relation(fields: [classId], references: [id], onDelete: SetNull)
  
  parentId        String?
  parent          Parent?   @relation(fields: [parentId], references: [id], onDelete: SetNull)
  
  fees            Fee[]
  
  @@unique([schoolId, admissionNumber])
  @@index([schoolId])
  @@index([classId])
  @@index([parentId])
  @@map("students")
}
```

### Parent

```prisma
model Parent {
  id              String    @id @default(cuid())
  email           String    @unique
  password        String
  name            String
  phone           String?
  isActive        Boolean   @default(true)
  tokenVersion    Int       @default(0)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  schoolId        String
  school          School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  children        Student[]
  
  @@index([schoolId])
  @@map("parents")
}
```

### Class

```prisma
model Class {
  id              String    @id @default(cuid())
  name            String
  isActive        Boolean   @default(true)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  schoolId        String
  school          School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  classTeacherId  String?
  classTeacher    User?     @relation("ClassTeacher", fields: [classTeacherId], references: [id], onDelete: SetNull)
  
  students        Student[]
  subjects        SubjectClass[]
  
  @@unique([schoolId, name])
  @@index([schoolId])
  @@map("classes")
}
```

### Subject

```prisma
model Subject {
  id              String    @id @default(cuid())
  name            String
  code            String?
  isActive        Boolean   @default(true)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  schoolId        String
  school          School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  classes         SubjectClass[]
  
  @@unique([schoolId, name])
  @@index([schoolId])
  @@map("subjects")
}
```

### SubjectClass (Many-to-Many)

```prisma
model SubjectClass {
  id              String    @id @default(cuid())
  
  subjectId       String
  subject         Subject   @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  
  classId         String
  class           Class     @relation(fields: [classId], references: [id], onDelete: Cascade)
  
  @@unique([subjectId, classId])
  @@map("subject_classes")
}
```

### Fee

```prisma
model Fee {
  id              String    @id @default(cuid())
  amount          Decimal   @db.Decimal(10, 2)
  description     String
  dueDate         DateTime
  status          FeeStatus @default(PENDING)
  paidAmount      Decimal   @default(0) @db.Decimal(10, 2)
  paidAt          DateTime?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  schoolId        String
  school          School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  studentId       String
  student         Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  payments        FeePayment[]
  
  @@index([schoolId])
  @@index([studentId])
  @@index([status])
  @@index([dueDate])
  @@map("fees")
}
```

### FeePayment

```prisma
model FeePayment {
  id              String        @id @default(cuid())
  amount          Decimal       @db.Decimal(10, 2)
  paymentMethod   PaymentMethod
  reference       String?
  notes           String?
  
  // Timestamps
  createdAt       DateTime      @default(now())
  
  // Relations
  schoolId        String
  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  feeId           String
  fee             Fee           @relation(fields: [feeId], references: [id], onDelete: Cascade)
  
  receivedById    String
  receivedBy      User          @relation("ReceivedBy", fields: [receivedById], references: [id])
  
  @@index([schoolId])
  @@index([feeId])
  @@map("fee_payments")
}
```

### Expense

```prisma
model Expense {
  id              String    @id @default(cuid())
  amount          Decimal   @db.Decimal(10, 2)
  category        String
  description     String
  date            DateTime
  receiptUrl      String?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  schoolId        String
  school          School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  recordedById    String
  recordedBy      User      @relation("RecordedBy", fields: [recordedById], references: [id])
  
  @@index([schoolId])
  @@index([date])
  @@index([category])
  @@map("expenses")
}
```

### SchoolPayment

```prisma
model SchoolPayment {
  id              String        @id @default(cuid())
  amount          Decimal       @db.Decimal(10, 2)
  type            PaymentType
  status          PaymentStatus @default(PENDING)
  paymentMethod   PaymentMethod
  reference       String?       // Dodo session ID or manual reference
  periodStart     DateTime?
  periodEnd       DateTime?
  
  // Timestamps
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // Relations
  schoolId        String
  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  @@index([schoolId])
  @@index([status])
  @@map("school_payments")
}
```

### MessageLog

```prisma
model MessageLog {
  id              String        @id @default(cuid())
  type            MessageType
  recipient       String
  subject         String?
  content         String?       @db.Text
  status          MessageStatus @default(PENDING)
  errorMessage    String?
  sentAt          DateTime?
  
  // Timestamps
  createdAt       DateTime      @default(now())
  
  // Relations
  schoolId        String
  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  
  @@index([schoolId])
  @@index([type])
  @@index([createdAt])
  @@map("message_logs")
}
```

## Indexes

Key indexes for performance:

1. **Multi-tenant queries**: All models have `@@index([schoolId])`
2. **Email lookups**: `User.email`, `Parent.email` are unique
3. **Fee queries**: Indexes on `status`, `dueDate`, `studentId`
4. **Reports**: Indexes on dates for time-based queries

## Migrations

Run migrations with:

```bash
# Generate migration
bunx prisma migrate dev --name <migration_name>

# Apply migrations (production)
bunx prisma migrate deploy

# Reset database (development only)
bunx prisma migrate reset
```

## Seeding

See `packages/db/seed.ts` for development seed data.

```bash
bunx prisma db seed
```
