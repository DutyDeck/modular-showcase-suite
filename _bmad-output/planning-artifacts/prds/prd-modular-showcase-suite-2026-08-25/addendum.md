# PRD Addendum — 1StudentID

*Depth that belongs downstream (architecture, SRS, business planning), preserved so the PRD stays capability-focused. Sources: `extract-legacy-docs.md`, `extract-prototype.md`, `extract-market-research.md`.*

## 1. Hosting & stack decisions (for `bmad-architecture`)

**Board-approved design (Hosting-Architecture v1.1, June 2026) — the later, governing document for Phase 1:**
- Azure exclusively; launch **UK South** (DR: UK West); managed-first PaaS; one core technology set.
- Edge: Azure Front Door + WAF → **Azure App Service Premium v3** (zone-redundant, auto-scale) → **Azure SQL Database** (Row-Level Security tenant isolation, 99.99% built-in HA, PITR ≤35 d).
- Identity: Microsoft Entra External ID (social logins Google/Apple/Microsoft/Facebook + enterprise SSO; MFA; PIM/break-glass).
- Blob Storage (incl. write-once immutable audit container), Key Vault (per-tenant keys), Azure Communication Services (email/SMS/OTP), App Insights + Log Analytics, Defender for Cloud.
- Phase-2 add-ons as modules activate: SignalR/Web PubSub, Redis, Service Bus, Notification Hubs, Azure OpenAI + AI Search (in-region), API Management, Private Endpoints/NAT.
- Environments DEV / UAT / PROD.

**Earlier engineering spec (Production SRS §10) — differs; treat as alternative considered:**
- Azure Container Apps (not App Service); **PostgreSQL Flexible Server** with per-tenant schemas + RLS (not Azure SQL); 4 environments (DEV/QA/UAT/Prod) with scale ratios; full CI/CD gate ladder (SAST → Playwright → regression + WCAG audit → k6 perf gate → change-managed prod); six launch geo-regions.
- **Decision needed at architecture time:** App Service + Azure SQL (board-approved, later) vs Container Apps + PostgreSQL (engineering spec). The board doc governs on paper; the architecture workflow should ratify or overturn explicitly. The Production SRS remains the best source for CI/CD gates and the DR ladder regardless.
- Cosmos DB explicitly rejected unless very-high multi-region write throughput emerges.

**Multi-region model (deferred, must-not-preclude):** regional self-contained stamps per jurisdiction; global control plane holds non-PII registry only (tenant→region, 1StudentID namespace, billing); inter-region mTLS; DR pair within same jurisdiction; Data Residency Attestation API; tenant geo-migration procedure (72 h window, dual-run, deletion certificate).

**Prototype carry-forward notes:** screens/UX are the spec (React 19 + TypeScript, TanStack Router, Tailwind 4 + shadcn/Radix, recharts); the localStorage store (43 collections, seed-versioned) maps to the production data model; the pure-function billing engine (`lib/billing.ts`) is directly portable to server-side; client-side ModuleGate/menus become UX over server-enforced entitlements (the prototype code itself notes this).

## 2. Cost & schedule operating points (business planning)

Three superseding generations — different operating points, not contradictions:

| Generation | Scope | Cost | Schedule |
|---|---|---|---|
| G1 full build (June 2026) | 21 modules, 11.5 FTE peak, 3,014 PD | ~$3.31M onshore / ~$1.77M hybrid (Y1 TCO +$170K) | 18 mo (75% conf; 90% at 22 mo) |
| G2 AI-augmented (June 2026) | same scope, 8 FTE, 1,817 PD (−40%) | **~$1.38M** total | 14 mo; soft launch UK mo 12 |
| G3 lean MVP pods (July 2026, current) | productionise prototype, MVP-first | rate-agnostic pod-months: coaching MVP ~1–1.5, swim MVP ~1.5–2, full ~4.5–5 pods; 2nd pod compresses calendar ~30–40% | coaching MVP 4–6 wks; swim 6–8 wks |

Hosting run-rates: lean launch ≈ **$1,094/mo all-in** (DEV $103 + UAT $169 + PROD-HA $672 + tools $150); Phase-2 service add-ons +~$565/mo; full-scale region (~50 tenants / 25K users) ~$13.8–17.4K/mo. Non-prod 18-mo total ~$34K with shutdown savings. Compliance/3rd-party Y1 ~$110K (pen test $22K, ISO 27001 $28K — *deferred*, legal $15K, bug bounty $18K), ~$48.5K/yr recurring. Native mobile was excluded from G1/G2 (+$300–600K estimated) — now committed scope, so budget accordingly. Dual-segment Phase 1 (user decision) ≈ swim-segment cost envelope (~1.5–2 pods) since the swim pack includes the shared core.

Revenue anchors (legacy docs): Starter ~£299/mo, Growth ~£799/mo. Market anchors (2026 research): school SIS $2–15/student/mo or $100–900/mo flat; club tools $4.50–6/active student/mo + ~$125 base. Per-student pricing punishing growth is a documented club-owner pain — flat tiers are a differentiator.

## 3. Conflict register & resolutions

| # | Conflict (sources) | Resolution |
|---|---|---|
| 1 | Native mobile primary (baseline SRS) vs PWA-only (production SRS, cost model) | **Resolved by user 2026-08-25: web + native mobile.** Apps enter Phase 2 family-first *(assumption, OQ-5)*. |
| 2 | Module count 21 (production SRS) vs 24 (strategy docs, prototype) | **24 per the prototype's shipped catalog** (adds branding, settings/core split, onboarding). SRS refresh should restate. |
| 3 | Student ID `S-XXXX` vs `OE-XXXXXXXXXX` (production SRS internal) | Assumed **S-XXXX** (prototype-consistent). Open: OQ-1. |
| 4 | Azure SQL + App Service (board hosting v1.1) vs PostgreSQL + Container Apps (production SRS) | **Defer to `bmad-architecture`**; board doc governs until overturned (§1). |
| 5 | 6 launch geo-regions (production SRS) vs single UK region (hosting v1.1) | **Single UK region** — aligned with user's compliance narrowing. Multi-region = must-not-preclude constraint. |
| 6 | Compliance breadth: 10+ jurisdictions, ISO 27001/SOC 2 (both SRS) vs initial scope | **Resolved by user 2026-08-25: Cyber Essentials Plus + UK GDPR only initially** — see deferred register §4. |
| 7 | Lean coaching-only MVP (board deck) vs "all features" + dual-segment (user) | **Full scope phased; Phase 1 = shared core + SRB + tenant plumbing + Swim Pack; dual-segment GTM.** |
| 8 | Hosting $672/mo vs $13.8–17.4K/mo/region | Different operating points (lean launch vs full-scale region) — both kept in §2. |
| 9 | Product name OneEdu vs 1StudentID | **1StudentID** (user-confirmed, July board name). Domain scheme open: OQ-2. |

## 4. Deferred compliance register (revisit at international expansion / enterprise deals)

EU GDPR operations (EU tenants), FERPA & COPPA-as-amended-2025/26 (US — note: written retention/deletion policy + separate third-party-sharing consent now mandatory there), PIPEDA (Canada), DPDP (India), PDPA (Sri Lanka/Singapore), UAE PDPL; ISO 27001 & SOC 2 Type II certification tracks; multi-region residency + attestation API; biometric attendance DPIAs; UK DUAA-driven EdTech/AI codes of practice (monitor — likely relevant even UK-only). Retained in-scope now: UK GDPR + DPA 2018, ICO Children's Code, Cyber Essentials Plus, safeguarding-aware SRB with 25-y retention, CHECK/CREST pen test.

## 5. Market positioning notes (from research, decision-relevant)

- Two non-overlapping incumbent families (school SIS+LMS vs club management) with documented mutual blind spots — the dual-segment wedge is validated; no incumbent serves both.
- Modularity alone is table stakes (Classter, Classe365, OpenEduCat sell per-module); the **semantic-swap Discipline Pack is the defensible move**.
- Coach substitution advertised by only one mainstream club platform (Daxko); AI lesson reporting still early among premium swim operators — swim pack features are ahead of market.
- Club-owner pain points to exploit in messaging: clunky mobile apps, unreliable group messaging, weak reporting, feature-gating, per-student pricing.
- 2026 parity checklist: parent native app with push + in-app payments (incl. wallets), SSO/MFA/RBAC/audit, online booking (54.3% of 2025 swim enrolments were online), PowerBuddy-style AI assistant.
- Full digest with sources: `extract-market-research.md`.

## 6. Personas / demo depth (reference)

The prototype's 9 demo personas (see `extract-prototype.md` §2.2) double as PRD personas; the two demo scripts (`DEMO-SCRIPT.md`, `SWIM-DEMO-SCRIPT.md` in repo root) narrate the intended experience end-to-end and should be treated as UX reference material by `bmad-ux`. The 68-step guided tour encodes the swim journeys in executable form.
