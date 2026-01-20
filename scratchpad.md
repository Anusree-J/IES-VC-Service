# IES Energy VC Issuer Portal - Implementation Plan

## Project Overview

Build a web-based UI for issuing IES Energy Verifiable Credentials. The system will allow authorized users (via Google OAuth) to issue, manage, and revoke credentials across 4 credential schemas.

---

## Credential Schemas

Based on the Postman collection, the following 4 credential types are supported:

### 1. Consumption Profile Credential
**Purpose:** Energy consumption profile for utility customers
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| consumerNumber | string | Yes | Unique consumer identifier |
| fullName | string | Yes | Consumer full name |
| premisesType | string | No | Residential/Commercial/Industrial |
| connectionType | string | No | Electrical connection type |
| sanctionedLoadKW | string | No | Sanctioned load in kilowatts |
| tariffCategoryCode | string | No | Tariff category code |
| meterNumber | string | No | Meter serial number |

### 2. Utility Customer Credential
**Purpose:** Customer identity and service details
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| consumerNumber | string | Yes | Unique consumer identifier |
| fullName | string | Yes | Customer full name |
| maskedIdNumber | string | No | Masked government ID |
| installationAddress | string | No | Service installation address |
| meterNumber | string | No | Meter serial number |
| serviceConnectionDate | string | No | Date of service connection |

### 3. Generation Profile Credential
**Purpose:** Renewable energy generation systems (prosumers)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| consumerNumber | string | Yes | Prosumer identifier |
| fullName | string | Yes | Prosumer full name |
| generationType | string | Yes | Solar PV/Wind/etc. |
| capacityKW | string | No | Generation capacity in kW |
| commissioningDate | string | No | Date of commissioning |
| meterNumber | string | No | Generation meter number |
| assetId | string | No | Unique asset identifier |
| equipmentManufacturer | string | No | Equipment manufacturer |
| equipmentModel | string | No | Equipment model |

### 4. Storage Profile Credential
**Purpose:** Battery/energy storage systems
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| consumerNumber | string | Yes | Consumer identifier |
| fullName | string | Yes | Owner full name |
| storageType | string | Yes | Lithium-Ion/Lead-Acid/etc. |
| storageCapacityKWh | string | No | Storage capacity in kWh |
| powerRatingKW | string | No | Power rating in kW |
| commissioningDate | string | No | Date of commissioning |
| meterNumber | string | No | Storage meter number |
| assetId | string | No | Unique asset identifier |

---

## Backend API Endpoints (SunbirdRC Credential Service)

**Base URL:** `http://35.244.45.209`

### DID Management
- `POST /identity/did/generate` - Generate issuer DID

### Schema Management
- `POST /credential-schema/credential-schema` - Create credential schema
- `POST /credential-schema/template` - Create PDF/QR template

### Credential Operations
- `POST /credential/credentials/issue` - Issue a credential
- `GET /credential/credentials/{id}` - Get credential (JSON with Accept: application/json)
- `GET /credential/credentials/{id}` - Get credential (PDF with Accept: application/pdf + templateId header)
- `GET /credential/credentials/{id}/verify` - Verify credential
- `DELETE /credential/credentials/{id}` - Revoke credential

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React/Next.js)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Login   │  │  Schema  │  │  Issue   │  │   Credentials    │ │
│  │  (OAuth) │  │ Selector │  │   Form   │  │   Management     │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Node.js/Express)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Auth        │  │  Issuer      │  │  Credential            │ │
│  │  Middleware  │  │  Service     │  │  Service               │ │
│  │  (Google)    │  │  (DID mgmt)  │  │  (Issue/Revoke/List)   │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL/SQLite)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Users       │  │  Issuers     │  │  Issued Credentials    │ │
│  │  (OAuth)     │  │  (DID,       │  │  (credential_id,       │ │
│  │              │  │   schema_ids │  │   issuer_id, type,     │ │
│  │              │  │   template_  │  │   subject_data,        │ │
│  │              │  │   ids)       │  │   status, issued_at)   │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               SunbirdRC Credential Service                      │
│                  (http://35.244.45.209)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** Tailwind CSS + shadcn/ui
- **State Management:** React Context / Zustand
- **Forms:** React Hook Form + Zod validation
- **HTTP Client:** Axios

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js or Next.js API Routes
- **Authentication:** NextAuth.js with Google Provider
- **Database:** PostgreSQL (production) / SQLite (development)
- **ORM:** Prisma

### Infrastructure
- **Hosting:** Vercel (frontend) / Railway (backend) or single Next.js deployment
- **Database:** Supabase / Neon / Railway Postgres

---

## Database Schema

```sql
-- Users table (managed by NextAuth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Allowed users (whitelist)
CREATE TABLE allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Issuers (one per user for simplicity)
CREATE TABLE issuers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  issuer_did VARCHAR(255) NOT NULL,
  issuer_name VARCHAR(255) NOT NULL,

  -- Schema IDs (created on first use)
  consumption_schema_id VARCHAR(255),
  consumption_template_id VARCHAR(255),
  utility_customer_schema_id VARCHAR(255),
  utility_customer_template_id VARCHAR(255),
  generation_schema_id VARCHAR(255),
  generation_template_id VARCHAR(255),
  storage_schema_id VARCHAR(255),
  storage_template_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Issued credentials tracking
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id UUID REFERENCES issuers(id) NOT NULL,
  credential_id VARCHAR(255) NOT NULL, -- DID from SunbirdRC
  credential_type VARCHAR(50) NOT NULL, -- consumption/utility_customer/generation/storage
  subject_id VARCHAR(255), -- did:rcw:consumer-xxx
  subject_name VARCHAR(255),
  subject_data JSONB NOT NULL, -- Full credential subject data
  status VARCHAR(20) DEFAULT 'issued', -- issued/revoked
  issued_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_credentials_issuer ON credentials(issuer_id);
CREATE INDEX idx_credentials_status ON credentials(status);
CREATE INDEX idx_credentials_type ON credentials(credential_type);
```

---

## Feature Breakdown

### Phase 1: Core Infrastructure

#### 1.1 Project Setup
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Set up Tailwind CSS and shadcn/ui
- [ ] Configure Prisma with PostgreSQL
- [ ] Set up environment variables structure

#### 1.2 Authentication
- [ ] Configure NextAuth.js with Google OAuth provider
- [ ] Create allowed users whitelist table
- [ ] Implement login/logout flow
- [ ] Create protected route middleware
- [ ] Build login page UI

#### 1.3 Issuer Setup
- [ ] Create issuer onboarding flow
- [ ] Generate DID on first login (if not exists)
- [ ] Create all 4 schemas for the issuer
- [ ] Create all 4 PDF templates for the issuer
- [ ] Store schema/template IDs in database

### Phase 2: Credential Issuance

#### 2.1 Dashboard
- [ ] Build main dashboard layout
- [ ] Show credential type selection cards
- [ ] Display recent activity / issued credentials
- [ ] Show credential statistics

#### 2.2 Single Credential Issuance
- [ ] Create dynamic form based on selected schema
- [ ] Implement form validation with Zod
- [ ] Build credential preview before issuance
- [ ] Call SunbirdRC API to issue credential
- [ ] Store credential reference in database
- [ ] Show success/error notifications

#### 2.3 Bulk Upload
- [ ] Create CSV template generator per schema type
- [ ] Build CSV upload component
- [ ] Implement CSV parsing and validation
- [ ] Show preview table with validation errors
- [ ] Implement batch issuance with progress indicator
- [ ] Handle partial failures gracefully

### Phase 3: Credential Management

#### 3.1 Credentials List
- [ ] Build credentials table with pagination
- [ ] Add filters (type, status, date range)
- [ ] Add search by name/consumer number
- [ ] Show credential status badges

#### 3.2 Credential Actions
- [ ] View credential details modal
- [ ] Download as JSON
- [ ] Download as PDF (with signed QR code)
- [ ] Verify credential status
- [ ] Revoke credential with confirmation

#### 3.3 Revocation
- [ ] Build revocation confirmation dialog
- [ ] Call SunbirdRC DELETE endpoint
- [ ] Update local database status
- [ ] Log revocation audit trail

### Phase 4: Downloads & QR

#### 4.1 PDF Generation
- [ ] Integrate with SunbirdRC PDF endpoint
- [ ] Handle template ID header correctly
- [ ] Implement download blob handling
- [ ] Add batch PDF download (zip)

#### 4.2 QR Code Verification
- [ ] QR code contains signed credential data
- [ ] Build QR scanner page for verification
- [ ] Display verification results
- [ ] Link to full credential details

---

## API Routes Structure

```
/api
├── /auth
│   ├── [...nextauth].ts    # NextAuth handlers
│   └── /me                 # Get current user
├── /issuer
│   ├── GET /               # Get current user's issuer
│   ├── POST /setup         # Setup issuer (DID + schemas)
│   └── GET /stats          # Get credential statistics
├── /credentials
│   ├── GET /               # List credentials (paginated)
│   ├── POST /              # Issue single credential
│   ├── POST /bulk          # Bulk issue credentials
│   ├── GET /:id            # Get credential details
│   ├── GET /:id/json       # Download as JSON
│   ├── GET /:id/pdf        # Download as PDF
│   ├── GET /:id/verify     # Verify credential
│   └── DELETE /:id         # Revoke credential
├── /templates
│   └── GET /:type/csv      # Download CSV template
└── /admin
    ├── GET /users          # List allowed users (admin only)
    └── POST /users         # Add allowed user (admin only)
```

---

## UI/UX Wireframes

### Login Page
```
┌────────────────────────────────────────────┐
│                                            │
│           IES Energy VC Issuer             │
│                                            │
│    ┌────────────────────────────────────┐  │
│    │                                    │  │
│    │      Sign in with Google           │  │
│    │                                    │  │
│    └────────────────────────────────────┘  │
│                                            │
│    Only authorized users can access        │
│                                            │
└────────────────────────────────────────────┘
```

### Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  IES Energy VC Issuer                    [User] ▼  [Logout]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Welcome, [User Name]                          Total: 156 VCs   │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │ Consumption │ │  Utility    │ │ Generation  │ │  Storage   │ │
│  │   Profile   │ │  Customer   │ │   Profile   │ │  Profile   │ │
│  │             │ │             │ │             │ │            │ │
│  │    45 VCs   │ │    52 VCs   │ │    32 VCs   │ │   27 VCs   │ │
│  │             │ │             │ │             │ │            │ │
│  │ [Issue New] │ │ [Issue New] │ │ [Issue New] │ │ [Issue New]│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
│                                                                 │
│  Recent Activity                              [View All →]      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ VC-001  │ Consumption │ John Doe   │ Issued  │ 2hr ago     ││
│  │ VC-002  │ Generation  │ Jane Smith │ Issued  │ 3hr ago     ││
│  │ VC-003  │ Storage     │ Bob Wilson │ Revoked │ 1 day ago   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Issue Credential Form
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                          Issue Consumption Credential   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [Single Entry]  |  [Bulk Upload]                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Consumer Number *         ┌─────────────────────────────────┐  │
│                            │ UTIL-2026-                      │  │
│                            └─────────────────────────────────┘  │
│                                                                 │
│  Full Name *               ┌─────────────────────────────────┐  │
│                            │                                 │  │
│                            └─────────────────────────────────┘  │
│                                                                 │
│  Premises Type             ┌─────────────────────────────────┐  │
│                            │ Residential              ▼      │  │
│                            └─────────────────────────────────┘  │
│                                                                 │
│  Connection Type           ┌─────────────────────────────────┐  │
│                            │ Single Phase             ▼      │  │
│                            └─────────────────────────────────┘  │
│                                                                 │
│  ... (more fields)                                              │
│                                                                 │
│                    [Preview]  [Issue Credential]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Bulk Upload
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                          Issue Consumption Credential   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [Single Entry]  |  [Bulk Upload]                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  1. Download the CSV template                                   │
│     [Download Template]                                         │
│                                                                 │
│  2. Fill in the data and upload                                 │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │                                                         │ │
│     │          Drag & drop CSV file here                      │ │
│     │              or click to browse                         │ │
│     │                                                         │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│  3. Preview & Issue                                             │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ Row │ Consumer # │ Name      │ Status    │              │ │
│     │ 1   │ UTIL-001   │ John Doe  │ ✓ Valid   │              │ │
│     │ 2   │ UTIL-002   │ Jane      │ ✗ Missing │              │ │
│     │ 3   │ UTIL-003   │ Bob Smith │ ✓ Valid   │              │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│     2 of 3 rows valid                                           │
│                    [Issue 2 Valid Credentials]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Credentials List
```
┌─────────────────────────────────────────────────────────────────┐
│  Issued Credentials                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌───────────────┐ ┌─────────────────┐  │
│  │ All (156)│ │Type ▼  │ │ Status ▼      │ │ Search...      │  │
│  └─────────┘ └─────────┘ └───────────────┘ └─────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ID     │ Type        │ Name       │ Status │ Date │ Actions││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ did:.. │ Consumption │ John Doe   │ Issued │ 1/20 │ ⋮      ││
│  │ did:.. │ Generation  │ Jane Smith │ Issued │ 1/19 │ ⋮      ││
│  │ did:.. │ Storage     │ Bob Wilson │ Revoked│ 1/18 │ ⋮      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Showing 1-10 of 156                    [← Prev] [1] 2 3 [Next →]│
└─────────────────────────────────────────────────────────────────┘

Actions Menu (⋮):
┌─────────────────┐
│ View Details    │
│ Download JSON   │
│ Download PDF    │
│ Verify          │
│ ───────────────│
│ Revoke          │
└─────────────────┘
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/ies_vc_issuer"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# SunbirdRC Credential Service
CREDENTIAL_SERVICE_URL="http://35.244.45.209"

# Admin emails (comma-separated)
ADMIN_EMAILS="admin@example.com,admin2@example.com"
```

---

## CSV Template Formats

### Consumption Profile CSV
```csv
consumerNumber,fullName,premisesType,connectionType,sanctionedLoadKW,tariffCategoryCode,meterNumber
UTIL-2026-001,John Doe,Residential,Single Phase,5,RES-01,MET2026001
UTIL-2026-002,Jane Smith,Commercial,Three Phase,25,COM-02,MET2026002
```

### Utility Customer CSV
```csv
consumerNumber,fullName,maskedIdNumber,installationAddress,meterNumber,serviceConnectionDate
CUST-2026-001,John Doe,XXXX-XXXX-1234,123 Main St,MET2026001,2020-01-15
```

### Generation Profile CSV
```csv
consumerNumber,fullName,generationType,capacityKW,commissioningDate,meterNumber,assetId,equipmentManufacturer,equipmentModel
GEN-2026-001,Alice Solar,Solar PV,10,2024-03-15,GENMET001,SOLAR-001,SunPower,Maxeon 6 AC
```

### Storage Profile CSV
```csv
consumerNumber,fullName,storageType,storageCapacityKWh,powerRatingKW,commissioningDate,meterNumber,assetId
STOR-2026-001,Bob Battery,Lithium-Ion Battery,13.5,5,2024-08-20,STORMET001,BATT-001
```

---

## Security Considerations

1. **Authentication**
   - Google OAuth only (no password storage)
   - Whitelist-based access control
   - Session-based authentication with secure cookies

2. **Authorization**
   - Users can only see/manage their own credentials
   - Admin role for user management
   - One issuer DID per user

3. **API Security**
   - CORS configured for frontend origin only
   - Rate limiting on issuance endpoints
   - Input validation on all endpoints

4. **Data Protection**
   - No PII stored in plaintext (subject data is in SunbirdRC)
   - Database encrypted at rest
   - HTTPS only in production

---

## Implementation Order

### Sprint 1: Foundation ✅ COMPLETED (2026-01-21)
1. ✅ Project setup with Next.js + Tailwind + Prisma
2. ✅ Google OAuth integration
3. ✅ Database schema migration
4. ✅ Basic layout and navigation
5. ✅ Login/protected routes

#### Sprint 1 Implementation Details

**Project Structure Created:**
```
src/
├── app/
│   ├── (dashboard)/           # Protected route group
│   │   ├── layout.tsx         # Dashboard layout with header
│   │   ├── page.tsx           # Main dashboard
│   │   ├── credentials/       # Credentials list (placeholder)
│   │   ├── setup/             # Issuer setup (placeholder)
│   │   ├── settings/          # Settings (placeholder)
│   │   └── admin/             # Admin panel (placeholder)
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/ # NextAuth API route
│   ├── login/                 # Login page
│   ├── layout.tsx             # Root layout with providers
│   └── globals.css            # Tailwind styles
├── components/
│   ├── dashboard/
│   │   └── dashboard-content.tsx  # Dashboard with credential cards
│   ├── layout/
│   │   └── header.tsx         # Navigation header
│   ├── providers/
│   │   └── session-provider.tsx   # NextAuth session provider
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── auth.ts                # NextAuth configuration
│   ├── prisma.ts              # Prisma client singleton
│   └── utils.ts               # Utility functions
├── types/
│   └── next-auth.d.ts         # NextAuth type extensions
└── middleware.ts              # Protected route middleware
```

**Database Schema (Prisma):**
- `User` - NextAuth user with extended fields
- `Account`, `Session`, `VerificationToken` - NextAuth tables
- `AllowedUser` - Email whitelist for access control
- `Issuer` - DID and schema IDs per user
- `Credential` - Issued credential tracking with status

**Authentication Features:**
- Google OAuth via NextAuth.js
- Whitelist-based access control (AllowedUser table)
- Admin bypass via ADMIN_EMAILS environment variable
- Session extended with `isAdmin` and `hasIssuer` flags
- Protected route middleware

**UI Components Installed (shadcn/ui):**
- button, card, input, label, form
- select, table, dialog, dropdown-menu
- badge, toast, toaster, separator, avatar

**To Run the Project:**
```bash
# 1. Install dependencies (already done)
npm install

# 2. Set up PostgreSQL and update .env

# 3. Run database migrations
npx prisma migrate dev --name init

# 4. Start development server
npm run dev
```

---

### Sprint 2: Issuer & Schemas ✅ COMPLETED (2026-01-21)
1. ✅ Issuer setup flow (DID generation)
2. ✅ Schema/template creation on first use
3. ✅ Dashboard with credential type cards
4. ✅ Single credential issuance form

#### Sprint 2 Implementation Details

**New Files Created:**
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── issue/
│   │       └── [type]/
│   │           └── page.tsx      # Dynamic credential issuance form
│   └── api/
│       ├── issuer/
│       │   ├── route.ts          # GET issuer profile
│       │   ├── setup/
│       │   │   └── route.ts      # POST issuer setup (DID + schemas)
│       │   └── stats/
│       │       └── route.ts      # GET credential statistics
│       └── credentials/
│           └── route.ts          # GET list, POST issue credential
└── lib/
    └── credential-service.ts     # SunbirdRC API client
```

**Credential Service Features:**
- `generateDID()` - Generate issuer DID via SunbirdRC
- `createCredentialSchema()` - Create JSON-LD schema
- `createCredentialTemplate()` - Create PDF template with QR
- `issueCredential()` - Issue VC with subject data
- `getCredential()` / `getCredentialPDF()` - Retrieve credentials
- `verifyCredential()` / `revokeCredential()` - Verification and revocation

**Issuer Setup Flow:**
1. User enters issuer name
2. System generates DID via SunbirdRC API
3. Creates 4 credential schemas (Consumption, Utility Customer, Generation, Storage)
4. Creates PDF templates for each schema
5. Stores all IDs in database

**Dashboard Updates:**
- Real-time credential statistics from API
- Credential type cards with live counts
- Recent activity feed with proper formatting
- Cards disabled until issuer setup complete

**Credential Issuance Form:**
- Dynamic form based on credential type
- Field validation with required indicators
- Preview modal before submission
- Success dialog with credential ID
- Tab for bulk upload (placeholder for Sprint 4)

### Sprint 3: Credential Management ✅ COMPLETED (2026-01-21)
1. ✅ Credentials list with pagination
2. ✅ Credential details view
3. ✅ JSON download
4. ✅ PDF download (with QR)
5. ✅ Revocation flow
6. ✅ Credential verification

#### Sprint 3 Implementation Details

**New Files Created:**
```
src/
├── app/
│   └── api/
│       └── credentials/
│           └── [id]/
│               ├── route.ts          # GET details, DELETE revoke
│               ├── json/
│               │   └── route.ts      # GET download JSON
│               ├── pdf/
│               │   └── route.ts      # GET download PDF
│               └── verify/
│                   └── route.ts      # GET verify credential
└── components/
    └── credentials/
        ├── index.ts                  # Barrel exports
        ├── credentials-list.tsx      # Main list with filters/pagination
        ├── credential-details-dialog.tsx  # View details modal
        ├── revoke-credential-dialog.tsx   # Revocation confirmation
        └── verify-credential-dialog.tsx   # Verification status display
```

**Credentials List Features:**
- Paginated table with configurable page size
- Filter by credential type (4 types)
- Filter by status (Issued/Revoked)
- Search by subject name or credential ID
- Debounced search for performance
- Status badges with color coding
- Type badges with distinct colors
- Truncated credential IDs with ellipsis

**Credential Actions:**
- View Details: Full credential information modal
- Download JSON: Fetches from SunbirdRC or falls back to local cache
- Download PDF: Generates PDF via SunbirdRC with template
- Verify: Checks cryptographic proof and revocation status
- Revoke: Confirmation dialog, updates both SunbirdRC and local DB

**API Endpoints Added:**
- `GET /api/credentials/[id]` - Get single credential details
- `DELETE /api/credentials/[id]` - Revoke credential
- `GET /api/credentials/[id]/json` - Download as JSON
- `GET /api/credentials/[id]/pdf` - Download as PDF
- `GET /api/credentials/[id]/verify` - Verify credential

### Sprint 4: Bulk & Polish ✅ COMPLETED (2026-01-21)
1. ✅ CSV template generator
2. ✅ Bulk upload and validation
3. ✅ Batch issuance
4. ✅ QR verification page
5. ✅ Error handling and notifications
6. ✅ UI polish and testing

#### Sprint 4 Implementation Details

**New Files Created:**
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── verify/
│   │       └── page.tsx              # QR/credential verification page
│   └── api/
│       └── templates/
│           └── [type]/
│               └── csv/
│                   └── route.ts      # CSV template download endpoint
└── components/
    ├── bulk-upload/
    │   ├── index.ts                  # Barrel exports
    │   └── bulk-upload.tsx           # Full bulk upload component
    └── ui/
        └── progress.tsx              # Progress bar component
```

**Bulk Upload Features:**
- Drag-and-drop file upload with visual feedback
- CSV parsing with proper quote/comma handling
- Row-by-row validation against schema requirements
- Preview table showing valid/invalid rows with errors
- Batch credential issuance with progress bar
- Results dialog with success/failure summary
- Toast notifications for all operations

**CSV Template Generator:**
- Dynamic templates for all 4 credential types
- Pre-filled example rows with realistic data
- Proper CSV formatting with quoted values

**QR Verification Page:**
- Manual credential ID entry
- Camera-based QR code scanning (placeholder)
- Verification status with proof checks
- Revocation status display
- Credential details when found in local database

**Error Handling & Notifications:**
- Toast notifications for all major operations
- Success/failure/partial success states
- Descriptive error messages from API responses
- Visual feedback during async operations

**Header Navigation Updated:**
- Added "Verify" link with shield icon

---

## Testing Strategy

### Unit Tests
- Form validation logic
- CSV parsing
- API route handlers

### Integration Tests
- Authentication flow
- Credential issuance flow
- Revocation flow

### E2E Tests (Playwright)
- Login → Issue → Download → Revoke flow
- Bulk upload flow
- Error scenarios

---

## Deployment Checklist

- [ ] Configure production database
- [ ] Set up Google OAuth credentials for production domain
- [ ] Configure environment variables in hosting platform
- [ ] Set up error monitoring (Sentry)
- [ ] Configure custom domain
- [ ] Add initial admin user(s) to allowed_users table
- [ ] Test full flow in production environment

---

## Open Questions / Decisions Needed

1. **Should schemas/templates be created per-issuer or shared?**
   - Current plan: Per-issuer (more flexibility, isolation)
   - Alternative: Shared (simpler, less duplication)

2. **Admin user management UI or just database seeding?**
   - Current plan: Simple admin UI to add/remove allowed users
   - Alternative: Just seed database manually

3. **Credential expiration handling?**
   - Should we track expiration dates and notify?
   - Auto-revoke expired credentials?

4. **Audit logging requirements?**
   - How detailed should the audit trail be?
   - Should we log all API calls or just important actions?
