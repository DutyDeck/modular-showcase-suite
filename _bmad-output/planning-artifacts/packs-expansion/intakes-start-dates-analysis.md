---
title: Intakes & start dates — analysis and foundation design
date: 2026-11-02
status: implemented in prototype (see §6)
audience: product owner, PM, architect
---

# Intakes & start dates — analysis

## 1. Why this is foundation, not a feature

"When does this learner start, and on which cycle?" drives:
- admissions capacity and deadlines
- year-group placement
- which module runs a student registers onto
- the first day attendance is expected
- the first fee they owe, and pro-rata amounts
- census and funding dates
- visa reporting (non-arrival)
- the start and expected end dates every regulator return carries

If this is a free-text label, each module invents its own rule and they disagree. It has to be modelled once, in the foundation.

## 2. Where intakes vary

| Level | What varies | Examples |
|---|---|---|
| **Region** | Typical entry points, statutory dates, age cut-offs | UK HE September and January (UCAS equal-consideration deadline in late January). AU February/July semesters with per-unit **census dates** (TCSI, HELP liability). LK state universities follow the UGC cycle; private HE runs February, June and October. UAE schools start in August; Indian curriculum starts in April. India HE July/August. Singapore private institutions run monthly intakes. |
| **Institution** | Its actual intakes, windows, capacity | Northbridge runs September for everything and January for PGT only. Meridian Colombo overrides LK's January start with September. |
| **Programme / curriculum / qualification** | Which intakes admit to which offering; duration, so expected end differs | MSc Data Science: September and January, ends 12 months later. BSc CS: September only. CBSE stream: April. British stream: August. |
| **Module / unit run** | When a module is taught for a given cohort | A module taught in S1 for the September cohort is taught in Semester A (Jan–May) for the January cohort. AU census date is per unit run. VET units have their own activity start/end (AVETMISS). |
| **Learner** | Actual start, deferral, late arrival, rolling start, interruption | A rolling VET learner starts on any Monday. An in-year school joiner arrives mid-term. An offer holder defers to the next intake and keeps their deposit. |

## 3. Kinds of intake

- **Fixed:** one start date; window → deadline → start (most HE, main school entry).
- **Rolling:** admits on any start date between `start` and `lastStart` (VET, apprenticeships, in-year school admissions, monthly private-institution batches). Start date = the next Monday after enrolment.
- **Clearing / late:** treated as a Fixed intake whose deadline has passed but which is still accepting (a status, not a new kind).

## 4. Rules adopted

1. **Intakes are tenant data**, created from region templates (`INTAKE_TEMPLATES`) and then overridden. Nothing is fixed per country.
2. **An intake is scoped** to the programmes, curricula or qualifications it admits to (empty scope = all).
3. **Every intake is bound to an academic calendar.** The learner inherits the intake's calendar, so "current term", billing periods and module runs all come from it.
4. **The learner record stores `intakeId`, `startDate` and `expectedEnd`.** Start date is the intake start (Fixed) or the next Monday (Rolling).
5. **Year-group placement (schools)** is suggested from date of birth using the curriculum's age cut-off (British 31 Aug, CBSE 31 Mar, Sri Lankan national 31 Jan, NSW 31 Jul …). Staff can override it.
6. **Fees start at the start date.** Periods that ended before the start are not billed. The period the learner joins in is pro-rated by days remaining. A calendar is rolled forward by whole years when the intake starts after it ends.
7. **Attendance is expected only from the start date.** Registers exclude learners who haven't started yet.
8. **Module runs come from the module's teaching period × the intake calendar.** A student registers onto the run for their own intake.
9. **Census dates** are held per intake and per unit run in census regions (AU), and shown wherever liability or funding is decided.
10. **Deferral** moves an application to the next intake for the same offering. The offer and deposit move with it and it is logged.
11. **Returns validation** flags learners without a start date, and (in AU) runs with no census date.

## 5. What's still out of scope (production follow-ups)

- **Refund rules relative to start or census date** (e.g. a full refund before census). Configurable per tenant; not in the prototype.
- **Non-arrival visa reporting** (UK: CAS holder not enrolled by the latest permitted date; AU: PRISMS). The prototype shows the visa-monitoring tab for engaged students only.
- **Block / modular delivery** (one module per month) needs explicit run dates rather than semester mapping.
- **Age cut-offs** are demo-grade and need confirming per regulator. KHDA and Indian-state variations exist.

## 6. Implemented in the prototype

| Area | File |
|---|---|
| Region intake templates, census regions, placement rules | `src/lib/packs/regions.ts` |
| `Intake` entity, status, start date, billable periods, expected end, learner fields | `src/lib/packs/foundationData.ts` |
| Intakes management | Institution Profile → Intakes |
| Intake picker, capacity, deadline, deferral, enrol start date, pro-rata fee account, year-group suggestion | `/app/admissions` |
| Intake, start and expected-end dates on the record | `/app/learners` |
| Module runs per intake | `/app/he/programmes`, `/app/he/registration` |
| Not-yet-started learners excluded from registers | `/app/registers` |
| Fee schedule from start date | `/app/fee-accounts` |
| Start-date and census validation | `/app/returns` |
