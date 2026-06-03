# Cost Estimation Report
## One Edu — Education Super App
### Development Cost, Timeline & Azure Hosting Environments

---

| Field | Value |
|---|---|
| Document Version | 1.0.0 |
| Based On | SRS-OneEdu-Production v1.0.0 |
| Date | 2026-06-04 |
| Classification | Internal / Confidential |
| Currency | USD (all figures) |

> **Exchange references used:** £1 GBP ≈ $1.27 USD · €1 EUR ≈ $1.08 USD · ₹1 INR ≈ $0.012 USD  
> **Azure pricing:** Based on Azure public pricing as of June 2026 (East US reference region; regional pricing varies ±5–15%)

---

## Executive Summary

| Item | Scenario A: Onshore | Scenario B: Hybrid Offshore |
|---|---|---|
| **Project Duration** | 18 months | 18 months |
| **Team Size (peak)** | 11–12 FTE | 11–12 FTE |
| **Dev + QA Cost (base)** | $2,656,000 | $1,336,000 |
| **Contingency (20%)** | $531,200 | $267,200 |
| **Dev + QA Total** | **$3,187,200** | **$1,603,200** |
| **Azure Hosting (18 months, DEV+QA+UAT)** | $42,720 | $42,720 |
| **Third-Party Licences & Compliance** | $148,000 | $148,000 |
| **Total Project Cost (excl. Production)** | **~$3,378,000** | **~$1,794,000** |
| **Production Hosting (per geo-region/month)** | ~$5,800/mo | ~$5,800/mo |

> **Scenario A** — Onshore: Senior engineers based in UK/US/EU markets.  
> **Scenario B** — Hybrid: Onshore tech lead, DevOps, BA/PM + offshore delivery team (India/Sri Lanka).  
> Both scenarios assume the same 18-month timeline and deliverable quality.

---

## Part 1: Development Cost Estimation

### 1.1 Project Timeline Overview

```
Month:  1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18
        ├────┤────┤────┤────┤────┤────┤────┤────┤────┤────┤────┤────┤────┤────┤────┤────┤────┤

Phase 0 ████████
  Architecture & Discovery (5 weeks)

Phase 1      ████████████████
  Infra Foundation (8 weeks)

Phase 2                ████████████████████████████████
  Core Modules (16 weeks)

Phase 3                               ████████████████████████████
  Extended Modules (14 weeks)

Phase 4                                              ████████████████████
  Platform & Admin (10 weeks)

Phase 5                                                        ████████████████████
  Compliance & Governance (10 weeks)

Phase 6                                                                    ████████████████
  Geo-Separation (8 weeks)

Phase 7                                                                           ████████████
  Migration Tools (6 weeks)

Phase 8                                                                                  ████████████
  Security Hardening (6 weeks)

Phase 9                                                                                        ████████
  Performance Testing (4 weeks)

Phase 10                                                                                        ████████████████
  UAT & Launch Prep (8 weeks)
```

---

### 1.2 Team Composition

| Role | Count | Engagement Period | Notes |
|---|---|---|---|
| Technical Lead / Architect | 1 | Full 18 months | Overall architecture, code review, critical path decisions |
| Senior Full-Stack Developer | 2 | Full 18 months | Auth, multi-tenancy, complex features |
| Mid-Level Backend Developer | 2 | Months 2–17 | Module implementation, API development |
| Mid-Level Frontend Developer | 2 | Months 2–17 | React/TanStack UI, mobile PWA |
| Senior DevOps / Cloud Engineer | 1 | Full 18 months | Azure IaC, CI/CD, monitoring, security ops |
| QA Engineer | 2 | Months 3–18 | Testing strategy, automation (Playwright/k6), UAT support |
| Security Engineer | 0.5 FTE | Months 6–12 (6 mo equiv.) | Security review, pen test prep, WAF tuning |
| Business Analyst / Project Manager | 1 | Full 18 months | Requirements, stakeholder management, docs |
| **Total (peak)** | **11.5 FTE** | | |

---

### 1.3 Phase-by-Phase Breakdown

#### Phase 0 — Architecture & Discovery (Weeks 1–5 | 5 calendar weeks)

**Goal:** Define technical architecture, database schema, API contracts, security model, CI/CD skeleton, and IaC templates before a line of production code is written.

| Activity | Assigned To | Person-Days |
|---|---|---|
| System architecture design & ADRs | Tech Lead | 20 |
| PostgreSQL schema design (multi-tenant RLS) | Tech Lead + Sr Dev | 15 |
| API contract design (REST + GraphQL) | Sr Dev | 10 |
| Security architecture & threat model | Tech Lead + Security Eng | 8 |
| Azure IaC skeleton (Bicep) for all envs | DevOps | 15 |
| CI/CD pipeline design (GitHub Actions) | DevOps | 8 |
| Project setup (repos, branching, conventions) | BA/PM | 5 |
| **Phase 0 Total** | | **81 person-days** |

---

#### Phase 1 — Infrastructure Foundation (Weeks 4–11 | 8 calendar weeks)

**Goal:** Production-grade Azure infrastructure deployed for DEV. Authentication, multi-tenancy DB layer, API framework, and module entitlement engine working end-to-end.

| Activity | Assigned To | Person-Days |
|---|---|---|
| Azure environment provisioning (DEV) via Bicep | DevOps | 20 |
| CI/CD pipelines (build, test, deploy to DEV) | DevOps | 15 |
| Auth system: JWT + refresh rotation + MFA | Sr Dev × 2 | 50 |
| OIDC / SAML federation (Google, Entra ID) | Sr Dev | 20 |
| PostgreSQL multi-tenant schema + RLS policies | Sr Dev + Mid Backend | 30 |
| ORM setup (Drizzle/Prisma) with tenant scoping | Mid Backend | 15 |
| API gateway + rate limiting + entitlement enforcement | Sr Dev | 20 |
| Module entitlement system (server-side) | Mid Backend | 15 |
| Secret management (Azure Key Vault integration) | DevOps | 10 |
| Base UI shell (AppShell, routing, auth flow) | Mid Frontend × 2 | 30 |
| Unit test framework setup (Vitest) | QA | 8 |
| **Phase 1 Total** | | **233 person-days** |

---

#### Phase 2 — Core Modules (Weeks 10–25 | 16 calendar weeks)

**Goal:** Students, Courses, Attendance (multi-modal), Calendar, and LMS modules fully implemented with server-side enforcement.

| Module | Key Activities | Assigned To | Person-Days |
|---|---|---|---|
| **Students** | Profile CRUD, cross-tenant enrollment, One Edu ID, bulk import, audit trail | Sr Dev + Mid Backend | 60 |
| **Courses** | Course CRUD, enrollment, SCORM/xAPI support, LRS, content versioning | Sr Dev + Mid Backend | 70 |
| **Attendance** | Manual, QR, RFID, GPS geofence; DPIA gating for biometric; absence alerts | Sr Dev + Mid Backend | 80 |
| **Calendar** | Academic calendar, events, timetabling | Mid Backend | 25 |
| **Frontend** | All Phase 2 module UIs, mobile-responsive | Mid Frontend × 2 | 140 |
| **QA** | Test plans, functional tests, integration tests for Phase 2 | QA × 2 | 120 |
| **BA/PM** | Requirements refinement, sprint management | BA/PM | 60 |
| **Phase 2 Total** | | | **555 person-days** |

---

#### Phase 3 — Extended Modules (Weeks 22–35 | 14 calendar weeks)

**Goal:** Grades, SRB, Finance, Messages, Family Portal modules delivered.

| Module | Key Activities | Assigned To | Person-Days |
|---|---|---|---|
| **Grades & Assignments** | Grading schemes, submission handling, plagiarism API hook, exports | Sr Dev + Mid Backend | 55 |
| **SRB** | Entry types, safeguarding DSL workflow, acknowledgement tracking, retention rules | Sr Dev + Mid Backend | 60 |
| **Finance** | Multi-currency invoicing, Stripe/Razorpay/PayHere/Telr integration, PDF invoices, fee schedules | Sr Dev + Mid Backend | 70 |
| **Messages & Notifications** | Real-time WebSocket messages, push (FCM/APNS), SMS (Azure Comms), rate limiting | Sr Dev + Mid Backend | 55 |
| **Family Portal** | Parent/guardian access, children's records, SRB acknowledgement, invoice payment | Mid Backend | 30 |
| **Frontend** | All Phase 3 UIs, PWA push notification wiring | Mid Frontend × 2 | 120 |
| **QA** | Functional + integration + regression for Phase 3 | QA × 2 | 105 |
| **BA/PM** | Sprint management, client feedback sessions | BA/PM | 50 |
| **Phase 3 Total** | | | **545 person-days** |

---

#### Phase 4 — Platform & Admin Modules (Weeks 30–40 | 10 calendar weeks)

**Goal:** Reports, AI Insights, Marketplace, Platform Admin console, Marketing, and Migration UI delivered.

| Module | Key Activities | Assigned To | Person-Days |
|---|---|---|---|
| **Reports & Analytics** | Dashboard builder, grade/attendance/finance exports, async large exports | Sr Dev + Mid Backend | 50 |
| **AI Insights** | Azure OpenAI Service integration (geo-bounded), explainability layer, at-risk flag workflow | Sr Dev | 40 |
| **Marketplace** | Cross-tenant course discovery, opt-in publishing, transaction isolation | Sr Dev + Mid Backend | 40 |
| **Marketing** | Lead management, CRM-lite | Mid Backend | 20 |
| **Platform Admin Console** | Tenant CRUD, billing, break-glass access, health dashboard, cross-region metrics | Sr Dev + Mid Backend | 55 |
| **Frontend** | All Phase 4 UIs, admin console | Mid Frontend × 2 | 90 |
| **QA** | Functional, integration, regression | QA × 2 | 75 |
| **BA/PM** | Sprint management, admin console UX review | BA/PM | 35 |
| **Phase 4 Total** | | | **405 person-days** |

---

#### Phase 5 — Compliance & Governance (Weeks 36–46 | 10 calendar weeks)

**Goal:** Immutable audit log, DSAR lifecycle, consent management, RoPA generation, data retention automation, DPIA tracking.

| Activity | Assigned To | Person-Days |
|---|---|---|
| Immutable audit log (hash-chained, write-once) | Sr Dev | 30 |
| DSAR lifecycle engine (intake → assembly → delivery → closure) | Sr Dev + Mid Backend | 45 |
| Automated data assembly across all modules for DSAR | Mid Backend | 25 |
| Consent management (recording, withdrawal, deletion trigger) | Mid Backend | 20 |
| RoPA report generation (JSON/CSV, Article 30) | Mid Backend | 15 |
| Automated data retention enforcement (scheduled jobs) | Mid Backend | 20 |
| DPIA tracking & biometric gating | Sr Dev | 20 |
| Breach response workflow UI | Mid Frontend | 15 |
| Compliance dashboard & DSAR UI | Mid Frontend | 25 |
| Security review of compliance flows | Security Eng | 20 |
| QA (compliance scenario testing) | QA × 2 | 70 |
| BA/PM | BA/PM | 35 |
| **Phase 5 Total** | | **320 person-days** |

---

#### Phase 6 — Geo-Separation & Data Residency (Weeks 42–50 | 8 calendar weeks)

**Goal:** Multi-region Azure deployment, data residency enforcement, global control plane, geo-migration tooling.

| Activity | Assigned To | Person-Days |
|---|---|---|
| Azure multi-region IaC (Bicep modules per geo) | DevOps | 30 |
| Global control plane (tenant registry, One Edu ID namespace) | Sr Dev | 30 |
| Data residency enforcement layer (routing, boundary checks) | Sr Dev + Mid Backend | 40 |
| Inter-region mTLS service-to-service authentication | DevOps + Sr Dev | 20 |
| Geo-migration tooling (export → validate → import → certificate) | Sr Dev + Mid Backend | 30 |
| Data Residency Attestation API | Mid Backend | 15 |
| CDN / WAF configuration per region (Azure Front Door) | DevOps | 15 |
| QA (geo-routing tests, data boundary tests) | QA × 2 | 55 |
| BA/PM | BA/PM | 20 |
| **Phase 6 Total** | | **255 person-days** |

---

#### Phase 7 — Data Migration Tools (Weeks 48–54 | 6 calendar weeks)

**Goal:** Bulk import engine, legacy system connectors, idempotent job processing, async progress streaming.

| Activity | Assigned To | Person-Days |
|---|---|---|
| Bulk import engine (CSV/JSON, field mapping, validation) | Sr Dev + Mid Backend | 40 |
| Legacy system connectors (SIS/LMS adapters) | Mid Backend | 30 |
| Dry-run preview and validation report | Mid Backend | 15 |
| Async job queue (Azure Service Bus + progress SSE) | Sr Dev | 20 |
| Import UI (wizard, progress, error report) | Mid Frontend | 20 |
| QA (import correctness, idempotency, error handling) | QA × 2 | 45 |
| BA/PM | BA/PM | 15 |
| **Phase 7 Total** | | **185 person-days** |

---

#### Phase 8 — Security Hardening (Weeks 52–58 | 6 calendar weeks)

**Goal:** Pre-launch security review, penetration test preparation, WAF tuning, anomaly detection, zero Critical/High OWASP findings.

| Activity | Assigned To | Person-Days |
|---|---|---|
| Internal security code review (all modules) | Security Eng + Sr Dev | 35 |
| OWASP Top 10 assessment & remediation | Security Eng + Mid Backend | 30 |
| Azure WAF rules tuning (OWASP rule set) | DevOps + Security Eng | 15 |
| Anomaly detection config (impossible travel, bulk export) | DevOps | 10 |
| Pen test preparation (documentation, scope) | Security Eng | 10 |
| Third-party pen test engagement | External (fixed cost, see §3) | — |
| Remediation of pen test findings | Mid Backend + Sr Dev | 25 |
| Security headers & CSP implementation/testing | Mid Frontend + QA | 15 |
| **Phase 8 Total** | | **140 person-days** |

---

#### Phase 9 — Performance & E2E Testing (Weeks 56–62 | 4 calendar weeks)

**Goal:** Load testing (k6), full E2E regression (Playwright), accessibility audit (WCAG 2.1 AA), performance tuning.

| Activity | Assigned To | Person-Days |
|---|---|---|
| k6 load test scripts (all critical paths) | QA + DevOps | 20 |
| Load test execution on UAT (500 concurrent users) | QA + DevOps | 10 |
| Performance tuning (DB indexes, query optimization, caching) | Sr Dev + Mid Backend | 25 |
| Full Playwright E2E regression suite | QA × 2 | 30 |
| Accessibility audit (automated + manual) | QA | 10 |
| Accessibility remediation | Mid Frontend | 15 |
| **Phase 9 Total** | | **110 person-days** |

---

#### Phase 10 — UAT & Launch Preparation (Weeks 60–78 | 8 calendar weeks)

**Goal:** Pilot tenant UAT support, training materials, operational runbooks, launch readiness sign-off.

| Activity | Assigned To | Person-Days |
|---|---|---|
| UAT environment setup & data preparation | DevOps + QA | 15 |
| UAT support (bug triage, fixes, retests) | Sr Dev × 2 + QA × 2 | 80 |
| Operational runbooks (incident response, DR procedure) | DevOps + BA/PM | 20 |
| Admin & user documentation | BA/PM | 20 |
| Pilot tenant onboarding (first 3 tenants) | Sr Dev + DevOps | 25 |
| Monitoring & alerting validation | DevOps | 10 |
| Launch readiness review & sign-off | Full team | 15 |
| **Phase 10 Total** | | **185 person-days** |

---

### 1.4 Total Effort Summary

| Phase | Calendar Duration | Person-Days | % of Total |
|---|---|---|---|
| 0 — Architecture & Discovery | 5 weeks | 81 | 3% |
| 1 — Infrastructure Foundation | 8 weeks | 233 | 9% |
| 2 — Core Modules | 16 weeks | 555 | 21% |
| 3 — Extended Modules | 14 weeks | 545 | 21% |
| 4 — Platform & Admin | 10 weeks | 405 | 15% |
| 5 — Compliance & Governance | 10 weeks | 320 | 12% |
| 6 — Geo-Separation | 8 weeks | 255 | 10% |
| 7 — Migration Tools | 6 weeks | 185 | 7% |
| 8 — Security Hardening | 6 weeks | 140 | 5% |
| 9 — Performance Testing | 4 weeks | 110 | 4% |
| 10 — UAT & Launch | 8 weeks | 185 | 7% |
| **Total** | **~78 weeks (18 months)** | **3,014 person-days** | **100%** |

---

### 1.5 Cost by Scenario

#### Scenario A: Onshore Team (UK / US / EU market rates)

| Role | Count | Days | Day Rate (USD) | Cost |
|---|---|---|---|---|
| Technical Lead / Architect | 1 | 330 | $1,100 | $363,000 |
| Senior Full-Stack Developer | 2 | 660 | $900 | $594,000 |
| Mid-Level Backend Developer | 2 | 620 | $650 | $403,000 |
| Mid-Level Frontend Developer | 2 | 600 | $650 | $390,000 |
| Senior DevOps / Cloud Engineer | 1 | 330 | $950 | $313,500 |
| QA Engineer | 2 | 560 | $500 | $280,000 |
| Security Engineer (0.5 FTE) | 0.5 | 130 | $1,000 | $65,000 |
| BA / Project Manager | 1 | 310 | $750 | $232,500 |
| **Subtotal** | | **3,540** | | **$2,641,000** |
| **Contingency (20%)** | | | | **$528,200** |
| **Scenario A Total** | | | | **$3,169,200** |

> *Note: Day counts exceed person-days from §1.4 because §1.4 reflects billable productive days; actual engagement includes non-project overhead (leave, admin, internal meetings) accounted for here.*

---

#### Scenario B: Hybrid Team (Onshore leads + Offshore delivery)

**Onshore** (UK/US): Tech Lead, DevOps, BA/PM, Security (part-time)  
**Offshore** (India / Sri Lanka): 2 Senior Devs, 4 Mid Devs, 2 QA

| Role | Location | Count | Days | Day Rate (USD) | Cost |
|---|---|---|---|---|---|
| Technical Lead / Architect | Onshore | 1 | 330 | $1,100 | $363,000 |
| Senior DevOps / Cloud Engineer | Onshore | 1 | 330 | $950 | $313,500 |
| BA / Project Manager | Onshore | 1 | 310 | $750 | $232,500 |
| Security Engineer (0.5 FTE) | Onshore | 0.5 | 130 | $1,000 | $65,000 |
| Senior Full-Stack Developer | Offshore | 2 | 660 | $220 | $145,200 |
| Mid-Level Backend Developer | Offshore | 2 | 620 | $140 | $86,800 |
| Mid-Level Frontend Developer | Offshore | 2 | 600 | $140 | $84,000 |
| QA Engineer | Offshore | 2 | 560 | $110 | $61,600 |
| **Subtotal** | | | **3,540** | | **$1,351,600** |
| **Contingency (20%)** | | | | | **$270,320** |
| **Scenario B Total** | | | | | **$1,621,920** |

> *Offshore rates reflect senior/mid-level engineers in Colombo / Pune / Bangalore. Rates are 2026 market benchmarks. Higher offshore rates vs. traditional outsourcing reflect the specialised skill set (Azure, GDPR, LMS domain) required.*

---

### 1.6 Duration Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GDPR/compliance complexity underestimated | Medium | +4–6 weeks | Start Phase 5 research in parallel with Phase 3 |
| Azure OpenAI regional availability for GEO-APAC-SA | Medium | +2–4 weeks | Validate availability before committing AI module timeline |
| Biometric attendance DPIA sign-off delays | High | +2–3 weeks per region | Engage Data Protection Officer early in Phase 0 |
| Third-party payment gateway integration surprises | Medium | +2–4 weeks | Spike in Phase 1 to de-risk all gateway APIs |
| Penetration test findings requiring major rework | Low | +4–8 weeks | Security reviews starting Phase 5 to catch issues early |
| Scope creep across 21 modules | High | +4–12 weeks | Strict change control after SRS sign-off; MoSCoW prioritisation |

> **Overall schedule confidence:** 75% probability the project completes within 18 months. 90% probability within 22 months. A 4-month buffer should be budgeted for in any fixed-price contract.

---

## Part 2: Azure Hosting Cost Estimation

### 2.1 Environment Specifications

| Specification | DEV | QA | UAT |
|---|---|---|---|
| **Purpose** | Active development, feature branches | Functional, integration & regression testing | User acceptance testing, performance testing, client demos |
| **Scale** | Minimal | 25% production | 50% production |
| **Data** | Anonymised seed data | Anonymised production-like | Weekly anonymised production clone |
| **Uptime** | Business hours (60% utilisation) | CI/CD triggered (70% utilisation) | Full-time during UAT sprints (90% utilisation) |
| **HA / Zone Redundancy** | No | No | Partial (DB only) |
| **Active Period** | Months 1–18 (continuous) | Months 3–18 (16 months) | Months 11–18 (8 months) |
| **Geo-Regions** | 1 (UK South) | 1 (UK South) | 1 (UK South) |

---

### 2.2 DEV Environment — Monthly Cost Breakdown

| Azure Service | SKU / Configuration | Monthly Cost (USD) |
|---|---|---|
| **Azure Container Apps** | 2 replicas · 0.5 vCPU · 1 GiB RAM · 60% utilisation | $48 |
| **Azure Database for PostgreSQL Flexible Server** | Burstable B2ms · 2 vCores · 8 GiB · 32 GB P4 storage | $105 |
| **Azure Redis Cache** | C0 Basic · 250 MB | $16 |
| **Azure Service Bus** | Basic tier · ~1M messages/month | $10 |
| **Azure Blob Storage** | LRS · 100 GB data + 1M operations | $5 |
| **Azure Key Vault** | Standard · ~10K operations/month | $5 |
| **Azure Monitor + Application Insights** | 5 GB logs/day ingestion | $12 |
| **Azure Front Door** | Standard · WAF enabled · minimal traffic | $38 |
| **Azure Communication Services** | Email + SMS (low volume dev use) | $5 |
| **Azure OpenAI Service** | GPT-4o · ~100K tokens/month (dev testing) | $10 |
| **VNet · Private Endpoints · Outbound Bandwidth** | 1 VNet · 4 private endpoints · 50 GB egress | $35 |
| **Azure Active Directory B2C** | 1,000 MAU (dev accounts) | $0 (free tier) |
| **Miscellaneous (DNS, Static Web App)** | | $5 |
| **DEV Monthly Total** | | **$294** |
| **With nights/weekends shutdown (40% savings)** | | **~$176** |

> *DEV environment can be shut down 19:00–08:00 weekdays and all weekend via Azure Container Apps scaling rules and PostgreSQL stop/start, reducing compute cost by ~40%.*

---

### 2.3 QA Environment — Monthly Cost Breakdown

| Azure Service | SKU / Configuration | Monthly Cost (USD) |
|---|---|---|
| **Azure Container Apps** | 4 replicas · 1 vCPU · 2 GiB RAM · 70% utilisation | $210 |
| **Azure Database for PostgreSQL Flexible Server** | General Purpose D4s · 4 vCores · 16 GiB · 64 GB P6 storage | $275 |
| **Azure Redis Cache** | C1 Standard · 1 GiB | $55 |
| **Azure Service Bus** | Standard tier · ~5M messages/month | $25 |
| **Azure Blob Storage** | LRS · 500 GB + 5M operations | $15 |
| **Azure Key Vault** | Standard · ~50K operations/month | $8 |
| **Azure Monitor + Application Insights** | 20 GB logs/day ingestion | $42 |
| **Azure Front Door** | Standard · WAF · CI/CD triggered traffic | $55 |
| **Azure Communication Services** | Email + SMS (QA automation) | $15 |
| **Azure OpenAI Service** | GPT-4o · ~500K tokens/month | $45 |
| **VNet · Private Endpoints · Outbound Bandwidth** | 1 VNet · 6 private endpoints · 200 GB egress | $60 |
| **Azure Backup** | DB backup · LRS · 64 GB | $22 |
| **Azure Container Registry** | Basic · image storage | $5 |
| **Miscellaneous** | | $8 |
| **QA Monthly Total** | | **$840** |
| **With weekend shutdown (20% savings)** | | **~$672** |

---

### 2.4 UAT Environment — Monthly Cost Breakdown

| Azure Service | SKU / Configuration | Monthly Cost (USD) |
|---|---|---|
| **Azure Container Apps** | 6 replicas · 2 vCPU · 4 GiB RAM · 90% utilisation | $755 |
| **Azure Database for PostgreSQL Flexible Server** | General Purpose D8s · 8 vCores · 32 GiB · 128 GB P10 storage · Zone-redundant HA | $985 |
| **Azure Redis Cache** | C2 Standard · 6 GiB | $130 |
| **Azure Service Bus** | Standard tier · ~20M messages/month | $45 |
| **Azure Blob Storage** | LRS · 1 TB + 20M operations | $25 |
| **Azure Key Vault** | Standard · ~200K operations/month | $15 |
| **Azure Monitor + Application Insights** | 50 GB logs/day ingestion | $105 |
| **Azure Front Door** | Premium · WAF managed rules (OWASP 3.2) | $135 |
| **Azure Communication Services** | Email + SMS + Push (UAT testing volume) | $40 |
| **Azure OpenAI Service** | GPT-4o · ~2M tokens/month (UAT AI testing) | $180 |
| **VNet · Private Endpoints · Outbound Bandwidth** | 1 VNet · 8 private endpoints · 500 GB egress | $130 |
| **Azure Backup** | DB + Blob backup · ZRS · 128 GB | $70 |
| **Azure Load Testing** | k6 / Azure Load Testing · 50 VU-hours/month | $55 |
| **Azure Container Registry** | Standard · multiple environments | $20 |
| **Azure Active Directory B2C** | 50K MAU (UAT pilot tenants) | $90 |
| **Miscellaneous (DNS, Static Web Apps, Alerts)** | | $15 |
| **UAT Monthly Total** | | **$2,775** |

---

### 2.5 Production Reference — Monthly Cost (1 Geo-Region)

> Provided for planning reference only. Production costs depend heavily on tenant count, user load, and geo-region mix.

| Azure Service | SKU / Configuration | Monthly Cost (USD) |
|---|---|---|
| **Azure Container Apps** | 8–16 replicas · 4 vCPU · 8 GiB RAM · auto-scale | $1,800–$4,200 |
| **Azure Database for PostgreSQL Flexible Server** | Business Critical · 16 vCores · 64 GiB · Zone-redundant HA + Read replica | $2,800 |
| **Azure Redis Cache** | P2 Premium · 13 GiB · Zone redundant | $490 |
| **Azure Service Bus** | Premium tier | $670 |
| **Azure Blob Storage** | GRS · 10 TB | $260 |
| **Azure Key Vault** | Premium (HSM-backed) | $50 |
| **Azure Monitor + App Insights** | 200 GB/month | $430 |
| **Azure Front Door** | Premium · WAF · DDoS Standard | $380 |
| **Azure Communication Services** | Email + SMS + Push (production) | $200 |
| **Azure OpenAI Service** | GPT-4o · production inference | $500–$2,000 |
| **Azure DDoS Protection Standard** | Per VNet | $2,944 |
| **Azure Defender for Cloud** | Defender for Databases + Containers + App Service | $380 |
| **VNet · Private Endpoints · Bandwidth** | 1 VNet · 20 endpoints · 5 TB egress | $650 |
| **Azure Backup** | DB + Blob · ZRS + GRS | $350 |
| **Azure Active Directory B2C** | 500K MAU | $1,750 |
| **Azure Container Registry** | Premium · geo-replication | $110 |
| **Miscellaneous** | | $150 |
| **Production Monthly (1 region, ~50 tenants)** | | **~$13,764–$17,364** |

> Scale: ~50 mid-size tenants, ~25,000 active users, ~2M API calls/day per region.  
> For 6 geo-regions at full scale, multiply by 6 with ~20% volume variance per region.  
> Cost can be reduced 20–35% with Azure Reserved Instances (1-year or 3-year commit) on compute and database.

---

### 2.6 Environment Cost Summary — 18-Month Project Period

| Environment | Monthly Cost | Active Months | Subtotal | With Shutdown Savings |
|---|---|---|---|---|
| **DEV** | $294 | 18 | $5,292 | **$3,528** |
| **QA** | $840 | 16 | $13,440 | **$10,752** |
| **UAT** | $2,775 | 8 | $22,200 | **$19,980** |
| **Total Environment Cost** | | | **$40,932** | **$34,260** |

> Shutdown savings: DEV 33% saving (nights + weekends), QA 20% (weekends).  
> UAT assumed full-time during active phases — no shutdown assumed.

---

## Part 3: Third-Party Licences & Compliance Costs

| Item | Cost (USD) | Notes |
|---|---|---|
| **Third-Party Penetration Test** (CREST/CHECK accredited) | $22,000 | Pre-launch full-scope web + API + cloud infrastructure |
| **Annual Pen Test** (Year 2+) | $15,000/yr | Contracted separately post-launch |
| **ISO 27001 Gap Assessment + Audit** | $28,000 | Required for Enterprise tier sales; includes readiness assessment + Stage 1 + Stage 2 audit |
| **ICO Registration** (UK) | $120/yr | UK data controller registration |
| **Legal / GDPR DPA Templates** (specialist law firm) | $15,000 | DPA agreements, Privacy Policy, Terms of Service, DSAR response templates |
| **Snyk** (SCA / SAST scanning in CI/CD) | $2,400/yr | Team plan, ~10 developers |
| **GitHub Advanced Security** (SAST + secret scanning) | $3,600/yr | 12 seats |
| **HaveIBeenPwned API** (password breach checks) | $540/yr | Enterprise API licence |
| **Turnitin API** (plagiarism detection, Enterprise add-on) | $8,000/yr | API integration licence |
| **Azure Reserved Instances** | — | Apply after launch; 1-year commit = 20–38% savings on compute |
| **Bugcrowd / HackerOne Bug Bounty** (Year 1) | $18,000 | Managed bug bounty setup + initial researcher incentives |
| **Training: Azure + Security certifications for team** | $12,000 | AZ-900, AZ-204, AZ-500 for 4 team members |
| **Open Exchange Rates API** | $480/yr | FX rate feed for finance module |
| **Subtotal (one-time + Year 1 recurring)** | **$110,140** | |
| **Annual recurring (Year 2+)** | ~$48,540/yr | |

---

## Part 4: Total Cost of Ownership — 18-Month Project

### Scenario A: Onshore Team

| Cost Category | Amount (USD) |
|---|---|
| Development & QA (incl. 20% contingency) | $3,169,200 |
| Azure Hosting — DEV + QA + UAT (18 months, with savings) | $34,260 |
| Third-Party Licences & Compliance | $110,140 |
| **Total Project Cost (excl. Production Hosting)** | **$3,313,600** |
| **Production Hosting Reference (1 region × 12 months)** | **~$170,000** |
| **Year 1 Full TCO (incl. 1 production region)** | **~$3,484,000** |

---

### Scenario B: Hybrid Offshore Team

| Cost Category | Amount (USD) |
|---|---|
| Development & QA (incl. 20% contingency) | $1,621,920 |
| Azure Hosting — DEV + QA + UAT (18 months, with savings) | $34,260 |
| Third-Party Licences & Compliance | $110,140 |
| **Total Project Cost (excl. Production Hosting)** | **$1,766,320** |
| **Production Hosting Reference (1 region × 12 months)** | **~$170,000** |
| **Year 1 Full TCO (incl. 1 production region)** | **~$1,936,000** |

---

## Part 5: Azure Cost Optimisation Recommendations

### Immediate (at project start)
1. **Auto-shutdown DEV/QA** — Use Azure Container Apps scale-to-zero and PostgreSQL stop/start on schedule. Saves ~$3,500 over 18 months.
2. **Azure Dev/Test subscription pricing** — Apply for Azure Dev/Test pricing for DEV and QA environments (up to 40% reduction on compute).
3. **Azure Hybrid Benefit** — If team has existing Windows Server / SQL Server licences, apply Azure Hybrid Benefit to reduce licensing costs.

### At UAT (Month 11)
4. **Azure Load Testing free tier** — First 50 VU-hours/month are free. Structure load tests to stay within free tier where possible.
5. **Blob Storage lifecycle policies** — Auto-tier old migration job files and test artifacts to Cool/Archive storage. Saves ~$15/month.

### At Production Launch
6. **1-Year Reserved Instances** — Commit PostgreSQL Flexible Server and Container Apps compute on 1-year reserved pricing: **20–38% savings** on compute. For 1 production region at $17K/month, this saves ~$5,000–$7,000/month = **$60,000–$84,000/year per region**.
7. **Azure Savings Plan** — Commit $3,000–5,000/month compute spend for additional 15% discount stacked with reserved instances.
8. **Right-sizing after Month 3 in production** — Use Azure Advisor recommendations to right-size over-provisioned resources. Typically reduces costs 10–15% in Month 3.
9. **Azure OpenAI provisioned throughput** — Switch from pay-per-token to provisioned throughput for predictable AI workloads once monthly token volumes stabilise.

### Potential Annual Savings at Production Scale (1 region)
| Optimisation | Annual Saving |
|---|---|
| 1-Year Reserved Instances (DB + Containers) | $70,000 |
| Azure Savings Plan (compute) | $15,000 |
| Right-sizing (Advisor recommendations) | $20,000 |
| Lifecycle storage policies | $2,000 |
| **Total Estimated Annual Saving** | **~$107,000 per region** |

---

## Part 6: Key Assumptions & Exclusions

### Assumptions
- One dedicated geo-region (UK) for DEV/QA/UAT environments
- Team works standard 5-day weeks; public holidays in team locations excluded from effective days
- Azure pricing as of June 2026; pricing subject to change (typically 0–5% annual adjustment)
- Offshore rates assume experienced engineers with SaaS/Azure background; not entry-level outsourcing
- Penetration test conducted once pre-launch; annual re-tests budgeted separately post-launch
- ISO 27001 certification pursued Year 1; SOC 2 Type II audit budgeted Year 2
- Native mobile app (iOS/Android) is out of scope — PWA only
- Third-party AI model training is out of scope — using Azure OpenAI Service API only
- Stripe handles PCI DSS compliance; no additional PCI audit required for the platform

### Exclusions
- Post-launch operational support & maintenance (budget separately: typically 15–20% of build cost per year)
- Native mobile app development (estimated separately: +$300,000–$600,000)
- Marketing, sales, and GTM costs
- Data centre / on-premises deployment (Azure only)
- Custom LMS content authoring tools
- Payment gateway merchant account setup fees
- Staff training for tenant administrators (billable professional services)
- SOC 2 Type II audit (Year 2: est. $35,000–$60,000)

---

## Part 7: Recommended Approach

Given the scope, regulatory complexity, and 18-month timeline, the recommended build approach is:

### Hybrid Team (Scenario B) + Phased Go-Live

1. **Months 1–11:** Build and test Phases 0–7 with hybrid team. Keep all architecture, security, and DevOps decisions onshore.
2. **Month 12:** Soft launch in **GEO-UK only** with 3–5 pilot tenants (Starter plan). This generates real-world feedback before full scale.
3. **Months 13–16:** Incorporate pilot feedback, complete Phases 8–10, expand to GEO-APAC-SA.
4. **Month 17:** Full production launch across all planned geo-regions.
5. **Month 18:** Post-launch stabilisation, performance optimisation, ISO 27001 audit submission.

**Rationale:** Phased geo-launch reduces risk, generates early revenue to offset development cost, and allows compliance posture per region to be validated with real tenants before global rollout.

---

*This document should be reviewed alongside the SRS (SRS-OneEdu-Production.md). Cost estimates are ±20% accuracy at this stage (Class 4 estimate). A refined Class 2 estimate (±10%) can be produced after Phase 0 architecture is complete.*

*Next document in series: Azure Architecture Diagram & IaC Design*
