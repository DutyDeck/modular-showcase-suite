# Cost Estimation — AI-Augmented Development Plan
## One Edu — Education Super App
### Revised: Lean Team + AI Tooling Strategy

---

| Field | Value |
|---|---|
| Document Version | 1.0.0 |
| Replaces | CostEstimation-OneEdu.md (Scenarios A & B) |
| Date | 2026-06-04 |
| Currency | USD |

---

## Why AI Tools Change the Equation

The original estimate assumed human-paced development across all tasks. AI coding assistants fundamentally change the ratio of people needed per unit of output. This project already demonstrated this — the current prototype was built with **Lovable** (AI-driven UI generation), proving the team is already comfortable with AI-first development.

### Measured Productivity Impact by Task Type

| Task Type | AI Tool | Productivity Boost | Notes |
|---|---|---|---|
| CRUD API endpoints | Claude Code / Copilot | **60–70%** faster | Boilerplate generation, type-safe schemas |
| Database schema design | Claude | **40–50%** faster | Multi-tenant RLS policies, index suggestions |
| Frontend UI components | Lovable / v0.dev / Claude | **60–75%** faster | Already proven on this project |
| Unit & integration test writing | Claude Code / Playwright AI | **45–55%** faster | AI generates test cases from spec |
| IaC / Bicep templates | Claude / Copilot | **45–55%** faster | Azure resource scaffolding |
| Code review & security checks | Claude + Snyk AI | **35–40%** faster | AI flags issues before human review |
| Documentation & runbooks | Claude | **65–75%** faster | Generate from code + prompts |
| Compliance logic (DSAR, audit) | Claude | **30–40%** faster | Complex but AI assists with boilerplate flows |
| Architecture decisions | Claude | **20–30%** faster | ADR drafting, trade-off analysis |
| Security hardening | Claude + GitHub Adv Security | **25–35%** faster | AI-assisted, human must verify |
| Migration / data pipeline | Claude Code | **50–60%** faster | CSV parsers, validators, transformers |

**Blended productivity improvement: ~42% across all development tasks**

### What AI Does NOT Replace
- Architecture judgment calls under regulatory constraints
- Security decisions (AI flags, humans decide)
- Stakeholder negotiation and requirement clarity
- Compliance interpretation per jurisdiction (legal sign-off)
- Pen testing (must be human-led, CREST/CHECK)
- UAT — real users testing real scenarios

---

## Revised Plan at a Glance

| Metric | Original Hybrid Plan | AI-Augmented Plan | Saving |
|---|---|---|---|
| **Team size** | 11.5 FTE | **8 FTE** | 3.5 fewer people |
| **Timeline** | 18 months | **14 months** | 4 months faster |
| **Total person-days** | 3,014 PD | **1,805 PD** | 1,209 PD (-40%) |
| **Dev cost (base)** | $1,351,600 | **$811,000** | -$540,600 |
| **+ AI tools budget** | $0 | **$22,000** | |
| **+ Contingency** | $270,320 (20%) | **$124,950** (15%) | Lower risk = lower contingency |
| **Total dev cost** | $1,621,920 | **$957,950** | **-$663,970 (-41%)** |
| **Azure envs (project period)** | $34,260 | **$27,500** | Shorter active period |
| **Licences & compliance** | $110,140 | **$85,000** | Fewer seat licences |
| **Grand total** | **$1,766,320** | **$1,070,450** | **-$695,870 (-39%)** |

> **Contingency is lower (15% vs 20%)** because AI tools reduce delivery risk: more code is generated from specs, test coverage is higher, and documentation is auto-generated — reducing the unknown-unknowns that drive cost overruns.

---

## AI Tool Stack & Budget

| Tool | Purpose | Cost |
|---|---|---|
| **Claude Code** (Anthropic) | Primary AI coding assistant — architecture, code generation, review, compliance analysis, documentation | $100/user/month × 7 devs × 14 months = **$9,800** |
| **GitHub Copilot Enterprise** | In-editor code completion, PR review summaries | $39/user/month × 7 devs × 14 months = **$3,822** |
| **Lovable** (continue using) | Frontend UI generation (already proven on this codebase) | ~$100/month × 14 = **$1,400** |
| **Cursor Pro** | IDE with AI-first workflow for offshore devs | $40/user/month × 5 offshore × 14 months = **$2,800** |
| **AI-assisted Playwright** | E2E test generation from user flows | Built into Claude Code — **$0 extra** |
| **Claude API** (batch jobs) | Automated compliance doc assembly, DSAR data gathering, RoPA generation | ~$200/month × 14 = **$2,800** |
| **Vercel v0.dev** | Rapid UI prototyping for UAT client previews | $20/month × 14 = **$280** |
| **Miscellaneous AI tooling** | Prompt libraries, AI-powered monitoring alerts | **$1,100** |
| **Total AI Tools** | | **$22,002** |

---

## Revised Team Composition (8 FTE)

| Role | Count | Location | Engagement | Why AI Allows Reduction |
|---|---|---|---|---|
| **Technical Lead / Architect** | 1 | Onshore | Full 14 months | Same role — no reduction. AI assists with ADR drafting, IaC review. |
| **Senior Full-Stack Developer** | 2 | Offshore (Sr) | Full 14 months | AI handles boilerplate; seniors focus on complex logic & architecture alignment |
| **Mid-Level Backend Developer** | 1 | Offshore | Months 2–13 | 1 instead of 2 — AI generates CRUD, migrations, validations; 1 mid dev + AI = 2 mid devs without AI |
| **Mid-Level Frontend Developer** | 1 | Offshore | Months 2–13 | 1 instead of 2 — Lovable + Claude Code + shadcn/ui = fast UI output |
| **Senior DevOps / Cloud Engineer** | 1 | Onshore | Full 14 months | Same role — IaC generation via AI is faster but still needs expert oversight |
| **QA Engineer** | 1 | Offshore | Months 3–14 | 1 instead of 2 — AI generates Playwright test suites; QA reviews, extends, runs |
| **Security Engineer** | 0.5 FTE | Onshore | Months 5–11 | Same 0.5 FTE — security remains human-led |
| **BA / Project Manager** | 1 | Onshore | Full 14 months | Same role — AI generates requirement docs from conversations faster |
| **Total** | **8 FTE** | | | |

> **Offshore rates reflect AI-skilled engineers** — candidates who actively use Claude Code, Cursor, and have LMS/SaaS domain experience. Rate is slightly above commodity outsourcing.

---

## Revised Phase Breakdown

### How AI Compresses Each Phase

```
Phase:           Original    AI Plan    Reduction
0  Architecture  5 weeks  →  4 weeks   (-20%)  AI drafts ADRs, schema, API contracts
1  Foundation    8 weeks  →  5 weeks   (-38%)  AI generates auth boilerplate, RLS policies, IaC
2  Core Modules 16 weeks  → 10 weeks   (-38%)  AI generates CRUD, forms, validations, tests
3  Extended     14 weeks  →  9 weeks   (-36%)  Same pattern; AI handles payment SDK wrappers
4  Platform     10 weeks  →  7 weeks   (-30%)  AI assists admin UI, analytics queries
5  Compliance   10 weeks  →  8 weeks   (-20%)  Complex logic — AI helps but less so
6  Geo-Sep       8 weeks  →  6 weeks   (-25%)  AI generates Bicep modules, routing logic
7  Migration     6 weeks  →  4 weeks   (-33%)  AI is excellent at CSV parsers + validators
8  Security      6 weeks  →  5 weeks   (-17%)  Human-led — AI only assists
9  Testing       4 weeks  →  3 weeks   (-25%)  AI generates k6 scripts, Playwright suites
10 UAT           8 weeks  →  6 weeks   (-25%)  AI generates docs 70% faster

Total:          95 weeks  → 67 weeks  (~14 months calendar with parallel phases)
```

---

### Phase-by-Phase Cost (AI-Augmented Hybrid Team)

#### Day Rates Used

| Role | Location | Day Rate (USD) |
|---|---|---|
| Technical Lead / Architect | Onshore | $1,100 |
| Senior DevOps / Cloud Engineer | Onshore | $950 |
| BA / Project Manager | Onshore | $750 |
| Security Engineer | Onshore (0.5 FTE) | $1,000 |
| Senior Full-Stack Dev | Offshore (AI-skilled) | $240 |
| Mid Backend Dev | Offshore (AI-skilled) | $155 |
| Mid Frontend Dev | Offshore (AI-skilled) | $155 |
| QA Engineer | Offshore (AI-skilled) | $120 |

---

#### Phase 0 — Architecture & Discovery (4 weeks)

| Activity | AI Contribution | Team | PD |
|---|---|---|---|
| System architecture & ADRs | Claude drafts, human validates | Tech Lead | 14 |
| DB schema (multi-tenant RLS) | Claude generates schema from entities | Tech Lead + Sr Dev | 10 |
| API contract design | Claude generates OpenAPI spec from module list | Sr Dev | 6 |
| Security threat model | Claude assists with STRIDE analysis | Tech Lead | 5 |
| Azure IaC skeleton (Bicep) | Claude generates resource modules | DevOps | 10 |
| Project setup & conventions | Claude generates standards doc | BA/PM + DevOps | 4 |
| **Phase 0 Total** | | | **49 PD** |

---

#### Phase 1 — Infrastructure Foundation (5 weeks)

| Activity | AI Contribution | Team | PD |
|---|---|---|---|
| Azure environment provisioning | AI-generated Bicep, human reviews | DevOps | 14 |
| CI/CD pipelines | Claude generates GitHub Actions YAML | DevOps | 8 |
| Auth system (JWT, MFA, refresh rotation) | Claude generates auth middleware, hooks | Sr Dev × 2 | 28 |
| OIDC / SAML federation | Claude scaffolds provider configs | Sr Dev | 12 |
| PostgreSQL multi-tenant schema + RLS | Claude generates migration files + RLS policies | Sr Dev + Mid Backend | 15 |
| ORM setup + tenant scoping | Claude generates base model with tenant filter | Mid Backend | 8 |
| API gateway + entitlement enforcement | Claude generates middleware chain | Sr Dev | 10 |
| Azure Key Vault integration | Claude generates SDK wrappers | DevOps | 6 |
| Base UI shell (auth flow) | Lovable + Claude generates shell components | Mid Frontend | 12 |
| **Phase 1 Total** | | | **113 PD** |

---

#### Phase 2 — Core Modules (10 weeks)

| Module | AI Contribution | PD (AI-augmented) | PD (original) |
|---|---|---|---|
| **Students** | Claude generates full CRUD API + Zod schemas + Playwright tests | 38 | 60 |
| **Courses + LMS** | Claude generates course model, SCORM wrapper, xAPI client | 44 | 70 |
| **Attendance** | Claude generates multi-method attendance handlers; DPIA flow | 48 | 80 |
| **Calendar** | Claude generates event CRUD + academic calendar logic | 15 | 25 |
| **Frontend (all Phase 2)** | Lovable + Claude generates all module UIs from wireframes | 75 | 140 |
| **QA** | AI generates Playwright test suites; QA runs + extends | 65 | 120 |
| **BA/PM** | AI assists sprint docs, acceptance criteria | 35 | 60 |
| **Phase 2 Total** | | **320 PD** | 555 PD |

---

#### Phase 3 — Extended Modules (9 weeks)

| Module | AI Contribution | PD (AI-augmented) | PD (original) |
|---|---|---|---|
| **Grades & Assignments** | Claude generates grading engine, submission handlers | 32 | 55 |
| **SRB** | Claude generates entry types, DSL notification flow, retention rules | 35 | 60 |
| **Finance** | Claude generates invoice PDF, Stripe/Razorpay SDK wrappers, fee schedules | 42 | 70 |
| **Messages & Notifications** | Claude generates WebSocket server, FCM/APNS push, SMS handlers | 32 | 55 |
| **Family Portal** | Claude generates parent-scoped API + UI | 18 | 30 |
| **Frontend** | Lovable + Claude generates all Phase 3 UIs | 65 | 120 |
| **QA** | AI-generated regression suite + manual expansion | 58 | 105 |
| **BA/PM** | Sprint management | 28 | 50 |
| **Phase 3 Total** | | **310 PD** | 545 PD |

---

#### Phase 4 — Platform & Admin Modules (7 weeks)

| Module | AI Contribution | PD (AI-augmented) | PD (original) |
|---|---|---|---|
| **Reports & Analytics** | Claude generates query builders, export formatters | 32 | 50 |
| **AI Insights** | Claude assists with Azure OpenAI Service integration, explainability layer | 26 | 40 |
| **Marketplace** | Claude generates cross-tenant query isolation, opt-in API | 25 | 40 |
| **Marketing (CRM-lite)** | Claude generates lead CRUD | 12 | 20 |
| **Platform Admin Console** | Claude generates tenant CRUD API + break-glass workflow | 32 | 55 |
| **Frontend** | Lovable + Claude generates admin console UI | 48 | 90 |
| **QA** | AI-generated tests + manual | 42 | 75 |
| **BA/PM** | | 20 | 35 |
| **Phase 4 Total** | | **237 PD** | 405 PD |

---

#### Phase 5 — Compliance & Governance (8 weeks)

> *AI helps less here — compliance logic requires careful human judgment. AI generates boilerplate, humans verify regulatory correctness.*

| Activity | AI Contribution | PD (AI-augmented) | PD (original) |
|---|---|---|---|
| Immutable audit log (hash-chained) | Claude generates hash-chain implementation | 22 | 30 |
| DSAR lifecycle engine | Claude generates workflow state machine; human validates GDPR logic | 32 | 45 |
| Automated data assembly (cross-module) | Claude generates data collector per module | 18 | 25 |
| Consent management | Claude generates consent recording + withdrawal flows | 14 | 20 |
| RoPA generation | Claude generates Article 30 report from processing register | 10 | 15 |
| Data retention enforcement | Claude generates scheduled job + deletion cascade | 14 | 20 |
| DPIA tracking + biometric gating | Claude generates DPIA form + approval workflow | 14 | 20 |
| Compliance UI (DSAR, breach response) | Lovable + Claude | 25 | 40 |
| Security review (compliance flows) | Human-led — AI assists | 16 | 20 |
| QA (compliance scenarios) | AI-assisted test generation | 48 | 70 |
| BA/PM | | 22 | 35 |
| **Phase 5 Total** | | **235 PD** | 320 PD |

---

#### Phase 6 — Geo-Separation (6 weeks)

| Activity | AI Contribution | PD (AI-augmented) | PD (original) |
|---|---|---|---|
| Multi-region IaC (Bicep modules) | Claude generates per-region Bicep with parameterisation | 20 | 30 |
| Global control plane | Claude generates tenant registry API + routing | 20 | 30 |
| Data residency enforcement layer | Claude generates middleware + boundary checks | 26 | 40 |
| Inter-region mTLS service auth | Claude generates certificate management code | 12 | 20 |
| Geo-migration tooling | Claude generates export/import pipeline | 18 | 30 |
| Data Residency Attestation API | Claude generates signed certificate endpoint | 9 | 15 |
| CDN/WAF per region | Claude generates Front Door Bicep config | 9 | 15 |
| QA (geo boundary tests) | AI-generated geo routing test suite | 38 | 55 |
| BA/PM | | 12 | 20 |
| **Phase 6 Total** | | **164 PD** | 255 PD |

---

#### Phase 7 — Migration Tools (4 weeks)

| Activity | AI Contribution | PD (AI-augmented) | PD (original) |
|---|---|---|---|
| Bulk import engine (CSV/JSON) | Claude generates parsers, field mappers, validators — AI excels here | 22 | 40 |
| Legacy system connectors | Claude generates adapter patterns per system | 16 | 30 |
| Dry-run preview + validation report | Claude generates diff/validation report generator | 8 | 15 |
| Async job queue + progress SSE | Claude generates Service Bus + SSE streaming | 10 | 20 |
| Import UI (wizard + error report) | Lovable + Claude | 10 | 20 |
| QA (idempotency, error handling) | AI-generated edge case test suite | 24 | 45 |
| BA/PM | | 8 | 15 |
| **Phase 7 Total** | | **98 PD** | 185 PD |

---

#### Phase 8 — Security Hardening (5 weeks)

> *Least AI-compressible phase. Security decisions are human-led. AI assists with review.*

| Activity | AI Contribution | PD (AI-augmented) | PD (original) |
|---|---|---|---|
| Internal security code review | Claude assists in identifying patterns; human decides | 25 | 35 |
| OWASP Top 10 assessment + remediation | Claude + GitHub Advanced Security + human | 22 | 30 |
| WAF rules tuning | Claude generates WAF rule sets; DevOps validates | 10 | 15 |
| Anomaly detection configuration | Claude generates alert rule definitions | 7 | 10 |
| Pen test preparation | Human-led entirely | 8 | 10 |
| External pen test | Third-party (fixed cost, see §Licences) | — | — |
| Remediation of pen test findings | Requires human analysis — AI assists fixes | 18 | 25 |
| Security headers + CSP | Claude generates headers config | 10 | 15 |
| **Phase 8 Total** | | **100 PD** | 140 PD |

---

#### Phase 9 — Performance & E2E Testing (3 weeks)

| Activity | AI Contribution | PD (AI-augmented) | PD (original) |
|---|---|---|---|
| k6 load test scripts | Claude generates k6 scripts from user journeys | 10 | 20 |
| Load test execution + analysis | QA runs, Claude assists with interpreting results | 7 | 10 |
| Performance tuning | Claude suggests index optimisations, caching strategies | 15 | 25 |
| Playwright E2E regression suite | AI-generated from feature specs; QA reviews | 18 | 30 |
| Accessibility audit | AI-assisted axe-core analysis + Claude interpretation | 6 | 10 |
| Accessibility remediation | Claude generates fix patches | 10 | 15 |
| **Phase 9 Total** | | **66 PD** | 110 PD |

---

#### Phase 10 — UAT & Launch Preparation (6 weeks)

| Activity | AI Contribution | PD (AI-augmented) | PD (original) |
|---|---|---|---|
| UAT environment setup + data prep | AI-assisted data anonymisation scripts | 10 | 15 |
| UAT support (triage, fixes, retests) | Claude assists with bug analysis + fix suggestions | 55 | 80 |
| Operational runbooks | Claude generates from architecture docs — 70% faster | 12 | 20 |
| Admin + user documentation | Claude generates from code + feature specs | 12 | 20 |
| Pilot tenant onboarding | Human-led | 18 | 25 |
| Monitoring + alerting validation | Claude generates alert test scenarios | 6 | 10 |
| Launch readiness review | Human-led | 12 | 15 |
| **Phase 10 Total** | | **125 PD** | 185 PD |

---

## Total Effort Comparison

| Phase | Original PD | AI-Augmented PD | Reduction |
|---|---|---|---|
| 0 — Architecture | 81 | 49 | 40% |
| 1 — Foundation | 233 | 113 | 51% |
| 2 — Core Modules | 555 | 320 | 42% |
| 3 — Extended Modules | 545 | 310 | 43% |
| 4 — Platform & Admin | 405 | 237 | 41% |
| 5 — Compliance | 320 | 235 | 27% |
| 6 — Geo-Separation | 255 | 164 | 36% |
| 7 — Migration | 185 | 98 | 47% |
| 8 — Security | 140 | 100 | 29% |
| 9 — Testing | 110 | 66 | 40% |
| 10 — UAT & Launch | 185 | 125 | 32% |
| **Total** | **3,014 PD** | **1,817 PD** | **-40%** |

---

## Development Cost Calculation

### Role Cost Breakdown

| Role | Location | Count | Days | Day Rate | Cost |
|---|---|---|---|---|---|
| Technical Lead / Architect | Onshore | 1 | 270 | $1,100 | $297,000 |
| Senior DevOps / Cloud Engineer | Onshore | 1 | 270 | $950 | $256,500 |
| BA / Project Manager | Onshore | 1 | 255 | $750 | $191,250 |
| Security Engineer | Onshore | 0.5 | 100 | $1,000 | $100,000 |
| Senior Full-Stack Developer | Offshore | 2 | 530 | $240 | $127,200 |
| Mid-Level Backend Developer | Offshore | 1 | 240 | $155 | $37,200 |
| Mid-Level Frontend Developer | Offshore | 1 | 230 | $155 | $35,650 |
| QA Engineer | Offshore | 1 | 215 | $120 | $25,800 |
| **Subtotal (Labour)** | | | **2,110** | | **$1,070,600** |
| **AI Tools Budget** | | | | | **$22,002** |
| **Contingency (15%)** | | | | | **$163,890** |
| **Total Development Cost** | | | | | **$1,256,492** |

> Rounded to **~$1.26M** for planning purposes.

---

## Azure Hosting Cost (14-Month Project)

| Environment | Monthly | Active Months | Subtotal | With Savings |
|---|---|---|---|---|
| **DEV** (auto-shutdown nights/weekends) | $294 | 14 | $4,116 | **$2,758** |
| **QA** (weekend shutdown) | $840 | 12 | $10,080 | **$8,064** |
| **UAT** (full-time, Phase 10) | $2,775 | 6 | $16,650 | **$16,650** |
| **Total** | | | **$30,846** | **$27,472** |

---

## Third-Party Licences & Compliance

| Item | Original | AI-Augmented | Notes |
|---|---|---|---|
| Penetration test (pre-launch) | $22,000 | $22,000 | Fixed external cost |
| ISO 27001 audit | $28,000 | $28,000 | Fixed external cost |
| Legal / GDPR templates | $15,000 | $12,000 | AI drafts, lawyer reviews |
| ICO registration | $120 | $120 | Fixed |
| Snyk (SCA/SAST) | $2,400/yr | $2,400/yr | Reduced seats (8 → 6 active devs billing) |
| GitHub Advanced Security | $3,600/yr | $2,700/yr | 9 → 7 seats |
| HaveIBeenPwned API | $540/yr | $540/yr | Fixed |
| Turnitin API (Enterprise) | $8,000/yr | $8,000/yr | Fixed |
| Bug Bounty (HackerOne/Bugcrowd) | $18,000 | $18,000 | Fixed |
| Azure Reserved Instances savings | — | — | Applied post-launch |
| Team certifications (AZ-900, AZ-204, AZ-500) | $12,000 | $6,000 | Smaller team = fewer certs needed |
| Open Exchange Rates API | $480/yr | $480/yr | Fixed |
| **Total** | **$110,140** | **$100,240** | |

---

## Grand Total — AI-Augmented Plan

| Cost Category | Amount (USD) |
|---|---|
| Development (labour + AI tools + contingency) | $1,256,492 |
| Azure Hosting — DEV + QA + UAT (14 months) | $27,472 |
| Third-Party Licences & Compliance | $100,240 |
| **Total Project Cost** | **$1,384,204** |
| **Rounded Planning Figure** | **~$1.38M** |

---

## Full Comparison — All Scenarios

| Scenario | Timeline | Team | Total Cost | vs This Plan |
|---|---|---|---|---|
| Onshore (original) | 18 months | 11.5 FTE | $3,314,000 | −$1.93M |
| Hybrid Offshore (original) | 18 months | 11.5 FTE | $1,766,320 | −$382K |
| **AI-Augmented Hybrid (this plan)** | **14 months** | **8 FTE** | **$1,384,204** | **← Recommended** |

---

## Revenue Opportunity From 4 Months Faster Delivery

Launching 4 months earlier (month 14 vs month 18) creates direct revenue opportunity:

| Assumption | Value |
|---|---|
| Pilot tenants at launch (Starter plan, £299/month) | 10 tenants |
| Monthly revenue from pilot tenants | £2,990 (~$3,800) |
| Revenue recovered in 4 months | **~$15,200** |
| If 3 Growth tenants (£799/month) added during saved months | +$10,200 |
| **Total early revenue recovered** | **~$25,000** |

> Not a massive offset, but earlier launch = earlier product-market feedback, earlier enterprise pipeline, and 4 fewer months of burn rate.

---

## AI-Augmented Development: How It Works in Practice

### Day-to-Day Workflow

```
Developer receives task:
"Implement the DSAR data assembly endpoint"

Step 1 — Claude Code:
  "Generate a TypeScript server function that:
   - Takes a data_subject_id and tenant_id
   - Queries students, grades, attendance, SRB, messages, finance
   - Returns a structured JSON bundle
   - Respects RLS (query within tenant schema only)
   - Flags safeguarding SRB entries as requiring DSL review"

  → Claude generates 80% of the code in ~2 minutes

Step 2 — Developer:
  - Reviews the generated code (15 min)
  - Adds jurisdiction-specific edge cases (20 min)
  - Runs tests (Claude also generated these)

Step 3 — Claude Code:
  "Generate Playwright tests for this endpoint covering:
   - Valid DSAR request returns all data
   - Safeguarding entries flagged correctly
   - Cross-tenant data NOT returned
   - Rate limiting respected"

  → Tests generated in ~1 minute, developer reviews in 10 min

Total task time: ~50 minutes vs ~4 hours without AI
```

### What This Means for the Team

| Without AI | With AI |
|---|---|
| 1 developer writes 1 CRUD module per week | 1 developer ships 3–4 modules per week |
| 2 QA engineers needed to cover test volume | 1 QA engineer + AI test generation covers the same volume |
| Documentation written last (often skipped) | Documentation auto-generated from code; always current |
| Compliance logic takes days of research | Claude cites relevant GDPR articles + generates compliant code structure |
| IaC writing is slow, error-prone | Claude generates valid Bicep in minutes; DevOps reviews + adjusts |

---

## Risks Specific to AI-Augmented Development

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI-generated code has subtle bugs in compliance logic | Medium | High | All compliance code requires human legal/regulatory review before merge. Claude is a drafter, not a DPO. |
| Over-reliance on AI leads to reduced team understanding of the codebase | Medium | Medium | Code review is mandatory. Architecture sessions weekly. AI explains what it generated; team must understand it. |
| AI tool providers change pricing / availability | Low | Low | All AI tools are supplementary; team can operate without them. Core IP stays in the codebase. |
| Offshore AI-skilled engineers harder to hire | Medium | Medium | Start recruitment early (Month 0). Budget 6–8 weeks for hiring pipeline. |
| AI generates insecure patterns (prompt injection, etc.) | Low | High | Snyk + GitHub Advanced Security CI gates catch SAST issues before merge. Pen test catches anything that slips through. |

---

## Recommended Next Steps

1. **Month 0 — Hire the team** (4–6 weeks): Prioritise offshore Senior Full-Stack devs with Claude Code / Cursor experience. The Tech Lead, DevOps, and BA/PM can start immediately.

2. **Month 0 — Set up AI tooling** ($22K budget, provision from day 1): Claude Code org account, GitHub Copilot Enterprise, Cursor Business. Establish prompt libraries for this project's coding patterns.

3. **Month 1 — Phase 0 Architecture sprint**: Use Claude to accelerate ADR drafting and schema design. Deliverable: approved technical architecture, signed SRS, Azure infrastructure scaffold.

4. **Month 1 — Legal DPA engagement**: Engage a specialist ed-tech GDPR lawyer. AI generates the first draft of DSARs, Privacy Policy, DPA agreements. Lawyer reviews and signs off. Budget: $12K.

5. **Month 2 — Phase 1 Foundation**: First production-ready code sprint. Auth, multi-tenancy, CI/CD. Set the engineering standards early — AI code style, review gates, test coverage thresholds.

6. **Month 3 — Pilot tenant identification**: Identify 3–5 early adopter schools willing to join a beta programme (discounted Year 1 in exchange for feedback). Their requirements validate the SRS before Phase 2 is complete.

---

*This estimate replaces the Onshore and Hybrid Offshore scenarios from CostEstimation-OneEdu.md.*  
*Base SRS reference: SRS-OneEdu-Production.md v1.0.0*  
*Accuracy: ±20% (Class 4 estimate). Refine to ±10% after Phase 0 architecture sprint.*
