# Badir - Community Initiative Platform

**Badir** is a comprehensive platform designed to connect volunteers and participants with meaningful community initiatives. The platform enables organizations and individuals to create, manage, and participate in social impact projects across various categories.

**Purpose**: Badir aims to build stronger communities by facilitating collaboration between initiative organizers and community members, making it easier to discover, join, and contribute to positive social change initiatives.

## Features

### Core Functionality

- **Initiative Discovery**: Browse and search community initiatives with advanced filtering
- **User Authentication**: Secure login/signup for individuals and organizations
- **Profile Management**: Complete user profiles with location and preferences
- **Initiative Participation**: Join initiatives as helper or participant
- **Organization Management**: Create and manage organizational accounts
- **Rich Content Creation**: TipTap editor with image upload and formatting
- **Multi-language Support**: Arabic (RTL) and English interface
- **Responsive Design**: Optimized for desktop, tablet, and mobile

### Advanced Features

- **Dynamic Participation Forms**: Custom questions per initiative
- **Role-based Access Control**: Admin, Manager, Member roles
- **File/Image Management**: Supabase storage with safe deletion
- **Search & Filters**: Full-text search with category, location, and status filters
- **Pagination**: Efficient cursor-based data loading
- **Rating System**: Platform and initiative ratings
- **Admin Dashboard**: Initiative and organization approval workflow

## Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework with RTL support
- **Shadcn/UI & Radix UI** - Accessible, composable components

### Backend & Database

- **Prisma ORM** - PostgreSQL schema and migrations
- **Better Auth** - Authentication with JWT sessions
- **Supabase** - File storage with RLS policies

### Form & Content Management

- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **TipTap Editor** - Rich text editing
- **DOMPurify** - HTML sanitization
- **sanitize-html** - Content sanitization (both client-side and server-side)
- **html-react-parser** - Safe HTML rendering in React (both client-side and server-side)
- **cheerio** - Server-side HTML parsing and manipulation

## Architecture Overview

### Folder Structure

```
badir-bunian/
├── actions/ # Server actions for API logic
├── app/ # Next.js App Router pages
│ ├── (auth)/ # Authentication pages
│ ├── admin/ # Admin dashboard
│ ├── api/ # API routes
│ └── initiatives/ # Initiative pages
├── components/ # Reusable UI components
│ ├── layout/ # Footer, Navbar
│ ├── pages/ # Page-specific components
│ └── ui/ # UI primitives (Shadcn)
├── data/ # Static data, routes, statistics
├── hooks/ # Custom React hooks
├── lib/ # Utilities, auth, Supabase client
├── prisma/ # Database schema and migrations
├── schemas/ # Zod validation schemas
├── services/ # Business logic layer
└── types/ # TypeScript definitions
```

### Database Schema

```mermaid
erDiagram
    User ||--o{ Account : has
    User ||--o{ Session : has
    User ||--o| Organization : owns
    User ||--o{ Initiative : "organizes as user"
    User ||--o{ InitiativeParticipant : participates
    User ||--o{ InitiativePost : authors
    User ||--o{ UserInitiativeRating : rates
    User ||--o{ PlatformRating : gives
    User ||--o{ UserQualification : has
    User ||--o{ AuditLog : "performs"
    Organization ||--o{ Initiative : "organizes as org"
    Organization ||--o{ SupportRequest : requests
    Initiative ||--o{ InitiativeParticipant : has
    Initiative ||--o{ InitiativePost : has
    Initiative ||--o{ UserInitiativeRating : receives
    Initiative }o--|| InitiativeCategory : "belongs to"
    InitiativePost ||--o{ PostAttachment : has

    User {
        string id PK
        string name
        string image
        string email UK
        boolean emailVerified
        string firstName
        string lastName
        string phone
        date dateOfBirth
        enum sex
        string bio
        enum userType
        enum role
        string geohash
        string city
        string state
        string country
        boolean isActive
        datetime createdAt
        datetime updatedAt
        datetime lastActiveAt
        boolean profileCompleted
        boolean newsletterSubscribed
        datetime newsletterSubscribedAt
        datetime newsletterUnsubscribedAt
        boolean consentGiven
        datetime consentGivenAt
        string consentVersion
        string mailerLiteId
    }

    Organization {
        string id PK
        string userId "FK, UK"
        string name
        string description
        string logo
        string contactEmail
        string contactPhone
        string website
        string city
        string state
        string country
        datetime createdAt
        datetime updatedAt
        date foundingDate
        string headquarters
        string identificationCard
        int membersCount
        string officialLicense
        string organizationType
        string previousInitiatives
        string shortName
        json socialLinks
        string userRole
        array workAreas
        enum status
        boolean isFeaturedPartner
    }

    UserQualification {
        string id PK
        string userId FK
        string specification
        string educationalLevel
        string currentJob
        datetime createdAt
        datetime updatedAt
    }

    InitiativeCategory {
        string id PK
        string nameAr
        string nameEn
        string descriptionAr
        string descriptionEn
        string bgColor
        string textColor
        boolean isActive
        datetime createdAt
    }

    Initiative {
        string id PK
        enum organizerType
        string organizerUserId FK
        string organizerOrgId FK
        string categoryId FK
        string titleAr
        string titleEn
        string descriptionAr
        string descriptionEn
        string shortDescriptionAr
        string shortDescriptionEn
        boolean isOnline
        string location
        string city
        string state
        string country
        datetime startDate
        datetime endDate
        datetime registrationDeadline
        int maxParticipants
        int currentParticipants
        boolean isOpenParticipation
        enum targetAudience
        json requiredQualifications
        enum status
        string coverImage
        json participationQstForm
        datetime createdAt
        datetime updatedAt
    }

    InitiativeParticipant {
        string id PK
        string initiativeId FK
        string userId FK
        enum participantRole
        json participationForm
        datetime checkInTime
        boolean isCheckedIn
        enum status
        datetime createdAt
        datetime updatedAt
    }

    InitiativePost {
        string id PK
        string initiativeId FK
        string authorId FK
        string title
        string content
        enum postType
        boolean isPinned
        enum status
        datetime createdAt
        datetime updatedAt
    }

    PostAttachment {
        string id PK
        string initiativePostId FK
        string imageUrl UK
        datetime createdAt
        datetime updatedAt
    }

    SupportRequest {
        string id PK
        string organizationId FK
        enum supportType
        string title
        string description
        enum urgency
        enum status
        datetime requestedAt
        datetime updatedAt
        datetime createdAt
    }

    UserInitiativeRating {
        int id PK
        string userId FK
        string initiativeId FK
        decimal rating
        string comment
        datetime createdAt
        datetime updatedAt
    }

    PlatformRating {
        string id PK
        string userId FK
        string easeOfUse
        string informationClarity
        string contentDiversity
        string performanceSpeed
        string generalSatisfaction
        array usefulSections
        string encounteredDifficulties
        string difficultiesDetails
        string improvementSuggestions
        string wouldRecommend
        string appRating
        datetime createdAt
        datetime updatedAt
    }

    Session {
        string id PK
        datetime expiresAt
        string token UK
        datetime createdAt
        datetime updatedAt
        string ipAddress
        string userAgent
        string userId FK
    }

    Account {
        string id PK
        string accountId
        string providerId
        string userId FK
        string accessToken
        string refreshToken
        string idToken
        datetime accessTokenExpiresAt
        datetime refreshTokenExpiresAt
        string scope
        string password
        datetime createdAt
        datetime updatedAt
    }

    Verification {
        string id PK
        string identifier
        string value
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
    }

    WebhookEvent {
        string id PK
        string provider
        string type
        json payload
        datetime createdAt
    }

    PostEmailQueue {
        string id PK
        string userId FK
        string email
        string initiativeId FK
        string postId FK
        datetime createdAt
    }

    AuditLog {
        string id PK
        string actorId FK
        string action
        string targetId
        datetime createdAt
    }
```

### Data Flow

Client Request → Server Function / Next.js API Route → Service Layer → Prisma ORM → PostgreSQL

## Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Docker Engine
- Docker Compose

### Installation

1. **Clone the repository**

```bash
   git clone https://github.com/algerian-tech-makers/Badir
   cd Badir
```

### Install dependencies

```bash
   pnpm install
```

### Set up environment variables

```bash
   cp .env.example .env.local
```

### Start Postgres + the other services

```bash
docker compose up -d --wait
```

### Set up database

```bash
   npx prisma migrate dev
   npx prisma db seed
```

### Set up S3_ENDPOINT

Open the following file based on your OS:

- Windows: C:\Windows\System32\drivers\etc\hostsmacOS
- Linux: /etc/hosts

Add this line at the bottom of the file and save it:

```bash
127.0.0.1  minio
```

### Start development server

```bash
   npm run dev
```

### Open your browser

```bash
   http://localhost:3000
```

## Key Components

### Reusable UI Components

- `FormInput`: Typed input with validation and error mapping
- `AppButton`: Consistent button styles with loading states
- `FilterSelect`: Dynamic filtering for initiatives
- `PostEditor`: TipTap-based rich text editor
- `InitiativeCard`: Initiative display with status badges
- `SearchInput`: Full-text search functionality
- `PaginationControls`: Cursor-based pagination UI
- `Ratings`: Star rating display and input

### Form Components

- `FormFieldCreator`: Dynamic form builder
- `SignupForm`: Multi-step registration flow
- `InitiativeForm`: Initiative creation and editing
- `CompleteProfileForm`: Profile completion workflow

## API Routes

```bash
/api/auth/[...all] # Better Auth handlers
/api/initiatives/ # Initiative CRUD operations
/api/organizations/ # Organization management
/api/participations/ # Participation requests
```

## Server Actions

```bash
actions
│  ├─ admin.ts  # Admin-related actions
│  ├─ helpers.ts    # Helper functions
│  ├─ initiatives.ts    # Initiative-related actions
│  ├─ login.ts  # Login action
│  ├─ logout.ts # Logout action
│  ├─ organization-profile.ts   # Organization profile actions
│  ├─ participation.ts  # Participation-related actions
│  ├─ posts.ts  # Initiative posts actions
│  ├─ signup.ts  # Signup action
│  ├─ submitRating.ts  # Submit rating action
│  └─ user-profile.ts  # User profile actions
```

---

## Admin Setup

To promote a user to admin role, run: `npm run admin:promote` and follow the prompts to enter the user's email address.

---

## Email Systems

Badir uses two separate email services, each optimized for its specific purpose:

### Transactional Emails (SMTP)

**Purpose**: Time-sensitive, user-triggered emails requiring high deliverability

**Use Cases**:

- Password reset links
- Contact form submissions
- Feedback notifications
- Account-related notifications

**Configuration**:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM_EMAIL=noreply@yourdomain.com
CONTACT_EMAIL=contact@yourdomain.com
```

**Implementation**: Uses `nodemailer` with `react-email` templates for type-safe, responsive emails.

### Newsletter Emails (MailerLite)

**Purpose**: Marketing, newsletters, and bulk communications

**Use Cases**:

- Newsletter subscriptions
- Campaign delivery
- Audience segmentation
- Email analytics

**Configuration**:

```bash
MAILERLITE_API_KEY=eyJ...
MAILERLITE_WEBHOOK_SECRET=...
```

**Implementation**: Uses [MailerLite](https://mailerlite.com) API for subscription management with production-ready rate limiting via Redis.

### Webhook Queue System

To keep user newsletter status synchronized with MailerLite (unsubscribes, bounces, etc.), Badir implements a database-backed webhook queue:

**Flow**:

1. **Fast Webhook Endpoint** (`/api/webhooks/mailerlite`):
   - Validates HMAC-SHA256 signature
   - Enqueues events to `webhook_events` table
   - Returns 200 OK in <3 seconds

2. **Background Cron Worker** (`/api/cron/process-webhooks`):
   - Runs every minute via Vercel Cron
   - Processes 10 oldest events per batch
   - Updates user newsletter status
   - Deletes successfully processed events
   - Failed events remain for automatic retry

**Required Environment Variables**:

```bash
CRON_SECRET=...  # Generated via: openssl rand -base64 32
REDIS_URL=redis://localhost:6379  # For rate limiting
```

**Deployment Notes**:

- Run `npm run db:migrate` to create `webhook_events` table
- Configure webhook in MailerLite dashboard after deployment
- Vercel Cron activates automatically in production
- See `WEBHOOK_QUEUE_QUICK_START.md` for complete setup guide

**Why Two Services?**

- **Compliance**: Transactional emails must not contain marketing content
- **Deliverability**: Separate IP reputation prevents marketing campaigns from affecting critical notifications
- **Cost**: MailerLite provides better economics for bulk newsletters
- **Features**: MailerLite offers advanced analytics, A/B testing, and audience management

## Role-Based Access Control

Badir implements a three-tier RBAC model with `USER`, `MANAGER`, and `ADMIN` roles stored on the `User` record. Admins are promoted via a CLI script; managers are assigned by admins from the `/admin/users` panel and cannot assign or revoke other managers. The permission matrix lives in a single PDP (`lib/permissions.ts`) that enumerates all privileged actions and maps each role to an allowed set — admin-only actions such as approving organizations, setting featured partners, and assigning managers are explicitly excluded from the manager policy. Every server action enforces permissions by calling `enforce(role, action)` before touching the database, and every privileged action is recorded to the `audit_logs` table with the actor, their role at the time, the action type, and the target resource.

# License

<a href="https://github.com/algerian-tech-makers/Badir">Badir</a> © 2025 is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International</a><br/><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;">
