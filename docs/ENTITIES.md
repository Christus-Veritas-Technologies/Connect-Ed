# Connect-Ed Entities

## Entity Relationship Diagram

```
┌──────────────┐
│    School    │
└──────┬───────┘
       │
       ├──────────────┬──────────────┬──────────────┬──────────────┐
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│   User   │   │  Student │   │  Parent  │   │  Class   │   │ Subject  │
│(Admin,   │   │          │   │          │   │          │   │          │
│Reception,│   └────┬─────┘   └────┬─────┘   └────┬─────┘   └──────────┘
│Teacher)  │        │              │              │
└──────────┘        │              │              │
                    └──────────────┴──────────────┘
                           (relationships)
```

## School

The top-level organization entity. All other entities belong to a school.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| name | String | School name |
| plan | Enum | LITE, GROWTH, ENTERPRISE |
| isActive | Boolean | Whether school can access the system |
| signupFeePaid | Boolean | Whether initial signup fee is paid |
| studentCount | Int? | Number of students (for analytics) |
| teacherCount | Int? | Number of teachers (for analytics) |
| emailQuota | Int | Monthly email limit based on plan |
| whatsappQuota | Int | Monthly WhatsApp message limit |
| smsQuota | Int | Monthly SMS limit |
| emailUsed | Int | Emails sent this period |
| whatsappUsed | Int | WhatsApp messages sent this period |
| smsUsed | Int | SMS sent this period |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## User

System users who can log into the dashboard. Includes Admin, Receptionist, and Teacher roles.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| email | String | Unique email address |
| password | String | Bcrypt hashed password |
| name | String | Full name |
| role | Enum | ADMIN, RECEPTIONIST, TEACHER |
| isActive | Boolean | Whether user can log in |
| schoolId | String | Foreign key to School |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Role Permissions

| Permission | Admin | Receptionist | Teacher |
|------------|-------|--------------|---------|
| Manage users | Yes | No | No |
| Manage students | Yes | Yes | View only |
| Manage fees | Yes | Yes | No |
| Manage expenses | Yes | Yes | No |
| Manage classes | Yes | No | Own class |
| View reports | Yes | Yes | Limited |
| School settings | Yes | No | No |

## Student

Students enrolled in the school.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| firstName | String | First name |
| lastName | String | Last name |
| dateOfBirth | DateTime? | Date of birth |
| gender | Enum? | MALE, FEMALE, OTHER |
| admissionNumber | String | Unique admission/registration number |
| admissionDate | DateTime | Date of enrollment |
| classId | String? | Foreign key to Class |
| parentId | String? | Foreign key to Parent |
| schoolId | String | Foreign key to School |
| isActive | Boolean | Whether student is currently enrolled |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## Parent

Parents/guardians of students (Enterprise plan only).

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| email | String | Unique email address |
| password | String | Bcrypt hashed password |
| name | String | Full name |
| phone | String? | Phone number |
| schoolId | String | Foreign key to School |
| isActive | Boolean | Whether parent can log in |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## Class

Classes/grades in the school.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| name | String | Class name (e.g., "Grade 5A") |
| classTeacherId | String? | Foreign key to User (teacher) |
| schoolId | String | Foreign key to School |
| isActive | Boolean | Whether class is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## Subject

Subjects taught at the school.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| name | String | Subject name (e.g., "Mathematics") |
| code | String? | Subject code (e.g., "MATH101") |
| schoolId | String | Foreign key to School |
| isActive | Boolean | Whether subject is active |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## Fee

Fee records for students.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| studentId | String | Foreign key to Student |
| amount | Decimal | Fee amount |
| description | String | Fee description (e.g., "Term 1 Tuition") |
| dueDate | DateTime | Payment due date |
| status | Enum | PENDING, PARTIAL, PAID, OVERDUE |
| paidAmount | Decimal | Amount paid so far |
| paidAt | DateTime? | Full payment date |
| schoolId | String | Foreign key to School |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## FeePayment

Individual payment transactions for fees.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| feeId | String | Foreign key to Fee |
| amount | Decimal | Payment amount |
| paymentMethod | Enum | CASH, BANK_TRANSFER, ONLINE |
| reference | String? | Payment reference/receipt number |
| notes | String? | Additional notes |
| receivedBy | String | Foreign key to User who received payment |
| schoolId | String | Foreign key to School |
| createdAt | DateTime | Payment timestamp |

## Expense

School expenses tracking.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| amount | Decimal | Expense amount |
| category | String | Expense category |
| description | String | Expense description |
| date | DateTime | Expense date |
| receiptUrl | String? | URL to receipt image/document |
| recordedBy | String | Foreign key to User who recorded |
| schoolId | String | Foreign key to School |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## SchoolPayment

Payments made by schools for their Connect-Ed subscription.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| schoolId | String | Foreign key to School |
| amount | Decimal | Payment amount |
| type | Enum | SIGNUP_FEE, TERM_PAYMENT |
| status | Enum | PENDING, COMPLETED, FAILED |
| paymentMethod | Enum | ONLINE, CASH |
| reference | String? | Payment reference from Dodo/manual |
| periodStart | DateTime? | Start of subscription period |
| periodEnd | DateTime? | End of subscription period |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

## MessageLog

Log of all messages sent (for quota tracking).

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (CUID) |
| schoolId | String | Foreign key to School |
| type | Enum | EMAIL, WHATSAPP, SMS |
| recipient | String | Recipient address/number |
| subject | String? | Message subject (for emails) |
| status | Enum | SENT, FAILED, PENDING |
| sentAt | DateTime | Timestamp of sending |
| createdAt | DateTime | Creation timestamp |
