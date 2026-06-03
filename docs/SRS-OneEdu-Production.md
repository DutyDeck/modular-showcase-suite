# Software Requirements Specification (SRS)
## One Edu — Education Super App
### Production Readiness: Multi-Tenancy, Geo-Separation & Global Compliance

---

| Field | Value |
|---|---|
| Document Version | 1.0.0 |
| Status | Draft for Review |
| Date | 2026-06-04 |
| Prepared By | Engineering Team |
| Classification | Internal / Confidential |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Stakeholders & User Classes](#3-stakeholders--user-classes)
4. [Functional Requirements](#4-functional-requirements)
   - 4.1 Authentication & Identity
   - 4.2 Multi-Tenancy Architecture
   - 4.3 Geo-Separation & Data Residency
   - 4.4 Module Entitlement System
   - 4.5 Core Application Modules
   - 4.6 Compliance & Governance
   - 4.7 Platform Administration
   - 4.8 Data Migration
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Compliance & Regulatory Matrix](#6-compliance--regulatory-matrix)
7. [Data Architecture Requirements](#7-data-architecture-requirements)
8. [External Interface Requirements](#8-external-interface-requirements)
9. [Security Requirements](#9-security-requirements)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Glossary](#11-glossary)
12. [Appendix: Current Prototype Gap Analysis](#12-appendix-current-prototype-gap-analysis)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification defines the complete requirements for transforming the **One Edu** prototype into a production-grade, multi-tenant, geo-distributed Education Super App. It serves as the authoritative reference for engineering, QA, security, legal, and DevOps teams throughout the development lifecycle.

### 1.2 Scope

**One Edu** is a SaaS Learning Management & School Operations Platform serving K-12 schools, tuition centres, and higher-education institutions across multiple countries. The platform exposes a modular suite of capabilities gated by subscription tier (Starter / Growth / Enterprise).

**In Scope for this SRS:**
- Full server-side implementation of all currently simulated modules
- True multi-tenant data isolation (database-level)
- Geo-separated deployment with data residency guarantees
- Global compliance framework: UK GDPR / EU GDPR / FERPA / COPPA / PDPA / DPDP Act (India) / UAE PDPL
- Role-Based Access Control (RBAC) enforced server-side
- Production-grade authentication (OAuth 2.0 / OIDC / MFA)
- Audit logging, DSAR fulfilment, retention policies
- Azure-hosted environments: Development, QA, UAT, Production

**Out of Scope:**
- Native mobile applications (iOS/Android) — covered separately
- Third-party LMS content authoring tools
- Payment gateway merchant onboarding

### 1.3 Definitions & Acronyms

| Term | Definition |
|---|---|
| **Tenant** | A single educational institution (school, college, tuition centre) subscribing to One Edu |
| **Platform Admin** | Super-admin with cross-tenant visibility (One Edu staff) |
| **Institute Admin** | Admin scoped to a single tenant |
| **One Edu ID** | Platform-wide unique student identifier (format: `S-XXXX`) persisting across institutional transfers |
| **RBAC** | Role-Based Access Control |
| **DSAR** | Data Subject Access Request |
| **Data Residency** | Legal/contractual requirement that data is stored and processed within a specific geographic region |
| **Geo-Region** | A logical grouping of Azure regions forming a compliance boundary (e.g. EU, UK, APAC, NA) |
| **Module** | A discrete feature set that can be enabled/disabled per tenant per subscription plan |
| **SRB** | Student Record Book — a structured parent-teacher communication and student welfare log |
| **MFA** | Multi-Factor Authentication |
| **PDPA** | Personal Data Protection Act (Thailand / Sri Lanka) |
| **DPDP** | Digital Personal Data Protection Act (India, 2023) |
| **UAE PDPL** | UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021) |
| **FERPA** | Family Educational Rights and Privacy Act (USA) |
| **COPPA** | Children's Online Privacy Protection Act (USA) |
| **KCSIE** | Keeping Children Safe in Education (UK statutory guidance) |

### 1.4 Document Conventions

- **SHALL** — mandatory requirement
- **SHOULD** — recommended, deviation requires justification
- **MAY** — optional
- Requirement IDs: `[MODULE-NNN]` format (e.g. `[AUTH-001]`)

---

## 2. Overall Description

### 2.1 Product Perspective

One Edu operates as a **multi-tenant SaaS platform** with a shared-application / isolated-data architecture deployed on Microsoft Azure. Each geo-region runs an independent deployment stack to satisfy data residency obligations. Tenants are onboarded to their nearest compliant geo-region at sign-up and cannot be moved without explicit DPA agreement and data migration procedure.

```
┌─────────────────────────────────────────────────────────┐
│                    One Edu Platform                      │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ EU Region│  │ UK Region│  │APAC Region│  │NA Region│  │
│  │(Frankfurt│  │ (London) │  │(Singapore)│  │(East US)│  │
│  │  Paris)  │  │          │  │  Mumbai)  │  │        │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                         │
│           Global Control Plane (read-only metadata)     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Current State vs Target State

The current codebase is a **client-side demonstration prototype**. All data persists to browser `localStorage`. Authentication uses plaintext passwords. Tenant isolation, RBAC, and compliance controls are purely cosmetic. The production system must implement every enforcement point server-side.

### 2.3 Product Functions (High-Level)

1. **Identity & Access** — SSO, MFA, RBAC, session management
2. **Student Information System** — enrollment, profiles, cross-tenant One Edu ID
3. **Learning Management** — courses, assignments, grades, LMS content delivery
4. **Attendance Management** — multi-modal (QR, RFID, GPS, facial recognition with DPIA gating)
5. **Student Record Book (SRB)** — welfare logs, parent communication, acknowledgements
6. **Finance** — fee management, invoicing, payment gateway integration
7. **Communications** — in-app messaging, notifications, announcements
8. **Reporting & Analytics** — dashboards, AI insights, export
9. **Family Portal** — parent/guardian access to children's records
10. **Marketplace** — course discovery across tenant network
11. **Platform Administration** — tenant management, user management, module entitlements
12. **Compliance & Governance** — audit logs, DSAR handling, data retention, consent management
13. **Data Migration** — bulk import from legacy SIS/LMS systems

### 2.4 Assumptions & Dependencies

- Azure is the sole cloud provider for all environments
- Each geo-region complies with the data protection laws of its jurisdiction
- Tenants self-declare their primary jurisdiction at onboarding; cross-border data transfers require explicit DPA addendum
- The frontend remains a React/TanStack Start web application; mobile-native is a future phase
- Payment processing is delegated to Stripe (PCI DSS scope handled by Stripe)
- Email delivery via Azure Communication Services or SendGrid
- The One Edu ID namespace is globally unique and managed by the platform control plane

---

## 3. Stakeholders & User Classes

### 3.1 User Roles

| Role | Scope | Description |
|---|---|---|
| **Platform Admin** | Global (all tenants) | One Edu staff; tenant CRUD, billing, compliance oversight, cross-tenant reporting |
| **Institute Admin** | Single tenant | School principal / IT admin; user management, module config, reports, compliance within tenant |
| **Teacher** | Single tenant | Class management, attendance, grading, SRB entries, assignments |
| **Student** | Single tenant (or multi-enrolment) | Course access, assignment submission, grade viewing, SRB acknowledgement |
| **Parent / Guardian** | Linked to student(s) | Read-only children portal, SRB acknowledgement, invoice payment, messaging |
| **Finance Officer** | Single tenant | Invoice management, payment tracking, financial reports |
| **Compliance Officer** | Single tenant or global | DSAR handling, audit log review, consent management |

### 3.2 Tenant Tiers

| Plan | Module Access | User Limit | Support SLA |
|---|---|---|---|
| **Starter** | Core + Students + Courses + Attendance + Calendar | ≤ 500 users | Business hours |
| **Growth** | Starter + LMS + Grades + SRB + Finance + Messages + Reports | ≤ 5,000 users | 8×5, 4h response |
| **Enterprise** | All modules + AI Insights + Marketplace + Migration + Custom integrations | Unlimited | 24×7, 1h response |

---

## 4. Functional Requirements

---

### 4.1 Authentication & Identity

#### 4.1.1 Authentication Methods

| ID | Requirement |
|---|---|
| **AUTH-001** | The system SHALL support username/password authentication with Argon2id password hashing (min cost factor per OWASP recommendations). |
| **AUTH-002** | The system SHALL support OAuth 2.0 / OIDC federation with external Identity Providers (Google Workspace, Microsoft Entra ID, custom SAML 2.0). |
| **AUTH-003** | The system SHALL enforce MFA for all Institute Admin and Platform Admin roles. MFA SHALL be optional but nudged for Teacher and Finance Officer roles. |
| **AUTH-004** | Supported MFA methods SHALL include: TOTP (RFC 6238), hardware security keys (WebAuthn/FIDO2), and SMS OTP (fallback only, not sole method). |
| **AUTH-005** | The system SHALL issue short-lived JWTs (15-minute access tokens) with refresh token rotation. Refresh tokens SHALL be stored server-side and invalidated on logout or password change. |
| **AUTH-006** | The system SHALL enforce account lockout after 5 consecutive failed login attempts within 10 minutes; lockout duration SHALL be 15 minutes with exponential backoff. |
| **AUTH-007** | Session tokens SHALL be bound to device fingerprint and geo-region. Cross-region token use SHALL trigger re-authentication. |
| **AUTH-008** | The system SHALL support Single Sign-Out (SLO) propagated to all active sessions and federated IdPs. |

#### 4.1.2 One Edu Identity

| ID | Requirement |
|---|---|
| **AUTH-010** | Every student SHALL receive a globally unique One Edu ID (format `OE-XXXXXXXXXX`) at first enrolment on the platform, persisting across institution changes. |
| **AUTH-011** | The One Edu ID namespace SHALL be managed by the global control plane and SHALL be immutable once assigned. |
| **AUTH-012** | A student's identity record (name, DOB, guardian contacts) SHALL be stored in the student's home geo-region; cross-region lookup SHALL return a stub reference only. |
| **AUTH-013** | Parent/guardian accounts SHALL be cryptographically linked to student records via a verified relationship table; relationship verification SHALL require either institution confirmation or guardian document upload. |

#### 4.1.3 Password Policy

| ID | Requirement |
|---|---|
| **AUTH-020** | Minimum password length: 12 characters. |
| **AUTH-021** | Passwords SHALL be checked against the HaveIBeenPwned breach corpus (k-anonymity API) at registration and password change. |
| **AUTH-022** | Password expiry SHALL be configurable per tenant (default: 365 days for non-admin, 90 days for admin roles). |
| **AUTH-023** | Last 12 passwords SHALL NOT be reused. |

---

### 4.2 Multi-Tenancy Architecture

#### 4.2.1 Isolation Model

| ID | Requirement |
|---|---|
| **MT-001** | The system SHALL use a **shared application / isolated schema** model: a single application deployment per geo-region with per-tenant database schemas within a shared Azure Database for PostgreSQL Flexible Server. |
| **MT-002** | All database queries SHALL be executed within the tenant's schema context via Row-Level Security (RLS) policies. Cross-tenant queries SHALL be architecturally impossible at the ORM level. |
| **MT-003** | A `tenant_id` column SHALL be present on every tenant-scoped table. ORM models SHALL enforce tenant scoping at the base model level; any query without `tenant_id` filter SHALL raise an exception in non-platform-admin contexts. |
| **MT-004** | Tenant data in object storage (Azure Blob Storage) SHALL be stored in dedicated containers namespaced by `tenant_id`. SAS tokens SHALL be scoped to the tenant container with minimum required permissions and short expiry (≤ 1 hour). |
| **MT-005** | Tenant configuration (enabled modules, plan tier, customizations) SHALL be stored server-side in a `tenant_config` table and returned at session initialization. Client-side entitlement caches SHALL be cryptographically signed and verified on each API request. |
| **MT-006** | Tenant onboarding SHALL be an automated workflow: domain verification → geo-region assignment → schema provisioning → seed data creation → admin user invitation. Target completion: < 5 minutes automated. |
| **MT-007** | Tenant offboarding SHALL trigger a 30-day retention window, then irreversible deletion cascade across all tenant data stores, audit logs, and blob storage. A signed deletion certificate SHALL be generated and delivered to the tenant admin. |

#### 4.2.2 Tenant Configuration & Customisation

| ID | Requirement |
|---|---|
| **MT-010** | Each tenant SHALL be able to configure: institution name, logo, primary colour, timezone, locale, currency, academic calendar structure. |
| **MT-011** | Each tenant SHALL have a custom subdomain (`<slug>.oneedu.io`) and optionally a custom domain with SSL certificate auto-provisioned via Azure Front Door. |
| **MT-012** | Module enablement SHALL be controlled by the platform admin (based on subscription) and optionally delegated to the institute admin within plan limits. |
| **MT-013** | Tenant plans and module entitlements SHALL be enforced server-side on every API endpoint. A client presenting a forged entitlement claim SHALL receive HTTP 403 with an audit log entry. |

#### 4.2.3 Cross-Tenant Features

| ID | Requirement |
|---|---|
| **MT-020** | The Marketplace module SHALL allow tenants to publish courses discoverable by students across the tenant network, subject to tenant opt-in. Transactional data (purchases, enrolments) SHALL remain in each respective tenant's schema. |
| **MT-021** | Cross-tenant student enrolment (a student attending School A as primary and Tuition Centre B as secondary) SHALL be supported via the `StudentEnrollment` model. Each institution's data about the student SHALL remain siloed in their respective schemas; only the One Edu ID is shared. |
| **MT-022** | Platform Admin reporting SHALL aggregate metrics via a dedicated analytics replica that is refreshed on a schedule, never via direct cross-tenant schema queries on the transactional DB. |

---

### 4.3 Geo-Separation & Data Residency

#### 4.3.1 Geo-Regions

The platform SHALL operate in the following Azure geo-regions:

| Geo-Region ID | Primary Region | DR Region | Jurisdictions Served | Key Regulations |
|---|---|---|---|---|
| **GEO-EU** | West Europe (Netherlands) | North Europe (Ireland) | EU member states, EEA | EU GDPR, ePrivacy |
| **GEO-UK** | UK South (London) | UK West (Cardiff) | United Kingdom | UK GDPR, DPA 2018, KCSIE, ICO Children's Code |
| **GEO-APAC-SA** | Central India (Pune) | South India (Chennai) | India, Sri Lanka | DPDP Act (India), PDPA (Sri Lanka) |
| **GEO-APAC-SEA** | Southeast Asia (Singapore) | East Asia (Hong Kong) | Singapore, Thailand, Malaysia | PDPA (Thailand/Singapore), PDPC |
| **GEO-ME** | UAE North (Dubai) | UAE Central (Abu Dhabi) | UAE, GCC | UAE PDPL |
| **GEO-NA** | East US (Virginia) | West US 2 (Washington) | USA, Canada | FERPA, COPPA, PIPEDA |

#### 4.3.2 Data Residency Enforcement

| ID | Requirement |
|---|---|
| **GEO-001** | All personally identifiable information (PII) for a tenant SHALL be stored exclusively within the tenant's assigned geo-region. Cross-region replication of PII SHALL NOT occur except where contractually authorised and subject to an approved transfer mechanism (e.g. Standard Contractual Clauses for EU→UK transfers). |
| **GEO-002** | The geo-region assignment SHALL be recorded in the global control plane tenant registry alongside the legal basis for any cross-border data flows. |
| **GEO-003** | Database backups SHALL be stored in the same geo-region as the primary database. Backup storage SHALL use Azure Backup with Geo-Redundant Storage (GRS) only within the same regulatory jurisdiction. |
| **GEO-004** | AI/ML model inference for tenant data (AI Insights module) SHALL execute within the tenant's geo-region. No tenant data SHALL be sent to a model endpoint outside the geo-region boundary without explicit consent and DPA addendum. |
| **GEO-005** | CDN edge caching (Azure Front Door) SHALL be configured to cache only non-PII static assets globally. All API responses containing PII SHALL have `Cache-Control: private, no-store` headers. |
| **GEO-006** | The system SHALL expose a **Data Residency Attestation API** allowing tenants to programmatically query where their data is stored and retrieve a signed residency certificate. |
| **GEO-007** | Tenant-initiated geo-migration (e.g. UK school relocating operations to EU) SHALL be supported as a formal procedure: data export → DPA review → import to new region → dual-run validation period → old-region deletion with certificate. Estimated migration window: 72 hours with zero data loss guarantee. |

#### 4.3.3 Global Control Plane

| ID | Requirement |
|---|---|
| **GEO-010** | A global control plane (Azure East US, replicated to West Europe) SHALL manage: tenant registry (non-PII metadata only), One Edu ID namespace, billing/subscription records, platform admin access, inter-region routing. |
| **GEO-011** | The global control plane SHALL NOT store any student PII or educational records. Tenant metadata stored globally is limited to: tenant ID, slug, geo-region, plan tier, creation date, status. |
| **GEO-012** | All inter-region communications (e.g. Marketplace course discovery) SHALL transit via encrypted API calls authenticated with service-to-service mTLS certificates. |

---

### 4.4 Module Entitlement System

| ID | Requirement |
|---|---|
| **MOD-001** | The 21 platform modules SHALL be: `core`, `students`, `courses`, `attendance`, `calendar`, `lms`, `assignments`, `grades`, `srb`, `teaching`, `family`, `finance`, `marketing`, `marketplace`, `messages`, `ai`, `reports`, `tenants`, `users`, `migration`, `compliance`. |
| **MOD-002** | Module entitlements SHALL be enforced at the API gateway layer via a signed entitlement token returned at login. Every API route SHALL declare its required module; the gateway SHALL reject requests for disabled modules with HTTP 402. |
| **MOD-003** | The frontend `ModuleGate` component SHALL remain as a UX gate only. It SHALL never be the sole enforcement point. |
| **MOD-004** | Module usage SHALL be telemetered per tenant to support billing, capacity planning, and churn analysis. Telemetry SHALL be processed within the tenant's geo-region before aggregation. |
| **MOD-005** | Plan tier upgrades SHALL be reflected in active sessions within 60 seconds via server-sent event (SSE) push without requiring logout. |

---

### 4.5 Core Application Modules

#### 4.5.1 Students Module

| ID | Requirement |
|---|---|
| **STU-001** | The system SHALL maintain a student profile with: legal name, preferred name, DOB, gender (with non-binary options), nationality, photo (with consent flag), contact details, guardian relationships, medical notes (encrypted at rest), SEN flags, dietary requirements. |
| **STU-002** | Student profile photos SHALL require explicit consent from the guardian on upload. Consent SHALL be recorded with timestamp and guardian user ID. |
| **STU-003** | Cross-tenant enrolment SHALL allow a student to be enrolled at up to 10 institutions simultaneously. Each institution sees only the data relevant to their relationship with the student. |
| **STU-004** | The system SHALL support bulk student import via CSV with field mapping, duplicate detection (by One Edu ID, then by name+DOB), validation report, and dry-run preview before commit. |
| **STU-005** | Student records SHALL support a complete audit trail: every field change records the previous value, new value, changed-by user, and timestamp. |

#### 4.5.2 Courses & LMS Module

| ID | Requirement |
|---|---|
| **CRS-001** | Courses SHALL have: title, description, subject, year group, teacher(s), capacity, enrolment period, status (draft/active/archived). |
| **CRS-002** | The LMS module SHALL support SCORM 1.2 / SCORM 2004 / xAPI content packages hosted in tenant blob storage. |
| **CRS-003** | Course content SHALL be version-controlled; rolling back to a previous version SHALL be possible without data loss. |
| **CRS-004** | The system SHALL track learner progress (completion percentage, time-on-content, quiz scores) with xAPI statements stored in a Learning Record Store (LRS) per tenant. |

#### 4.5.3 Attendance Module

| ID | Requirement |
|---|---|
| **ATT-001** | The attendance module SHALL support the following capture methods: Manual (teacher mark), QR code scan, RFID card tap, GPS geofence, Facial recognition. |
| **ATT-002** | Biometric attendance methods (Facial Recognition, RFID where linked to biometric data) SHALL require: (a) a completed and approved Data Protection Impact Assessment (DPIA) per tenant, (b) explicit written consent from the student/guardian, (c) consent recorded in the system with opt-out capability that does not disadvantage the student. |
| **ATT-003** | Facial recognition processing SHALL occur on-premises or within the tenant's geo-region; biometric templates SHALL NOT be transmitted outside the geo-region boundary. |
| **ATT-004** | GPS attendance SHALL record the geofence boundary used at time of capture and SHALL be disabled in jurisdictions where location tracking of minors requires additional parental consent beyond what the platform collects by default. |
| **ATT-005** | Attendance records SHALL be immutable once confirmed by a teacher; corrections SHALL create a new corrected record linked to the original with reason and authoriser. |
| **ATT-006** | The system SHALL generate automated absence alerts to guardian contacts after a configurable threshold (default: 1 unexcused absence) via in-app notification, email, and/or SMS. |

#### 4.5.4 Grades & Assignments Module

| ID | Requirement |
|---|---|
| **GRD-001** | The system SHALL support configurable grading schemes per course: percentage, letter grade (A–F), GPA scale, custom rubric. |
| **GRD-002** | Assignment submissions SHALL support: file upload (max 100MB per submission, configurable), text entry, link submission, and external tool integration (Google Drive, OneDrive). |
| **GRD-003** | Plagiarism detection integration (e.g. Turnitin API) SHALL be available as an optional module add-on for Enterprise tier. |
| **GRD-004** | Grade book exports SHALL be available in CSV, PDF, and Excel formats with configurable column sets. |

#### 4.5.5 Student Record Book (SRB)

| ID | Requirement |
|---|---|
| **SRB-001** | SRB entry types SHALL include: Academic Note, Behaviour (Positive/Concern), Health & Wellbeing, Homework Log, Safeguarding Flag, Permission Slip, General Communication. |
| **SRB-002** | Safeguarding Flag entries SHALL trigger an immediate in-app notification to the Designated Safeguarding Lead (DSL) role and SHALL NOT be visible to the student or parent without DSL approval. |
| **SRB-003** | Entries requiring acknowledgement SHALL track: acknowledged by (guardian user ID), acknowledged at (timestamp), IP address of acknowledgement. Unacknowledged entries after a configurable period SHALL escalate via notification. |
| **SRB-004** | SRB data SHALL be retained for a minimum of the statutory period in the tenant's jurisdiction (e.g. 25 years in UK for safeguarding records). Retention policy SHALL be configurable per entry type with floor set by jurisdiction. |
| **SRB-005** | SRB SHALL NOT be included in DSAR exports without DSL review for safeguarding entries. |

#### 4.5.6 Finance Module

| ID | Requirement |
|---|---|
| **FIN-001** | The system SHALL support multi-currency invoicing. Exchange rates SHALL be sourced from a configurable FX rate API (e.g. Open Exchange Rates) refreshed daily. |
| **FIN-002** | Payment processing SHALL integrate with Stripe (primary) and optionally PayHere (Sri Lanka), Razorpay (India), and Telr (UAE) based on tenant geo-region. |
| **FIN-003** | The system SHALL NOT store raw card details. All card data SHALL be tokenised by the payment gateway. PCI DSS compliance is the responsibility of the payment gateway provider. |
| **FIN-004** | Invoices SHALL be generated in PDF format compliant with the e-invoicing requirements of the tenant's jurisdiction (e.g. GST-compliant for India, VAT-compliant for UAE/UK). |
| **FIN-005** | The system SHALL support fee schedule templates, discount codes, sibling discounts, and scholarship fee waivers. |

#### 4.5.7 Messages & Notifications Module

| ID | Requirement |
|---|---|
| **MSG-001** | In-app messaging SHALL be real-time (WebSocket / Server-Sent Events). Messages SHALL be end-to-end scoped to the tenant; cross-tenant messaging is not permitted. |
| **MSG-002** | Push notifications SHALL be delivered via Firebase Cloud Messaging (Android) and Apple Push Notification Service (iOS) when a Progressive Web App notification token is registered. |
| **MSG-003** | SMS notifications SHALL use Azure Communication Services as the primary provider, with Twilio as fallback. |
| **MSG-004** | All message content SHALL be stored within the tenant's geo-region. Message metadata (sender ID, recipient ID, timestamp) SHALL be retained for audit purposes per the tenant's retention policy. |
| **MSG-005** | Bulk announcements (school-wide broadcasts) SHALL be rate-limited at the API layer to prevent accidental or malicious notification flooding. |

#### 4.5.8 AI Insights Module

| ID | Requirement |
|---|---|
| **AI-001** | AI Insights SHALL operate exclusively on anonymised or pseudonymised aggregates derived from the tenant's own data. Individual student data SHALL NOT be used to train shared models. |
| **AI-002** | AI model inference SHALL execute within the tenant's geo-region using Azure OpenAI Service regional deployments. |
| **AI-003** | The system SHALL provide an explainability layer for AI-generated recommendations: each insight SHALL include a plain-language explanation of the contributing factors. |
| **AI-004** | AI Insights involving individual students (e.g. "at-risk" flags) SHALL require a teacher or admin to confirm before the flag is surfaced to other users. Automated student-facing AI decisions are prohibited. |
| **AI-005** | A **transparency notice** SHALL be displayed to parents/guardians explaining AI usage in the system, accessible from the family portal. This is required under UK ICO Children's Code principle 14. |

#### 4.5.9 Compliance Module

| ID | Requirement |
|---|---|
| **CMP-001** | The Compliance module SHALL be available to all tenants (included in Core) as a read-only dashboard for institute admins and a management interface for compliance officers. |
| **CMP-002** | The system SHALL maintain an **immutable audit log** of all security-significant events: login/logout, failed auth, permission changes, data exports, DSAR actions, admin configuration changes. Audit records SHALL be write-once and tamper-evident (hash-chained). |
| **CMP-003** | The system SHALL manage the **DSAR lifecycle**: intake → identity verification → data assembly → review → delivery → closure. SLA timers SHALL be jurisdictionally configured (e.g. 30 days for GDPR, 45 days for CCPA). |
| **CMP-004** | DSAR data assembly SHALL automatically collect records across all modules for the identified data subject. For safeguarding SRB entries, DSL review SHALL be required before inclusion. |
| **CMP-005** | The system SHALL provide a **Consent Management** interface: recording consent basis for each data processing activity, tracking consent withdrawal, and triggering data deletion workflows on erasure requests. |
| **CMP-006** | The system SHALL produce a **Record of Processing Activities (RoPA)** report in machine-readable format (JSON/CSV) for each tenant, meeting Article 30 GDPR / equivalent requirements. |
| **CMP-007** | Automated **data retention enforcement** SHALL purge records past their retention period in a scheduled background job, generating a deletion report for the compliance officer. |
| **CMP-008** | **Data Protection Impact Assessments (DPIA)** SHALL be tracked for high-risk processing activities (biometric attendance, AI profiling). The system SHALL block enabling biometric methods without a completed and approved DPIA record. |

---

### 4.6 Platform Administration

| ID | Requirement |
|---|---|
| **ADM-001** | Platform Admin SHALL have a dedicated admin console (separate URL, separate auth flow) not accessible from the tenant-facing application. |
| **ADM-002** | Platform Admin SHALL be able to: create/suspend/delete tenants, view cross-tenant usage metrics, manage subscription plans, access compliance oversight dashboard, trigger geo-migration workflows. |
| **ADM-003** | All Platform Admin actions SHALL be logged in the global audit log with action type, actor, affected tenant, timestamp, and outcome. |
| **ADM-004** | The system SHALL support **Break-Glass Access**: an emergency procedure for Platform Admin to access tenant data in a declared incident. Break-glass access SHALL require multi-approver authorisation, automatic notification to the tenant admin, time-limited session (max 2 hours), and a full audit trail. |
| **ADM-005** | The system SHALL provide **health dashboards** per geo-region: database utilisation, API p95 latency, error rates, storage consumption, active tenant count, queue depths. |

---

### 4.7 Data Migration Module

| ID | Requirement |
|---|---|
| **MIG-001** | The migration module SHALL support bulk import of: Students, Guardians, Staff, Courses, Enrolments, Historical Grades, Historical Attendance from CSV and JSON formats. |
| **MIG-002** | Migration SHALL support legacy system mapping: the system SHALL accept a `legacyId` and `legacySystem` field per imported record, persisting the mapping for post-migration reconciliation. |
| **MIG-003** | Every import job SHALL produce a detailed validation report before commit: row count, validation errors by row, duplicate detections, field mapping warnings. |
| **MIG-004** | Migration jobs SHALL be idempotent: re-running an import with the same source data SHALL produce the same result without creating duplicates. |
| **MIG-005** | Large migration jobs (> 10,000 records) SHALL be processed asynchronously via a background job queue. Progress SHALL be streamed to the UI in real time. The UI SHALL support pausing and resuming a migration job. |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement |
|---|---|
| **PERF-001** | API response time SHALL be ≤ 200ms at p95 for read operations under normal load (defined as 80% of peak concurrent users). |
| **PERF-002** | Page Time-to-Interactive (TTI) SHALL be ≤ 3 seconds on a 4G mobile connection (10 Mbps / 50ms RTT). |
| **PERF-003** | The system SHALL support 500 concurrent users per mid-sized tenant (≤ 5,000 users) without degradation. |
| **PERF-004** | Bulk exports (grade book, attendance report) > 10,000 rows SHALL be processed asynchronously and delivered via download link. |
| **PERF-005** | Database query time SHALL be ≤ 50ms at p99 for indexed lookups. Slow query threshold (> 1s) SHALL trigger an alert to the engineering on-call. |

### 5.2 Availability & Reliability

| ID | Requirement |
|---|---|
| **REL-001** | The system SHALL target **99.9% monthly uptime** (≤ 43 minutes downtime/month) per geo-region for Growth/Enterprise tenants. |
| **REL-002** | Planned maintenance windows SHALL be outside school hours in the tenant's timezone (default: Saturday 02:00–05:00 local). Tenants SHALL receive 72 hours advance notice. |
| **REL-003** | The system SHALL implement **automated failover** from primary to DR Azure region with RTO ≤ 15 minutes and RPO ≤ 5 minutes. |
| **REL-004** | Database backups SHALL run every 6 hours with point-in-time recovery capability for the last 35 days. |
| **REL-005** | The frontend SHALL implement a **graceful degradation** mode: core read operations (view student list, view timetable) SHALL remain functional even if non-critical backend services are unavailable. |

### 5.3 Scalability

| ID | Requirement |
|---|---|
| **SCL-001** | The application tier SHALL scale horizontally via Azure Container Apps with auto-scaling rules based on CPU, memory, and request queue depth. |
| **SCL-002** | The database tier SHALL support vertical scaling (Azure PostgreSQL Flexible Server compute tier changes) with ≤ 5-minute maintenance window. Read replicas SHALL be provisioned automatically when tenant count exceeds 50 per region. |
| **SCL-003** | The architecture SHALL support growth to 10,000 tenants and 5 million users without architectural redesign. |

### 5.4 Maintainability & Observability

| ID | Requirement |
|---|---|
| **OBS-001** | All services SHALL emit structured logs (JSON) to Azure Monitor Log Analytics with correlation IDs linking frontend → API → database. |
| **OBS-002** | Distributed tracing SHALL be implemented via OpenTelemetry with traces exported to Azure Application Insights. |
| **OBS-003** | Business metrics (daily active users, active enrolments, DSAR queue depth, module usage) SHALL be published to a Grafana dashboard accessible to Platform Admin. |
| **OBS-004** | Alert policies SHALL be configured for: error rate > 1%, p99 latency > 2s, failed login spike > 50/min per tenant, disk usage > 80%, certificate expiry < 30 days. |

---

## 6. Compliance & Regulatory Matrix

### 6.1 Regulation Coverage by Geo-Region

| Regulation | GEO-EU | GEO-UK | GEO-APAC-SA | GEO-APAC-SEA | GEO-ME | GEO-NA |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| EU GDPR | ● | | | | | |
| UK GDPR + DPA 2018 | | ● | | | | |
| KCSIE (UK safeguarding) | | ● | | | | |
| ICO Children's Code | | ● | | | | |
| DPDP Act (India 2023) | | | ● | | | |
| PDPA (Sri Lanka) | | | ● | | | |
| PDPA (Thailand) | | | | ● | | |
| PDPC (Singapore) | | | | ● | | |
| UAE PDPL | | | | | ● | |
| FERPA (USA) | | | | | | ● |
| COPPA (USA, <13) | | | | | | ● |
| PIPEDA (Canada) | | | | | | ● |
| ISO 27001 | ● | ● | ● | ● | ● | ● |
| SOC 2 Type II | ● | ● | ● | ● | ● | ● |
| Cyber Essentials Plus (UK) | | ● | | | | |

### 6.2 Key Compliance Requirements by Domain

#### Data Subject Rights

| Right | GDPR | UK GDPR | FERPA | COPPA | DPDP |
|---|---|---|---|---|---|
| Access | 30 days | 30 days | 45 days (school days) | N/A | 30 days |
| Erasure ("Right to be Forgotten") | ✓ | ✓ | Limited | Parental only | ✓ |
| Portability | ✓ | ✓ | N/A | N/A | ✓ |
| Rectification | ✓ | ✓ | ✓ | ✓ | ✓ |
| Restriction of Processing | ✓ | ✓ | N/A | N/A | ✓ |
| Object to Processing | ✓ | ✓ | N/A | N/A | ✓ |

#### Children's Data (Under-18)

| ID | Requirement |
|---|---|
| **COMP-CH-001** | For data subjects under the age of digital consent (13 in USA/UK/most jurisdictions; verify per region), parental/guardian consent SHALL be required for all non-essential data processing. |
| **COMP-CH-002** | The system SHALL implement age-appropriate design principles: no behavioural advertising, no profiling that could harm children, default privacy settings at maximum protection. |
| **COMP-CH-003** | Student photos, location data, and biometric data SHALL be classified as **Special Category** and SHALL require explicit consent with clear purpose limitation. |
| **COMP-CH-004** | The system SHALL maintain a register of all processing activities involving children's data with legal basis documented for each. |

#### Data Breach Response

| ID | Requirement |
|---|---|
| **COMP-BR-001** | The system SHALL detect and alert on potential data breaches (anomalous data access patterns, bulk exports outside business hours) via automated monitoring. |
| **COMP-BR-002** | A breach response workflow SHALL be built into the Compliance module: detection → containment → impact assessment → notification drafting (pre-populated from audit log) → regulatory notification (72 hours for GDPR) → documentation. |
| **COMP-BR-003** | Breach notifications SHALL be templated per jurisdiction with pre-populated mandatory fields from the audit log to minimise time-to-notify. |

---

## 7. Data Architecture Requirements

### 7.1 Data Classification

| Classification | Examples | Encryption | Retention |
|---|---|---|---|
| **Public** | Course catalogue, school name | In-transit | Indefinite |
| **Internal** | Attendance statistics, grade distributions | In-transit + at-rest (AES-256) | Per academic year + 3 years |
| **Confidential — PII** | Student name, DOB, contact details, grades | In-transit + at-rest + field-level for high-risk | Per jurisdiction minimum (see §6) |
| **Restricted — Special Category** | Medical notes, biometric data, safeguarding records, SEN data | In-transit + at-rest + field-level (AES-256-GCM) + key per tenant | Statutory minimum (e.g. 25 years UK safeguarding) |

### 7.2 Encryption Requirements

| ID | Requirement |
|---|---|
| **ENC-001** | All data in transit SHALL use TLS 1.3. TLS 1.2 is permitted for legacy client compatibility only with specific cipher suites whitelisted. TLS 1.0/1.1 SHALL be disabled. |
| **ENC-002** | All data at rest SHALL be encrypted using AES-256 via Azure Storage Service Encryption and Azure Disk Encryption. |
| **ENC-003** | Special Category fields (medical notes, biometric templates, safeguarding SRB entries) SHALL be encrypted at the application layer using per-tenant keys managed in Azure Key Vault. |
| **ENC-004** | Azure Key Vault keys SHALL be rotated annually (automatic). Key rotation SHALL not cause downtime; dual-key periods SHALL allow decryption of data encrypted with the previous key. |
| **ENC-005** | Database connection strings and API secrets SHALL be stored exclusively in Azure Key Vault. No credentials SHALL appear in source code, environment variable files committed to version control, or application logs. |

### 7.3 Data Retention Defaults

| Data Type | Default Retention | Configurable | Floor (Cannot Go Below) |
|---|---|---|---|
| Student academic records | Duration of enrolment + 7 years | Yes (max 25 years) | Duration of enrolment |
| Safeguarding / SRB records | 25 years (UK) / 10 years (others) | Yes, per jurisdiction | Statutory minimum |
| Audit logs | 7 years | Yes | 2 years |
| Session tokens | 24 hours | No | — |
| Failed login attempts | 90 days | No | — |
| Deleted user data | 30-day recovery window then purge | No | — |
| DSAR request records | 3 years from closure | No | — |
| Financial records | 7 years (HMRC UK) / per jurisdiction | Yes, per jurisdiction | Statutory minimum |

---

## 8. External Interface Requirements

### 8.1 API Design

| ID | Requirement |
|---|---|
| **API-001** | The system SHALL expose a RESTful API (v1) and a GraphQL API for complex data queries. All endpoints SHALL be versioned. Breaking changes require a new version with 12-month deprecation notice. |
| **API-002** | All API responses SHALL include: request ID header, rate-limit headers, geo-region header, and deprecation warning header where applicable. |
| **API-003** | The API SHALL implement rate limiting: 1,000 requests/minute per tenant (burst: 2,000), 100 requests/minute per user. Limits SHALL be configurable per plan tier. |
| **API-004** | A public API (for third-party integrations) SHALL require OAuth 2.0 client credentials with scopes declared per module. |
| **API-005** | Webhook support SHALL be provided for key events: student enrolled, grade published, attendance recorded, DSAR submitted, invoice paid. Webhooks SHALL be signed (HMAC-SHA256) and retried with exponential backoff on failure. |

### 8.2 Third-Party Integrations

| System | Purpose | Integration Method |
|---|---|---|
| Microsoft Entra ID / Google Workspace | SSO / OIDC federation | OAuth 2.0 / SAML 2.0 |
| Stripe / Razorpay / PayHere / Telr | Payment processing | REST API (server-side only) |
| Azure Communication Services | Email + SMS notifications | Azure SDK |
| Azure OpenAI Service | AI Insights inference | REST API (within geo-region) |
| Firebase Cloud Messaging / APNS | Push notifications | Server-side SDK |
| Turnitin | Plagiarism detection (Enterprise) | LTI 1.3 |
| Open Exchange Rates | FX rate feed | REST API (daily scheduled) |
| HaveIBeenPwned | Password breach check | k-anonymity REST API |

---

## 9. Security Requirements

### 9.1 Application Security

| ID | Requirement |
|---|---|
| **SEC-001** | The system SHALL pass an OWASP Top 10 assessment with zero Critical or High findings before each major release. |
| **SEC-002** | All user-supplied input SHALL be validated server-side using a schema validation library (Zod). Client-side validation is supplementary only. |
| **SEC-003** | The system SHALL implement Content Security Policy (CSP) headers preventing XSS. Inline scripts SHALL be prohibited. |
| **SEC-004** | SQL injection SHALL be prevented via parameterised queries enforced at the ORM layer. Raw SQL SHALL be reviewed in a security PR gate. |
| **SEC-005** | CSRF protection SHALL be implemented via SameSite=Strict cookies and per-session CSRF tokens for state-changing operations. |
| **SEC-006** | HTTP security headers SHALL be set: `Strict-Transport-Security` (2 years + preload), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin`. |
| **SEC-007** | A mandatory **penetration test** SHALL be conducted by an accredited third party (CHECK / CREST) prior to production launch and annually thereafter. |
| **SEC-008** | A **Bug Bounty Program** SHALL be established (via HackerOne or Bugcrowd) within 6 months of production launch. |
| **SEC-009** | The system SHALL implement **anomaly detection** for: impossible travel (login from two geographically distant IPs within short timeframe), bulk data downloads, after-hours admin access. |

### 9.2 Infrastructure Security

| ID | Requirement |
|---|---|
| **SEC-020** | All Azure resources SHALL be deployed within a Virtual Network (VNet). Public internet access SHALL be limited to Azure Front Door (CDN/WAF) and API Gateway only. |
| **SEC-021** | Azure Web Application Firewall (WAF) SHALL be enabled in Prevention mode on all public endpoints. |
| **SEC-022** | Azure DDoS Protection Standard SHALL be enabled on all production VNets. |
| **SEC-023** | Database instances SHALL have no public endpoint. Access SHALL be via Private Endpoint only. |
| **SEC-024** | Azure Defender for Cloud SHALL be enabled with the Defender for Databases, Defender for Containers, and Defender for App Service plans. |
| **SEC-025** | All VM/container images SHALL be scanned for vulnerabilities on build and weekly thereafter. Images with Critical CVEs SHALL not be deployed. |
| **SEC-026** | Privileged access to production infrastructure SHALL require Privileged Identity Management (PIM) just-in-time elevation with approval and time-limited access (max 8 hours). |

---

## 10. Deployment Architecture

### 10.1 Environment Overview

| Environment | Purpose | Scale | Data | Refresh Cadence |
|---|---|---|---|---|
| **Development (DEV)** | Active development, feature branches | Minimal (1 instance each) | Anonymised seed data | Continuous (CI/CD on every push) |
| **QA** | Functional testing, integration testing, regression | 25% production scale | Anonymised production-like data | On PR merge to `develop` |
| **UAT** | User acceptance testing, performance testing, client demos | 50% production scale | Anonymised production clone (refreshed weekly) | On release candidate promotion |
| **Production** | Live tenants | Full scale, auto-scaling | Live data, geo-separated | On approved release (change management) |

### 10.2 Azure Service Stack per Geo-Region

```
┌──────────────────────────────────────────────────────────────────┐
│  Azure Geo-Region (e.g. GEO-UK: UK South + UK West)             │
│                                                                  │
│  ┌─────────────┐    ┌──────────────────────────────────────┐    │
│  │ Azure Front │    │  Application Tier (VNet)             │    │
│  │ Door (WAF)  │───▶│  Azure Container Apps (auto-scale)   │    │
│  └─────────────┘    │  • API Server (TanStack Start/Nitro)  │    │
│                     │  • Background Job Workers            │    │
│                     │  • WebSocket/SSE Server              │    │
│                     └────────────┬─────────────────────────┘    │
│                                  │                               │
│  ┌───────────────────────────────┼───────────────────────┐      │
│  │  Data Tier (Private Endpoints)│                        │      │
│  │  ┌─────────────────────┐  ┌──▼──────────────────────┐ │      │
│  │  │  Azure PostgreSQL   │  │  Azure Blob Storage     │ │      │
│  │  │  Flexible Server    │  │  (per-tenant containers)│ │      │
│  │  │  (Primary + HA)     │  └─────────────────────────┘ │      │
│  │  └─────────────────────┘                               │      │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐ │      │
│  │  │  Azure Redis Cache  │  │  Azure Service Bus      │ │      │
│  │  │  (session + rate    │  │  (background jobs /     │ │      │
│  │  │   limit counters)   │  │   event streaming)      │ │      │
│  │  └─────────────────────┘  └─────────────────────────┘ │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  Security & Ops                                        │      │
│  │  Azure Key Vault │ Azure Monitor │ Defender for Cloud │      │
│  └───────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### 10.3 CI/CD Pipeline

| Stage | Trigger | Gates |
|---|---|---|
| Build & Unit Test | Push to any branch | All unit tests pass, TypeScript build clean, ESLint zero errors |
| Security Scan | Push to any branch | Snyk/Dependabot zero Critical vulnerabilities, SAST (GitHub Advanced Security) zero High findings |
| Deploy to DEV | Merge to `develop` | Build gates pass |
| Integration Test | Deploy to DEV | All API integration tests pass, Playwright smoke tests pass |
| Deploy to QA | PR to `main` | Integration test gates pass |
| Full Regression | Deploy to QA | Full test suite (unit + integration + E2E), accessibility audit (WCAG 2.1 AA) |
| Deploy to UAT | Release candidate tag | QA gate pass + manual QA sign-off |
| Performance Test | Deploy to UAT | k6 load test: p95 < 500ms at 200 concurrent users |
| Deploy to Production | Manual approval (change management) | UAT sign-off + performance gate + security review |

### 10.4 Disaster Recovery

| Scenario | RTO | RPO | Recovery Procedure |
|---|---|---|---|
| Single Container failure | < 1 min | 0 | Auto-restart by Container Apps health probe |
| AZ outage within region | < 5 min | 0 | Zone-redundant deployment auto-failover |
| Full primary region outage | < 15 min | < 5 min | Azure Traffic Manager DR failover + PostgreSQL geo-restore |
| Accidental mass data deletion | < 4 hours | < 6 hours | PITR (Point-in-Time Recovery) from backup |
| Ransomware / data corruption | < 24 hours | < 24 hours | Restore from immutable backup (Azure Backup with soft-delete) |

---

## 11. Glossary

| Term | Definition |
|---|---|
| **RTO** | Recovery Time Objective — maximum acceptable downtime |
| **RPO** | Recovery Point Objective — maximum acceptable data loss |
| **PII** | Personally Identifiable Information |
| **DPIA** | Data Protection Impact Assessment |
| **RoPA** | Record of Processing Activities |
| **LRS** | Learning Record Store (xAPI) |
| **SCORM** | Sharable Content Object Reference Model |
| **xAPI** | Experience API (also known as Tin Can API) |
| **LTI** | Learning Tools Interoperability standard |
| **SLO** | Service Level Objective |
| **SLA** | Service Level Agreement |
| **WAF** | Web Application Firewall |
| **PIM** | Privileged Identity Management |
| **CSP** | Content Security Policy |
| **HMAC** | Hash-based Message Authentication Code |
| **mTLS** | Mutual TLS — both parties authenticate with certificates |
| **OIDC** | OpenID Connect |
| **DSL** | Designated Safeguarding Lead |
| **SEN** | Special Educational Needs |

---

## 12. Appendix: Current Prototype Gap Analysis

This section maps every significant production gap identified in the current prototype (`modular-showcase-suite` codebase) to the requirements that address it.

| Gap | Current State | Production Requirement |
|---|---|---|
| **Authentication** | Plaintext passwords in `localStorage`. No tokens. | AUTH-001 to AUTH-023 (Argon2id, JWT, MFA, OIDC) |
| **Data Persistence** | Browser `localStorage` only | Full PostgreSQL schema per tenant (MT-001 to MT-003) |
| **Tenant Isolation** | Client-side array filtering — all data loaded to browser | Server-side RLS, ORM-enforced tenant scoping (MT-002, MT-003) |
| **RBAC Enforcement** | Navigation-level only; no API enforcement | Server-side RBAC on every endpoint (MT-013) |
| **Module Entitlements** | `localStorage` flag checked at render time | API gateway enforcement + signed entitlement tokens (MOD-002, MOD-003) |
| **Geo-Separation** | UI text only ("Data residency: UK · London") | Full geo-regional deployment with data boundary enforcement (GEO-001 to GEO-012) |
| **Compliance / DSAR** | Static mock data displayed in UI | Full DSAR lifecycle management, audit log, consent management (CMP-001 to CMP-008) |
| **Audit Logging** | Mock data array in `mockData.ts` | Immutable, tamper-evident, hash-chained audit log (CMP-002) |
| **Biometric Attendance** | Methods listed in UI; no data captured | DPIA gating, consent recording, geo-bounded processing (ATT-002 to ATT-004) |
| **API Layer** | Single example `getGreeting` server function | Full RESTful + GraphQL API with auth, rate limiting, versioning (API-001 to API-005) |
| **Database Schema** | No schema — TypeScript interfaces in mockData.ts | Full PostgreSQL schema design (MT-001, ENC-001 to ENC-005) |
| **Secret Management** | Placeholder comments in config.server.ts | Azure Key Vault for all secrets (ENC-005) |
| **Backup / DR** | None | Automated backups, PITR, geo-redundancy, RTO/RPO targets (REL-003, REL-004) |
| **Security Headers** | None implemented | CSP, HSTS, WAF, DDoS protection (SEC-003, SEC-006, SEC-021, SEC-022) |
| **AI Insights** | Static mock insights array | Geo-bounded Azure OpenAI inference, explainability, human-in-the-loop (AI-001 to AI-005) |

---

*End of Software Requirements Specification*

*Next documents in series: Cost Estimation Report (Development & Hosting) — Azure DEV / QA / UAT / Production*
