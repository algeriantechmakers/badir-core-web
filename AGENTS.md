# Badir — Project Context

> **For agents**: Read this file first. It gives you enough project knowledge to work on any task without asking Mohamed for basics.

---

## What Is Badir?

**Badir** (`badir.space`) is a youth-focused, open-source community initiative platform built for Algeria. It connects volunteers, helpers, and participants with social impact initiatives organized by individuals or NGO-type organizations. Started as a Bunian Hackathon solution, it is now actively maintained under **AlgerianTechMakers**.

The core loop: organizers (users or organizations) post initiatives → community members discover and register → participants/helpers show up and get checked in → organizers post updates → everyone rates the experience.

**License**: CC BY-NC-SA 4.0 (non-commercial open source)  
**Repo**: https://github.com/algeriantechmakers/badir-core-web  
**Live**: https://badir.space

---

## Tech Stack

| Layer                   | Technology                                                               |
| ----------------------- | ------------------------------------------------------------------------ |
| Framework               | Next.js 16 (App Router)                                                  |
| Language                | TypeScript                                                               |
| UI                      | React 19, Tailwind CSS 4, Shadcn/UI, BaseUI                              |
| ORM                     | Prisma (PostgreSQL)                                                      |
| Auth                    | Better Auth (JWT sessions)                                               |
| File storage            | Supabase / Cloudflare R2 (local: RustFS via Docker, S3 API on port 9000) |
| Forms                   | React Hook Form + Zod                                                    |
| Rich text               | TipTap editor                                                            |
| HTML safety             | DOMPurify (client), sanitize-html + cheerio (server), html-react-parser  |
| Transactional email     | Nodemailer + react-email templates (SMTP)                                |
| Newsletter / bulk email | MailerLite API                                                           |
| Rate limiting           | Redis                                                                    |
| Package manager         | pnpm (use `pnpm` not `npm`; pnpm v10+ requires `pnpm approve-builds`)    |
| Testing                 | Vitest                                                                   |
| CI                      | GitHub Actions                                                           |
| Deployment              | Vercel (cron jobs active in production)                                  |

---

## Folder Structure

```
badir-bunian/
├── actions/          # Next.js server actions (admin, initiatives, participation, posts, auth, ratings, profiles)
├── app/              # App Router pages
│   ├── (auth)/       # Login, signup, password reset
│   ├── admin/        # Admin dashboard (users, orgs, initiatives, audit logs)
│   ├── api/          # API routes (auth, initiatives, organizations, participations, webhooks, cron)
│   └── initiatives/  # Initiative discovery, detail, and management pages
├── components/
|   |   Directly: reusable components based on Shadcn/BaseUI primitives
│   ├── layout/       # Navbar, Footer
│   ├── pages/        # Page-specific components
│   └── ui/           # Shadcn/BaseUI primitives
├── data/             # Static data, route maps, statistics
├── emails/           # react-email templates
├── hooks/            # Custom React hooks
├── lib/              # Utilities, auth config, Supabase/R2 client, permissions (PDP)
├── prisma/           # schema.prisma + migrations
├── schemas/          # Zod validation schemas
├── scripts/          # CLI scripts (e.g. admin:promote)
├── services/         # Business logic layer (called by actions and API routes)
├── tests/            # Vitest tests
└── types/            # TypeScript type definitions
```

**Data flow**: Client → Server Action / API Route → Service Layer → Prisma ORM → PostgreSQL

---

## User Model

### User Types (`userType` enum)

| Value          | Meaning                        |
| -------------- | ------------------------------ |
| `helper`       | Comes to help organize/execute |
| `participant`  | Comes to benefit or attend     |
| `both`         | Can do either                  |
| `organization` | Acts as an org account         |

### Platform Roles (`role` enum — RBAC)

| Role      | Access                                                                |
| --------- | --------------------------------------------------------------------- |
| `USER`    | Standard; can register for initiatives, rate, post                    |
| `MANAGER` | Can approve/reject orgs and initiatives; cannot assign other managers |
| `ADMIN`   | Full access; promotes managers; approves featured partners            |

Roles are enforced in every server action via `enforce(role, action)` from `lib/permissions.ts`. Every privileged action is recorded to `audit_logs`.

Admins are promoted via CLI: `npm run admin:promote`.

---

## Core Entities & Functional Areas

### Initiatives

- Created by a `User` (type: `user`) or an `Organization` (type: `organization`) — tracked via `organizerType`
- Statuses: `draft` → `published` → `completed` / `cancelled`
- Support bilingual titles and descriptions (Arabic + English); Arabic is required
- Can be online or physical (with city/state/country)
- Optional `registrationDeadline` and `maxParticipants` cap
- Optional custom participation questionnaire (`participationQstForm` JSON)
- Required qualifications stored as JSON
- `targetAudience`: `helpers`, `participants`, or `both`
- `currentParticipants` count maintained on the record

### Initiative Participation

- Users register with role: `manager`, `helper`, or `participant`
- Participation statuses: `registered` → `approved` / `rejected` / `kicked`
- Check-in tracked via `isCheckedIn` + `checkInTime`
- Participation form answers stored as JSON per participant
- Unique constraint: one participation record per (initiative, user)

### Initiative Posts

- Organizers and managers post updates/announcements/instructions inside an initiative
- Post types: `announcement`, `update`, `instruction`
- Posts can be pinned; statuses: `draft`, `published`, `archived`
- Support image attachments (`PostAttachment`)
- Email notifications queued to `PostEmailQueue` and processed async

### Organizations

- One org per user account (1:1 `User ↔ Organization`)
- Require admin approval; statuses: `pending` → `approved` / `rejected` / `frozen`
- Can be flagged as `isFeaturedPartner` by admins
- Store social links (JSON), work areas (array), identification documents, official license
- Can submit `SupportRequest`s (logistical, media, HR, technical, financial, other)

### Ratings

- `UserInitiativeRating`: users rate an initiative (decimal 0–5, optional comment)
- `PlatformRating`: structured UX feedback survey (ease of use, clarity, diversity, speed, satisfaction, etc.)

### Reporting

- Any user can file a `Report` against a `USER`, `ORGANIZATION`, or `POST`
- Reasons: `HARMFUL_CONTENT`, `MISINFORMATION`, `FRAUD`, `TERMS_VIOLATION`, `HARASSMENT`, `OTHER`
- Statuses: `PENDING` → `RESOLVED` / `DISMISSED`
- Resolved by a manager or admin

### Email Systems

- **Transactional (SMTP / Nodemailer)**: password reset, contact form, account notifications
- **Newsletter (MailerLite)**: subscriptions, campaigns, segmentation
- **Webhook queue**: MailerLite sends events to `/api/webhooks/mailerlite` (HMAC-SHA256 validated) → stored in `webhook_events` → processed by cron at `/api/cron/process-webhooks` every minute (Vercel Cron)

### Admin Dashboard

- Manage users (view, assign manager role)
- Approve / reject / freeze organizations
- Approve / reject initiatives
- View audit log
- Set featured partners

---

## Key Conventions

- **Bilingual**: All user-facing content has `*Ar` (required) and `*En` (optional) fields
- **RTL support**: Tailwind CSS 4 RTL utilities used throughout
- **Server actions**: Business logic lives in `services/`, called by `actions/` — not inlined in components
- **Permissions**: Single PDP at `lib/permissions.ts`; all privileged actions call `enforce()` before DB access
- **Audit logging**: Every admin/manager action recorded to `audit_logs` with actor, action, targetId
- **Git workflow**: Rebase workflow (not merge commits)
- **Partial unique index**: `UserInitiativeRating` uses a partial unique index (`WHERE user_id IS NOT NULL`) enforced via raw SQL `$executeRaw` — Prisma upsert cannot handle this

---

## Database Schema — Model Summary

| Model                                  | Purpose                                            |
| -------------------------------------- | -------------------------------------------------- |
| `User`                                 | Platform accounts (individuals and org owners)     |
| `Organization`                         | NGO/association profiles, owned 1:1 by a User      |
| `UserQualification`                    | User's education, specialization, current job      |
| `InitiativeCategory`                   | Taxonomy for initiatives (bilingual, with colors)  |
| `Initiative`                           | Core entity — community events/projects            |
| `InitiativeParticipant`                | Join table: users ↔ initiatives with role + status |
| `InitiativePost`                       | Updates/announcements posted inside an initiative  |
| `PostAttachment`                       | Images attached to initiative posts                |
| `Report`                               | User-submitted reports on content or accounts      |
| `SupportRequest`                       | Orgs requesting logistical/financial/etc. support  |
| `UserInitiativeRating`                 | Post-initiative ratings by participants            |
| `PlatformRating`                       | UX feedback survey submissions                     |
| `AuditLog`                             | Record of all privileged admin/manager actions     |
| `Session` / `Account` / `Verification` | Better Auth internals                              |
| `WebhookEvent`                         | MailerLite webhook queue (processed by cron)       |
| `PostEmailQueue`                       | Email notifications queue for initiative posts     |

---

## Local Dev Setup

```bash
git clone https://github.com/algeriantechmakers/badir-core-web
cd badir-core-web
pnpm install
cp .env.example .env.local
docker compose up -d --wait      # PostgreSQL + RustFS (S3) + Redis
pnpm prisma migrate dev
pnpm prisma db seed
# Add to /etc/hosts: 127.0.0.1  rustfs
pnpm dev                         # http://localhost:3000
```

Object storage: local = RustFS (S3-compatible, port 9000, console on 9001); production = Cloudflare R2.

---

## What's Already Working (as of Nov 2026)

- Full auth flow (signup multi-step, login, password reset, email verification)
- User profile completion workflow
- Organization registration + admin approval workflow
- Initiative creation (draft/publish), discovery (browse + search + filters), detail page
- Participation registration with dynamic questionnaire, approval/rejection, check-in
- Initiative posts (announcements/updates) with image attachments + email queue
- Rating system (initiative ratings + platform UX survey)
- Report system (users can report content)
- Admin dashboard (users, orgs, initiatives, audit log, featured partners)
- Newsletter integration with MailerLite + webhook queue
- Bilingual (AR) UI with RTL support

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
