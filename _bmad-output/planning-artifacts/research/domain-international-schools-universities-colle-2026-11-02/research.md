---
title: 'domain research: SIS/LMS requirements for international schools, universities and colleges (UK, LK, AU, UAE/GCC, IN, SG, MY)'
type: 'domain'
topic: 'Regulators, statutory returns, attendance and visa monitoring, staff vetting, identifiers, calendars, grading, exam boards, incumbents for International School / Higher Education / College packs'
decision: 'Scope International School, Higher Education and College packs for 1StudentID (prototype seed data + PRD amendment)'
source: 'native run (web fan-out, 10 researcher assistants + lead spot-checks)'
status: complete
preset: 'standard (subagents raised to 3-4 per segment; headless)'
validation: 'normal'
created: '2026-11-02'
updated: '2026-11-02'
claims_verified: 56
claims_unverified: 8
claims_disputed: 1
---

# Domain research: SIS/LMS requirements for international schools, universities and colleges (UK, LK, AU, UAE/GCC, IN, SG, MY)

**Decision this research serves:** what the International School Pack, Higher Education Pack and College add-on of 1StudentID must model per region — regulators, statutory returns, attendance/visa monitoring, staff vetting, identifiers, calendars, grading — feeding prototype seed data and a PRD amendment.

**How to read this:** every fact carries a tag — `verified` (official/primary source read this run, or two independent sources agree), `likely` (one credible source, or an official page seen only as a search excerpt), `unverified` (belief, no evidence found this run; do not hard-code). Research date 2026-11-02; regulatory facts move fast — see the staleness map.

## Executive summary

**Build every compliance rule as per-tenant configuration keyed by (country, sub-jurisdiction, segment, regulator), not as hard-coded national logic.** The evidence shows that rules differ inside countries as much as between them: UAE has four school regulators, not three; UK visa attendance rules differ between universities and FE colleges/schools; Australia's ESOS attendance duty applies to schools/ELICOS/Foundation but not to university award courses.

The three findings that drive the PRD:

1. **Attendance is three different things.** (a) Statutory *daily register codes* exist only in England (34 DfE codes, mandatory for all schools incl. independent) [1]; UAE (ADEK) uses an enumerated list of 13 authorised-absence reasons plus daily upload to eSIS [74]; nowhere else found has a national code set. (b) *Visa attendance/engagement monitoring* is the cross-region driver: UKVI (HE = 60-day academic-engagement clock; FE/schools = 10 consecutive missed contact points) [6], AU ESOS (80% / 70% with Notice of Intention to Report then PRISMS) [27][30], SG ICA (90% monthly, 7 consecutive days) [51], MY EMGS (80% + CGPA 2.0 at renewal) [64]. (c) *Funding attendance* for colleges: SG SSG (Singpass e-attendance, course-level threshold) [53][56], MY HRD Corp Form T3 [68], India PMKVY AEBAS biometric [150], England apprenticeship off-the-job hours [21].
2. **Statutory returns are segment-specific and mostly UK/AU/IN.** UK: SLASC for independent schools (annual, aggregate, January) [3], ILR R01–R14 for FE [16], HESA Data Futures (annual until first in-year collection in winter 2028) [8]. AU: Non-government Schools Census (Aug) [39], TCSI (event-based) [33], AVETMISS 8.0 (quarterly) [45][46], PRISMS [32]. IN: UDISE+ (ref date now 31 Mar) [135], AISHE (annual) [144]. UAE: ADEK eSIS (daily) [74], MoHESR HEDB [89]. **LK international schools have no government return at all** [121].
3. **Identifiers need a typed, multi-valued "official IDs" model with validators**: UPN (13 chars, mod-23 check letter) [4], ULN (10 digits) [17], HESA SID (17 chars) [10], USI (10 chars) [36], CRICOS codes [37], Emirates ID (15 digits, 784-) [93], Saudi NID/Iqama (10 digits, 1/2 prefix) [104], LK NIC (old 9+V/X, new 12) [128], APAAR (12 digits, with REFUSED/NOGEN states) [138][141], NRIC/FIN [58].

**Biggest caveat:** several official sites (legislation.gov.uk, hesa.ac.uk, education.gov.au, ncver.edu.au, khda.gov.ae) refused automated fetch, so some facts rest on official-domain search excerpts (tagged `likely`). GCC staff-vetting detail and Saudi Noor scope remain the weakest areas.

### Prior assumptions checked

| Prior assumption | Verdict | Evidence |
|---|---|---|
| DfE attendance codes mandatory for all schools in England incl. independent | **Holds, with nuances.** Codes apply to "all schools"; registers must be electronic. But: fully-boarding schools need no attendance register and boarders are not coded; independents cannot issue penalty notices or attendance contracts; daily attendance data-sharing with DfE is mandatory for state-funded schools only. Code list in the brief was outdated (J→J1, R exists, no H). | `verified` [1] |
| UAE = KHDA (Dubai), ADEK eSIS (Abu Dhabi), MoE (other emirates) | **Contradicted (incomplete).** Sharjah has its own regulator, **SPEA** (Decree 18/2020); MoE licenses Ajman, UAQ, RAK, Fujairah; RAK reportedly has a co-regulator (RAK Department of Knowledge). KHDA requires Dubai schools to follow the federal MoE calendar. | SPEA `likely` [75]; MoE `verified` [76]; RAK `likely` [77] |
| LK international schools often run Sep–Jul | **Refined.** All three named schools checked start in **late August** (24–31 Aug) and end late Jun/early Jul in three terms (Michaelmas/Lent/Summer). No Jan–Dec international school found. Govt schools run Jan–Dec. | `verified` [122][123][124]; govt [125] |
| Indian-curriculum schools in UAE run Apr–Mar | **Holds.** Excluded from the unified 31 Aug calendar; Dubai April-start schools began AY 2026-27 on 6 Apr 2026, Sharjah on 30 Mar 2026. CBSE mandates 1 Apr–31 Mar. | `likely` [84][85][86]; CBSE `verified` [136] |

## Part A — Higher Education Pack

### UK (HE)
- **Regulators:** England OfS (registration categories "Approved (fee cap)" / "Approved"; condition F1 transparency data) `verified` [9]; Wales **Medr** (Register of HE Providers, 17 ongoing conditions; first register 1 Aug 2026) `likely` [26]; QAA / SFC (Scotland) / DfE-NI `unverified`.
- **Statutory returns:** HESA (Jisc, designated data body) **Student return via Data Futures — annual** until "Winter 2028: first full in-year student data collection" (2028-29 data model; testing from autumn 2027) `verified` [8]. OfS **HESES** annual early-statistics survey for fee-cap providers `verified` [9]. Graduate Outcomes exists (c22071/c23072) `likely` [10]; HESA Staff record `unverified`.
- **Identifiers:** HESA **SID = 17 chars** (2-digit entry year + 8-digit UKPRN + 6-digit provider ref + check digit), replaced the **13-digit HUSID** (continuing students keep HUSID) `likely` [10]. **UCAS Personal ID = 10 digits** (shown 123-456-7890), collected as UCASPERID `likely` [11]. ULN in HESA / Scottish Candidate Number `unverified`.
- **UKVI Student route (sponsor duties, Doc 2 v10/2026, from 8 Oct 2026)** `verified` [6]:
  - HE providers run an **academic engagement policy** (replaced attendance monitoring). Band 2 (RQF 6+): max **60 calendar days of non-engagement before intervention (30 for remote)**, vacations excluded, PGR excluded; if no re-engagement within 60 days (30 remote) of first contact → **must withdraw sponsorship**.
  - Band 1 (HE provider, RQF ≤5 / SCQF ≤8): ≥15 h/week daytime classroom study; **<85% in any month → review; <70% for 3 consecutive months → withdraw**.
  - Reporting via SMS **within 10 working days**: non-enrolment (from end of enrolment period), withdrawal, deferral >60 days, stopping sponsorship; full sponsors may alternatively use **two checkpoints per rolling 12 months**. Organisational changes 20 working days; UKVI data requests 21 days.
  - Records kept until **1 year after sponsorship ends**; CAS valid **6 months**; eVisas replace BRPs (post-31 Oct 2024).
  - **Basic Compliance Assessment** (from 1 Jun 2026): refusals **<5%**, enrolment **≥95%**, completion **≥85%** (→ **≥90% from 1 Jun 2027**); new RAG rating = worst metric `verified` [7].
- **Calendar/credit:** Sept/Oct start, 120 credits/yr, FHEQ levels 4–8; SCQF mapping RQF5=8, 6=9/10, 7=11, 8=12 `verified` (mapping) [6]; January intakes `unverified`.
- **Grading:** First 70+, 2:1 60–69, 2:2 50–59, Third 40–49; rules set locally `likely` [25]. HEAR/GPA `unverified`.
- **Vetting:** DBS only for regulated activity; right-to-work for all `unverified`.
- **Incumbents:** Tribal SITS claims >60% of UK HE (vendor claim repeated by Warwick) `likely` [12]; VLE share Moodle ~51%, Blackboard ~20%, Canvas ~19% (2024) `likely` [13].
- **DP law:** UK GDPR + DPA 2018 as amended by the **Data (Use and Access) Act 2025**; main DP provisions commenced **5 Feb 2026**; ICO became the **Information Commission on 30 Sep 2026** `verified` [14].

### Australia (HE)
- **Regulators:** TEQSA (HESF 2021); ESOS agency TEQSA for HE, ASQA for VET/ELICOS `likely` [27]. **2026 National Planning Level = 295,000** new international commencements `verified` [38].
- **ESOS/National Code 2018 Standard 8:** **HE award courses are not attendance-monitored** — only course progress; attendance monitoring applies to school, ELICOS, Foundation (and VET only when ASQA imposes it) `verified` [27][28][29]. Where it applies: 80% of scheduled contact hours; **Notice of Intention to Report → 20 working days to appeal → PRISMS report** `likely` [31].
- **PRISMS s19 reporting:** non-commencement/termination within **14 days (under-18) / 31 days (18+)** `verified` [32][160].
- **TCSI:** event-based packets; deadlines in the annual HE Data Collection Instrument; corrections within 7 days `likely` [33].
- **Identifiers:** **USI** (10 chars) required for Commonwealth assistance and to graduate (incl. onshore internationals) since 1 Jan 2023 `likely` [34][36]; **CHESSN** being decommissioned but still auto-allocated in TCSI (store read-only) `likely` [34]; **CRICOS provider code = 5 digits + letter** (e.g. 00026A), course code = 6 digits + letter `likely` [37].
- **Grading:** 7-point GPA, HD 85–100 / D 75–84 / C 65–74 / P 50–64; fail bands institution-specific (QUT has 3 = Marginal Fail, no "N") `verified` (QUT) [43]. Semesters Feb/Mar–Jun & Jul–Nov `unverified`.
- **DP law:** Privacy Act 1988 + POLA Act 2024 (assent 10 Dec 2024; privacy tort from 10 Jun 2025) `verified` [49]; **Children's Online Privacy Code** exposure draft Mar 2026, registration due 10 Dec 2026 `verified` [50].

### Singapore (HE / private education)
- **Student's Pass (ICA):** school undertakes to monitor attendance: **no <90% in any month and no 7+ consecutive days absence** without valid reason, else notify ICA; ICA T&Cs also say 90% overall `verified` [51]. No statutory notification day-count found.
- **Private Education Regulations 2009:** PEIs must keep student records incl. NRIC/FIN and attendance; CPE (under SSG) regulates PEIs `likely` [61].
- **Grading:** NUS now says "GPA" (was CAP); Highest Distinction ≥4.50, Distinction 4.00–4.49, Merit 3.50–3.99, Honours 3.00–3.49 `likely` [59]. AY Aug–May `unverified`.
- **IDs:** NRIC/FIN; **M-series FIN** since 1 Jan 2022 (M+7 digits+checksum letter) `likely` [58].
- **DP law:** PDPA 2012; PDPC children's-data advisory guidelines (Mar 2024, non-binding) `likely` [62].

### Malaysia (HE)
- **EMGS student pass renewal:** **≥80% attendance and CGPA ≥2.0**; below 80% needs Dean's letter `verified` [64][73].
- **Grading:** CGPA 4.0; First Class cut-off varies (UM uses 3.70; commercial sites 3.67) `likely` [71].
- **IDs:** MyKad 12 digits YYMMDD-PB-###G (last digit odd = male) `likely` [72].
- **DP law:** PDPA 2010 + Amendment Act 2024: phases 1 Jan / 1 Apr / **1 Jun 2025 (DPO + breach notification + portability)** `verified` [66].
- Regulators MOHE / MQA (MQF, MQR) / Act 555 `unverified`.

### UAE (HE)
- **MoHESR Higher Education Database (HEDB):** all CAA-accredited universities must submit data "regularly" (frequency not published) `verified` [89]; Jan 2026 real-time integration with 54 HEIs `verified` [90].
- **Dubai free zones:** KHDA oversees, quality body **UQAIB** (not "UQAIC") `likely` [91]; whether CAA accreditation is also needed is disputed.
- **Student visa:** university-sponsored, cancelled on withdrawal/suspension/deferral; no federal attendance threshold found `likely` [98].
- **Calendar:** MoHESR 3-year HE calendar 2026–29, AY starts **31 Aug 2026** `verified` [92].

### Saudi Arabia (HE)
- Universities choose 2- or 3-semester models (public schools reverted to 2 in 2025-26) `verified` [102]; KSU 2026-27 starts 30 Aug 2026 `likely` [103].
- **GPA 5.0** at KSU and most public universities `likely` [109]; NQF-KSA 8 levels (ETEC) `likely` [110].
- **IDs:** 10-digit; first digit **1 = Saudi National ID, 2 = Iqama**; last digit check `likely` [104].
- **DP law:** PDPL in force 14 Sep 2023, grace period ended Sep 2024; SDAIA consulting on Implementing Regulation amendments (Oct 2026) `verified` [106].

### Qatar (HE)
- MoEHE regulates; licensing detail not found `unverified`. **DP law:** Law No. 13 of 2016 (effective date and regulator name vary by source) `likely` [118]. QID 11 digits `likely` [117].

### Sri Lanka (HE)
- **SLQF 12 levels** (UGC QAC; bachelor L5–6, MPhil L11) `likely` [129].
- **Classes:** First Class CGPA ≥3.70, Second Upper 3.30–3.69 (Peradeniya); 4.0 scale `verified` [130]; Second Lower 3.00 / Pass 2.00 `unverified`.
- **Intakes:** state universities follow the UGC A/L cycle with irregular, delayed intakes `likely`; SLIIT main intake **February** (Jan for PG) `likely` [131].
- **IDs:** NIC 12 digits from 1 Jan 2016; old 9 digits + V/X `verified` [128].
- **DP law:** PDPA No. 9 of 2022 — Parts I & III commence **1 Jan 2027** (Gazette 2498/16); Part II (data-subject rights) not yet scheduled `verified` [126].

### India (HE)
- **AISHE:** annual survey by MoE Dept of Higher Education; every institution has an AISHE code (colleges "C-"); reference date 30 Sep; covers enrolment, teachers, programmes, results, finance, infrastructure `verified` [144].
- **APAAR/ABC:** APAAR officially not mandatory for students, but UGC requires HEIs to upload credit data to **NAD-ABC mapped to APAAR IDs** (deadline 30 Jun 2026 for 2025 exams) `likely` [145].
- **Regulators:** UGC/AICTE/NAAC remain; HECI successor **Viksit Bharat Shiksha Adhishthan Bill 2025** sent to a Joint Parliamentary Committee, not passed `likely` [146].
- **Grading:** UGC CBCS O=10, A+=9, A=8, B+=7, B=6, C=5, P=4, F=0, Ab=0; % cut-offs institution-defined `verified` [147].
- **Calendar:** odd semester Jul/Aug start (e.g. IFHE 5 Aug 2026) `likely` [153].
- **Incumbent:** **Samarth eGov** ERP (MoE-backed, ~38 central universities) `likely` [148].
- **DP law:** DPDP Act 2023 + **DPDP Rules 2025** (notified 13 Nov 2025): consent managers from **13 Nov 2026**; main duties (notice, consent, breach, erasure, verifiable parental consent for under-18s) from **13 May 2027** `verified` [142].

## Part B — International School Pack

### UK / England (independent & international schools)
- **Attendance codes (Aug 2024 regs; Jul 2026 guidance)** — mandatory, "All schools must use the following codes" `verified` [1]:

| Code | Meaning | Statistical category |
|---|---|---|
| `/` `\` | Present AM / PM | Present |
| L | Late before register closed | Present |
| K | LA-arranged education provision | Approved educational activity |
| V | Educational visit/trip | Approved educational activity |
| P | Sporting activity | Approved educational activity |
| W | Work experience | Approved educational activity |
| B | Other approved educational activity | Approved educational activity |
| C1 | Leave: regulated performance / employment abroad | Authorised absence |
| M | Leave: medical/dental appointment | Authorised absence |
| J1 | Leave: interview (employment/admission) | Authorised absence |
| S | Leave: study for public exam | Authorised absence |
| X | Non-compulsory-age pupil not required to attend | Not a possible attendance |
| C2 | Leave: part-time timetable (compulsory age) | Authorised absence |
| D | Dual registered elsewhere | Not a possible attendance |
| C | Leave: exceptional circumstance | Authorised absence |
| T | Parent travelling for occupational purposes | Authorised absence |
| R | Religious observance | Authorised absence |
| I | Illness | Authorised absence |
| E | Suspended / permanently excluded | Authorised absence |
| Q | Lack of access arrangements | Not a possible attendance |
| Y1–Y7 | Unavoidable cause: transport, travel disruption, part premises closed, whole site closed, criminal justice detention, public health, other | Not a possible attendance |
| G | Holiday not granted | Unauthorised |
| N | Reason not yet established (replace within 5 school days) | Unauthorised |
| O | Other/unknown | Unauthorised |
| U | Arrived after register closed | Unauthorised |
| Z | Prospective pupil not on roll | Administrative |
| `#` | Planned whole-school closure | Administrative |

- **Register rules:** admission + attendance registers kept electronically (offence if not); register taken AM and once in PM, open max 30 min; remote education still coded as absence; fully-boarding schools need no attendance register; boarders not coded `verified` [1].
- **Independent-school specifics:** guidance statutory for independents (ISSR 2014 para 7(b)); **no penalty notices, no school attendance contracts**; deletion ground **N** (ceased to be a pupil at independent school) is theirs, ground M (unpaid boarding) is not; **New Pupil Return to LA within 5 days**, Deletion Return on removal; daily attendance data to DfE mandatory only for state-funded `verified` [1].
- **Returns:** **SLASC** — annual, census day 3rd Thursday of January (21 Jan 2027; deadline 21 Feb 2027), via DfE COLLECT, aggregate (fees, pupils by age/sex, SEN, boarding, teacher FTE, 15+ courses incl. IB/A level/IGCSE, proprietors); non-completion can lead to removal from register `verified` [3]. School Census (termly, pupil-level) is for state-funded only `unverified`.
- **IDs:** **UPN** 13 chars = check letter + LA (3) + establishment (4) + year (2) + serial (3); check letter = Σ(digit×position) mod 23 → A–Z excluding I, O, S; temporary UPNs end in a letter; **no statutory duty on independents** (may generate via LA + DfE number). LAESTAB = 7 digits `verified` [4].
- **Staff vetting — KCSIE 2026 (in force 1 Sep 2026) SCR must record, with dates:** (1) identity, (2) standalone children's barred list check, (3) enhanced DBS with barred list, (4) prohibition-from-teaching check, (5) overseas checks for those who lived/worked abroad, (6) professional qualifications where required, (7) right to work; plus **section 128 check for management (independent schools/academies)**; SCR covers all proprietor-body members; agency staff need written agency confirmation; childcare-disqualification info optional `verified` [2].
- **Calendar:** Sept–July, 3 terms, 195 days (190 pupil + 5 INSET), dates set by LA or governing body `likely` [159].
- **Exams:** see Part D. **Incumbent MIS (England, Dec 2025):** Arbor 44%, SIMS 32%, Bromcom 16%; ScholarPack/Integris migrating to Arbor `verified` [5]; iSAMS/WCBS share in independents `unverified`.

### Australia (schools)
- **Overseas students (National Code Std 8):** attendance ≥80% of scheduled contact hours per study period (states may set higher); may choose not to report if ≥70% (8.15); written **Notice of Intention to Report → 20 working days → PRISMS** `verified` (80%) [30], others `likely` [30]. Study period may be a semester.
- **Under-18 welfare (Std 5):** CAAW (Confirmation of Appropriate Accommodation and Welfare) until 18 / departure / transfer; not needed if parent or approved relative is responsible `likely` [30].
- **Returns:** **Non-government Schools Census** (s77 Australian Education Act 2013): census day **Fri 7 Aug 2026**, submit via Education Funding System by 14 Aug; reference period = 20 school days ending census day `likely` [39]. **ACARA National Standards for Student Attendance Data Reporting** (3rd ed., Years 1–10) `verified` [40].
- **Vetting:** state Working With Children Checks — NSW, VIC, SA, ACT 5 yrs; QLD blue card 3 yrs; NT Ochre Card 2 yrs; WA/TAS disputed `likely` [41]; issuer names `unverified`. Teacher registration bodies per state `unverified`.
- **Calendar:** 4 terms Jan/Feb–Dec (NSW 2027: 28 Jan–17 Dec) `verified` [42]. State student numbers (NSW SRN, VSN, QLD LUI) `unverified`.

### Singapore (international / foreign system schools)
- **Student's Pass for FSS:** school must be **EduTrust-certified** or ICA will not consider the application; Registration Acknowledgement Letter; S$45; apply 2–3 months ahead `verified` [52].
- **Registration:** private schools under the Education Act register "teachers permitted to teach"; **full-time foreign/international-curriculum schools register with SSG instead**; no background-check rule stated `verified` [57].
- **Calendar:** MOE schools Jan–Nov, 4 terms (2027 Term I 4 Jan–12 Mar … Term IV to 19 Nov) `likely` [60]; international schools Aug–Jun `unverified`. No attendance reporting duty found for FSS Student's Pass holders.

### Malaysia (international schools)
- **Student Pass (school level):** filed with **Immigration on IMM.14** (not EMGS), needs Private Education Division (MOE) approval and a **MOHA approval letter**; ages 3+; guardian pass RM90 `verified` [63].
- **Vetting:** **Permit Mengajar** (teaching permit) has category "F – Sekolah Antarabangsa", max 5 years `likely` [70]; JKM **Child Register** screening exists but is voluntary `likely` [69].
- **Calendar:** national schools back to **January start from the 2026 session** (11/12 Jan 2026) `verified` [65]; international schools Aug/Sep `unverified`.

### UAE (private schools)
- **Regulators:** KHDA (Dubai); ADEK (Abu Dhabi); **SPEA (Sharjah)**; MoE (Ajman, UAQ, RAK, Fujairah; Federal Decree-Law 18/2020) — see prior-assumption table [75][76][77].
- **ADEK (Student Administrative Affairs Policy v1.1, Sept 2024; compliance from AY 2025/26)** `verified` [74]: all students registered on **ADEK eSIS**; attendance reported **daily on eSIS**; registration documents (birth cert, passport, **Emirates ID**, parents' passports + residency, DoH medical, attested Transfer Certificate); follow up unreported absences **within 2 hours** of register closing; absence **>5% (G1+) / >10% (KG)** = cause for concern; 3+ lates → behaviour policy; **13 enumerated authorised-absence reasons, no alphanumeric codes**; cycles KG / C1 G1–5 / C2 G6–8 / C3 G9–12.
- **Dubai attendance:** authorised vs unauthorised only; inspection bands 98/96/94/92% (Outstanding/Very good/Good/Acceptable) `likely` [87]. KHDA student data system name/frequency `unverified`.
- **Vetting:** Dubai — KHDA **Appointment Notice per teacher per school** (replaced Appointment Letter, 10 Sep 2025), exit survey before transfer, 90-day wait for mid-term leavers, signed Code of Conduct, qualification standards for existing staff by Sep 2028 `verified` [78]; attested **good conduct certificate** for faculty registration `likely` [79]; lookback disputed ("every country worked in past 5 years" [82] vs "last country") `unverified`. Abu Dhabi — good conduct (UAE if resident, else home country), attested, uploaded via ADEK staff portal (**PASS**) `likely` [80][81]. Federal teacher licence (pedagogy + specialisation tests) required `likely` [88].
- **Calendar:** unified 2026-27: **31 Aug 2026 – 2 Jul 2027**, mid-term 12–18 Oct, winter 14 Dec–3 Jan, spring 5–11 Apr; fixed for 2026–29 `verified` [83]. Indian/Pakistani/Bangladeshi curricula excluded, start April [84][85][86].
- **IDs:** Emirates ID 15 digits, `784-YYYY-NNNNNNN-C`; YYYY not reliably birth year — do not derive DOB `likely` [93][94].
- **DP law:** Federal Decree-Law 45/2021 (PDPL) — executive regulations reportedly still not issued (not yet enforceable) `likely` [95]; DIFC/ADGM regimes `unverified`.

### Saudi Arabia (international schools)
- **New General Education Law (Royal Decree M/36)**, gazetted 24 Jul 2026, effective ~20 Jan 2027; **repeals the Foreign Schools Regulation**; private schools need ETEC or ETEC-recognised accreditation; national-identity subjects mandatory `verified` [99].
- **Noor:** MoE's integrated system for institutions "affiliated with the ministry" `verified` [100]; used for private/international Grade 1 registration (2023) `likely` [111]; **mandatory use for international-school attendance/grades not evidenced** `unverified`.
- **Vetting:** ETEC professional licence covers private and international school teachers (practising level within 4 years) `likely` [105]; police clearance `unverified`.
- **Calendar:** public schools 2 semesters from 2025-26, 2026-27 starts 23 Aug 2026; private/international choose own structure `verified` [101].

### Qatar (private schools)
- MoEHE Private Schools and Kindergartens Department; 2026 admission & registration guide mandates a unified electronic enrolment platform `verified` [112]; enhanced licensing system for private schools (Oct 2025) `likely` [120]; **NSIS** for private-school certificates `likely` [113]; **Hadori** palm attendance for government schools only `likely` [114].
- **Vetting:** professional licence (temporary → professional → full) for teachers/leaders; Sept 2026 application window `verified` [115]; private schools may recruit directly `likely`.
- **Calendar:** MoEHE 3-year calendar 2025–28; 2026-27 students return 30 Aug 2026 `verified` (approval) [116].

### Sri Lanka (international schools)
- **Regulation:** MoE has **no legal authority** to register/regulate/monitor international schools; ~393 operate as companies (Companies Act 2007 / Business Names Ordinance) or via BOI `verified` [121][134]; NEC 2024 QA framework is a manual, not law.
- **Returns:** **none** — no national database; students sit O/L & A/L as **external (private) candidates** with Dept of Examinations `verified` [121].
- **Vetting:** no statutory police-clearance rule for private/international school teachers; NCPA fingerprint + police-clearance proposal (Feb 2026) is state-sector only `likely` [127].
- **Calendar:** late Aug–late Jun/early Jul, 3 terms (CIS 28 Aug 2026–9 Jul 2027; BSC 24 Aug–29 Jun; EMS 31 Aug–2 Jul) `verified` [122][123][124]. Govt schools Jan–Dec (2026 started 5 Jan) `verified` [125].
- **DP law:** see Part A (PDPA Parts I & III from 1 Jan 2027) [126].

### India (private / international schools)
- **UDISE+:** annual, covers private unaided recognised schools; **reference date 31 March** (was 30 Sep up to 2021-22); student-wise data since 2022-23 `verified` [135]. **PEN** (11 digits) vs UDISE+ school code (also 11 digits) `likely` [154].
- **APAAR:** 12 digits, generated via UDISE+ with parental consent `likely` [141]; CBSE LOC field accepts **ID / "refused" / "NOGEN"** (keep parental refusal on file) `likely` [138]; mandatory for 2026-27 Class 9/11 registration and 10/12 LOC `likely` [137]; **overseas CBSE schools (e.g. UAE) exempt** `likely` [139].
- **Calendar:** CBSE session **1 Apr–31 Mar** (Circular Aff-07/2023) `verified` [136]; Kerala state schools reopen **1 June** `verified` [152].
- **Vetting:** CBSE Circular 19/2017 — **police verification and psychometric evaluation of all staff** (teaching, non-teaching, drivers, conductors) `verified` [140]; current status `unverified`.
- **DP law:** DPDP Fourth Schedule exempts educational institutions from verifiable parental consent only for tracking/behavioural monitoring for educational activities or child safety `likely` [143].

## Part C — College add-on (FE / VET / TAFE / RTO / skills)

### UK / England (FE, sixth form, apprenticeships)
- **Regulators:** ESFA closed 31 Mar 2025, DfE collects the ILR `verified` [19]; **apprenticeships, adult skills and Skills England moved to DWP (Sept 2025)**; 16–19 and HE stay with DfE; IfATE abolished 1 Jun 2025 `verified` [22][21].
- **ILR:** entities Learner, LearningDelivery (+ Destination & Progression); **FundModel 11 Tailored Learning, 25 16–19, 36 Apprenticeships, 38 Adult Skills Fund, 81 Other Adult, 99 Non-funded** `verified` [15]. 2026-27 returns **R01 04-Sep-2026 … R14 21-Oct-2027**, 6pm cut-offs; funding year 1 Aug–31 Jul `verified` [16].
- **ULN:** 10 digits (1000000000–9999999999), "collected for all learners"; placeholder 9999999999 restricted after 1 Jan and never for levy apprentices; issued by LRS for 14+, linked to Personal Learning Record; MIS integration via LRS web services `verified` [17][18].
- **Attendance:** **no statutory FE attendance return or code set** (Children's Commissioner Sept 2026: ~42,000 severely absent 16–17s; DfE says FE monitoring is coming) `verified` [20]. **UKVI for FE colleges and independent schools = 10 consecutive missed expected contact points, report within 10 working days** (or 2 checkpoints/12 months) — the 85%/70% bands are HE-provider only `verified` [6].
- **Apprenticeships:** starts from 1 Aug 2025 use **published minimum off-the-job hours per standard (floor 187 h)**, min duration 8 months; pre-Aug-2025 starts keep 20% / 6 h per week; evidence must be quantifiable hours with dates `verified` [21].
- **Vetting:** KCSIE 2026 applies to FE/sixth-form colleges, 16–19 academies and Independent Training Providers (some "musts" not for ITPs); SCR required `verified` [2].
- **Grading:** T Level overall Distinction*/Distinction/Merit/Pass (core A*–E + specialism P/M/D) `likely` [23]; BTEC P/M/D/D*, EPA grades `unverified`.
- **Incumbent MIS:** ProSolution, Tribal ebs, UNIT-e, Civica (REMS) `likely` [24].

### Australia (VET / RTO / TAFE)
- **Standards for RTOs 2025:** keep completed assessments **2 years** after completion (was 6 months) `likely` [44]; keep AQF certification records **30 years** and be able to reissue `verified` [44].
- **USI:** Student Identifiers Act s53 — **no qualification/statement of attainment without a verified USI**; USI web services for single/bulk verify in the SMS `verified` [35].
- **AVETMISS Release 8.0** (since 1 Jan 2018; no 9.0 found) `verified` [45]; NAT00010/20/30/60/80/85/90/100/120/130 files `likely` [47]; government-funded activity quarterly via State Training Authorities; fee-for-service quarterly direct to NCVER (window 1–17 Aug 2026) `likely` [46]; per-state AVETMISS variants. Outcome IDs 30, 40, 41, 61, 70, 85, 90 `likely` [48] (20/51/60 etc. `unverified`).
- **Overseas VET students:** attendance monitoring only where ASQA imposes it (80%); course progress always `likely` [27].

### Singapore (training providers / PEIs)
- **SSG funding:** trainee-level 75% attendance rule **removed 1 Jan 2024** → course-level thresholds `likely` [53]; **Singpass e-attendance mandatory** for SSG-funded courses since Oct 2023 `likely` [56]; providers must run a **Training Management System** integrated with **TPGateway** `likely` [54]; attendance/assessment submitted within 120 days of course end (IBF guidance) `likely` [55].
- **Student's Pass at PEIs:** 90% attendance, EduTrust required [51].

### Malaysia (TVET / skills)
- **JPK** (Dept of Skills Development, Act 652): SKM levels 1–3, DKM level 4, DLKM level 5 on NOSS; national data system **MySPIKE** (not "MyTVET") `verified` [67].
- **HRD Corp:** provider registration via e-TRiS (RM1,000/yr); **Form T3 attendance mandatory**; claims within 6 months of training `verified` [68].
- International students at private colleges: EMGS 80% [64].

### Sri Lanka (TVET)
- **TVEC** (TVE Act No. 20 of 1990): **statutory registration of every institute and every course**, on-site evaluation `verified` [132][133]; **NVQ 7 levels** (L1–4 certificate, L5 diploma, L6 higher diploma, L7 degree-equivalent); routes CBT course or RPL `verified` [132]; National Skills Passport (nsp.gov.lk) linked `likely`. Registration-number format / annual return `unverified`.

### India (skills / ITI / polytechnic)
- **NSQF** revised 6 Jun 2023: levels 1–8 incl. half-levels (4.5); **1 credit = 30 notional hours, 40 credits/yr** `verified` [149].
- **PMKVY 4.0:** daily **Aadhaar biometric attendance (AEBAS)** for candidates, trainers and assessors via Skill India Digital Hub `verified` [150].
- **ITI:** trainee verification on **NCVT MIS** → PRN; no PRN = no exam; sessions start 1 Aug, named "CTS-2025" `likely` [151].

### UAE (training institutes)
- **Dubai:** KHDA Educational Services Permit for Training Institutes, **valid 1 year**, renew ≥30 days before expiry; courses approved separately `likely` [96]. **Abu Dhabi:** ACTVET licenses training centres (CEC Res. 152/2015) `likely` [97]. No attendance/data duty found.

### Saudi Arabia (TVTC)
- TVTC private training licence **5 years**, via NGDPT portal (Absher OTP); programme types: Diploma 2–3 yrs, Qualifying program 1–<2 yrs, Qualifying course >60 h, Development course ≤60 h; e-training needs NELC approval; certificates via **Manar** `verified` [107]. Violations incl. **record/result manipulation** (427 in Jan–Sep 2025) `likely` [108].

### Qatar (training centres)
- MoEHE licenses training centres; "Where Is My Center" lists 182 licensed centres (May 2026) `likely` [119].

## Part D — Cross-region reference

### Exam boards and sessions
- **Cambridge International:** June and November series; March series India-only (some syllabuses withdrawn from March from 2027) `likely` [155].
- **Pearson Edexcel International A Level:** January, May/June, October series `likely` [156].
- **IB DP:** May and November sessions; results from 6 Jul / 16 Dec; Diploma requires ≥24 points plus conditions `likely` [157][158].
- Board grading: IGCSE A*–G / 9–1, GCSE 9–1, A level A*–E, CBSE 9-point, SPM, LK O/L A/B/C/S/F — `unverified` this run.

### Data protection (one line each)
- **UK:** UK GDPR + DPA 2018, amended by DUAA 2025 (DP core in force 5 Feb 2026); regulator now the Information Commission `verified` [14].
- **AU:** Privacy Act 1988 + 2024 amendments; Children's Online Privacy Code due 10 Dec 2026 `verified` [49][50].
- **SG:** PDPA 2012 (PDPC) `likely` [62].
- **MY:** PDPA 2010 + 2024 amendments (DPO/breach from 1 Jun 2025) `verified` [66].
- **UAE:** PDPL 45/2021 — executive regulations not issued `likely` [95]; DIFC/ADGM separate `unverified`.
- **KSA:** PDPL (SDAIA) in force Sep 2023 `verified` [106].
- **QA:** Law No. 13 of 2016 `likely` [118].
- **LK:** PDPA No. 9 of 2022 — Parts I & III from 1 Jan 2027 `verified` [126].
- **IN:** DPDP Act 2023 + Rules 2025 — main duties from 13 May 2027 `verified` [142].

## Cross-dimension insights

- **Visa compliance is the one feature every region needs, and it is the same shape everywhere:** a per-student "sponsored" flag, a configurable threshold engine (percentage per month / per study period / consecutive-absence count / non-engagement days), an intervention log with "first contact" timestamp, and a regulator-specific report (UKVI SMS, PRISMS, ICA notice, EMGS renewal). Build it once as a rules engine [6][27][51][64].
- **"Independent" ≠ "unregulated" in England, but ≈ unregulated in Sri Lanka.** An English independent school must code attendance, keep an SCR and file SLASC [1][2][3]; a Colombo international school has no government return at all [121]. The LK pack's value is exam-board entries (Cambridge/Edexcel) and private-candidate registration, not statutory reporting.
- **Regulatory churn is concentrated in 2025–2027:** UK (DUAA, KCSIE 2026, UKVI Doc 2 Oct 2026, BCA tightening, DWP takeover), KSA (General Education Law Jan 2027), LK/IN (PDPA Jan 2027, DPDP May 2027), AU (Children's Code Dec 2026). Seed data should carry an `effective_from` date on every rule.
- **Remote/distance attendance is a real requirement in the GCC:** 2026 regional conflict moved Dubai/Sharjah April-start schools online; ADEK tracks absence during distance learning; England requires remote learners to be coded absent [84][85][1].
- **Audit integrity sells in KSA/IN:** TVTC's top violation is record/result manipulation [108]; India mandates biometric attendance for skills schemes [150]. Immutable attendance/grade audit trails are a differentiator, not a nice-to-have.

## Recommendations

1. **PRD — Compliance profile per tenant** (country, sub-jurisdiction, segment, regulator, effective dates). Seed: England-independent, Dubai-KHDA, Abu Dhabi-ADEK, Sharjah-SPEA, Northern-Emirates-MoE, KSA-MoE, Qatar-MoEHE, LK-company-registered, IN-CBSE, AU-NSW-CRICOS, SG-FSS, MY-PED. Confidence: high for UK/UAE-AD/AU, medium elsewhere.
2. **PRD — Attendance code sets as data:** ship the 34-code DfE set with statistical categories [1]; ADEK 13 authorised reasons [74]; generic Authorised/Unauthorised for Dubai/others; "remote present"/distance-learning flag. Hide penalty-notice/attendance-contract workflows for independent tenants [1]. Confidence: high.
3. **PRD — Visa monitoring engine** with presets: UKVI-HE engagement (60/30 days), UKVI-HE Band 1 (85/70%), UKVI non-HE (10 contact points), ESOS (80/70%, NOIR 20 working days, PRISMS 14/31 days), ICA (90% monthly / 7 days), EMGS (80% + CGPA 2.0). Confidence: high (UK/SG/MY), medium (AU clause numbers from provider policies).
4. **Seed data — Official IDs** as typed records with validators: UPN (mod-23), ULN, HESA SID, UCAS ID, USI, CRICOS, Emirates ID (masked display), Saudi NID/Iqama, QID, NIC (old/new), MyKad, NRIC/FIN, APAAR (with REFUSED/NOGEN status + consent document), PEN, Aadhaar. Confidence: medium (several formats `likely`).
5. **Seed data — Staff vetting checklists** per regulator: KCSIE 7 checks + s128 [2]; KHDA Appointment Notice + good conduct [78][79]; ADEK good conduct via PASS [80]; CBSE police verification + psychometric [140]; AU WWCC by state with expiry [41]; MY Permit Mengajar [70]; Qatar professional licence [115]; ETEC licence [105]. Each check stores evidence, date, expiry. Confidence: high (UK), medium (others).
6. **Seed data — Calendars:** England Sep–Jul 3 terms; LK international late Aug–early Jul 3 terms; UAE unified 31 Aug–2 Jul + Indian-curriculum Apr–Mar; KSA 2-semester (23 Aug); Qatar 30 Aug; AU Jan–Dec 4 terms; SG Jan–Nov 4 terms; MY Jan start; CBSE Apr–Mar; Kerala June; UAE HE 31 Aug; IN HE Jul/Aug odd semester; SLIIT Feb intake. Confidence: high for school calendars, medium for HE.
7. **Architecture — Return/export adapters** (later phase): SLASC XML, ILR XML, HESA Data Futures, TCSI, AVETMISS NAT (per-state), PRISMS, ADEK eSIS daily feed, UDISE+, AISHE, NAD-ABC credits, TPGateway, HRD Corp T3. Prioritise ADEK eSIS + UKVI + ESOS for the prototype; do not build HESA/ILR until a UK HE/FE customer exists. Confidence: medium.

## Open questions

- Is Noor mandatory for Saudi international schools' attendance/grades? Needs MoE KSA circular or a Saudi international-school customer.
- KHDA student data system/census name and frequency; Dubai good-conduct lookback (last country vs 5 years). Needs KHDA Technical Guide PDF (site blocked fetch).
- Qatar private-school attendance rules and SIS name beyond NSIS.
- AU WWCC official per-state issuers/validity (WA, TAS disputed); exact National Code clause text (legislation.gov.au blocked).
- UK: ULN/SCN collection in HESA; HESA Staff record; School Workforce Census scope; GCSE/A level/BTEC/EPA grade sets from Ofqual.
- AU/SG/MY university semester dates; SG/MY international school calendars; Tamil Nadu/Karnataka school start.
- UAE QFEmirates level count for VET (1–5 vs 1–8 vs 10); DIFC/ADGM DP regimes.
- LK TVEC registration-number format and any annual return; SG NRIC prefix/checksum algorithm.
- Route: a targeted Deepen run, or a drafted prompt for a deep-research tool with logged-in access to these blocked regulator sites.


## Source appendix

| # | Supports | Publisher | Pub date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | England attendance codes, register rules, independent-school applicability | [DfE – Working together to improve school attendance (Jul 2026)](https://assets.publishing.service.gov.uk/media/6a4f9ec6a6586e258d371bd0/Working_together_to_improve_school_attendance_2026.pdf) | 2026-07 | 2026-11-02 | high |
| [2] | KCSIE 2026 SCR checks; colleges/ITPs in scope | [DfE – Keeping children safe in education 2026](https://assets.publishing.service.gov.uk/media/6ac3c09c11ed58342ad8e4ac/Keeping_children_safe_in_education_2026.pdf) | 2026-09 | 2026-11-02 | high |
| [3] | SLASC independent schools census | [DfE – SLASC 2027 business & technical spec](https://assets.publishing.service.gov.uk/media/694a6e472f02611393508a1e/SLASC_2026_Independent_Schools_Business_and_Technical_Specification_v1.3.pdf) | 2026-07 | 2026-11-02 | high |
| [4] | UPN format; optional for independents | [DfE – UPN guide v1.2](https://assets.publishing.service.gov.uk/media/5cfa739a40f0b663fd865a6a/UPN_Guide_1.2.pdf) | 2019-06 | 2026-11-02 | high |
| [5] | England school MIS market share | [Tes](https://www.tes.com/magazine/news/general/ess-sims-loses-market-dominance-school-information-systems-mis) | 2026-01 | 2026-11-02 | medium |
| [6] | UKVI Student sponsor duties (engagement, contact points, deadlines, CAS, records) | [UKVI – Student Sponsor Guidance Doc 2 v10/2026](https://assets.publishing.service.gov.uk/media/6ac8b9a9ab368efeb4c9342e/Student_Sponsor_Guidance_Doc_2_Final.pdf) | 2026-10 | 2026-11-02 | high |
| [7] | UKVI Basic Compliance Assessment thresholds + RAG | [UKVI – Student sponsor compliance (Doc 3)](https://www.gov.uk/government/publications/student-sponsor-guidance/student-sponsor-compliance-accessible) | 2026-06 | 2026-11-02 | high |
| [8] | HESA in-year collection timeline | [Office for Students – AO letter](https://www.officeforstudents.org.uk/media/diglkzpq/ao-letter-in-year-student-data-collection-june-2026.pdf) | 2026-06 | 2026-11-02 | high |
| [9] | OfS data collections (HESES, F1) | [Office for Students](https://www.officeforstudents.org.uk/data-and-analysis/supplying-data/data-collection/) | n.d. | 2026-11-02 | high |
| [10] | HESA SID 17 chars replaces 13-char HUSID | [HESA (Jisc)](https://hesa.ac.uk/collection/c23072/a/sid) | n.d. | 2026-11-02 | medium |
| [11] | UCAS Personal ID collected as UCASPERID | [HESA (Jisc)](https://www.hesa.ac.uk/collection/student/datafutures/a/student_ucasperid) | n.d. | 2026-11-02 | medium |
| [12] | Tribal SITS >60% UK HE (vendor claim repeated) | [University of Warwick](https://warwick.ac.uk/services/academicoffice/sits/support/info) | n.d. | 2026-11-02 | low |
| [13] | UK HE VLE shares | [ListEdTech](https://listedtech.com/blog/the-uk-lms-market-is-changing) | 2024 | 2026-11-02 | medium |
| [14] | DUAA 2025 commencement; Information Commission | [DSIT (gov.uk)](https://www.gov.uk/guidance/data-use-and-access-act-2025-plans-for-commencement) | 2026-10 | 2026-11-02 | high |
| [15] | ILR entities, FundModel codes | [DfE – Submit learner data guidance](https://guidance.submit-learner-data.service.gov.uk/25-26/ilr/overview) | 2025 | 2026-11-02 | high |
| [16] | ILR 2026-27 R01–R14 timetable | [DfE – Submit learner data guidance](https://guidance.submit-learner-data.service.gov.uk/26-27/data-collection-timetable) | 2026 | 2026-11-02 | high |
| [17] | ULN ILR field rules | [DfE – Submit learner data guidance](https://guidance.submit-learner-data.service.gov.uk/25-26/ilr/entity/Learner/field/ULN) | 2025 | 2026-11-02 | high |
| [18] | ULN/LRS/PLR for 14+ | [DfE – LRS user guide](https://www.gov.uk/government/publications/learner-registration-bodies-user-guide/using-the-learning-records-service-lrs-for-learning-providers-and-local-authorities) | 2024-05 | 2026-11-02 | high |
| [19] | ESFA closed; DfE collects ILR | [DfE](https://www.gov.uk/government/publications/advice-individualised-learner-record-ilr-returns/advice-individualised-learner-record-ilr-funding-returns-2025-to-2026) | 2025 | 2026-11-02 | high |
| [20] | FE colleges no duty to report attendance to DfE | [Children's Commissioner for England](https://www.childrenscommissioner.gov.uk/?p=39441) | 2026-09 | 2026-11-02 | high |
| [21] | Apprenticeship off-the-job minimum hours | [DfE/DWP](https://www.gov.uk/government/publications/apprenticeships-off-the-job-training/apprenticeship-off-the-job-training-guidance--2) | 2026-08 | 2026-11-02 | high |
| [22] | Apprenticeships/adult skills/Skills England to DWP | [FE Week](https://feweek.co.uk/confirmed-skills-england-moves-to-dwp-from-today/) | 2025-09 | 2026-11-02 | medium |
| [23] | T Level grade calculation | [DfE T Level support](https://support.tlevels.gov.uk/hc/en-gb/articles/6433328028690-How-grades-are-calculated) | n.d. | 2026-11-02 | medium |
| [24] | FE MIS incumbents named | [DfE help-centre forum](https://customerhelp.education.gov.uk/hc/en-gb/community/posts/26232750083090-MI-Systems-for-Study-Programmes) | n.d. | 2026-11-02 | low |
| [25] | UK degree classification bands | [Nottingham Trent University](https://www.ntu.ac.uk/about-us/teaching/academic-development-and-quality/quality-management/quality-handbook/section-3-undergraduate-awards-requirements) | n.d. | 2026-11-02 | medium |
| [26] | Medr regulatory framework (Wales) | [Medr](https://www.medr.cymru/regulatory-framework) | 2026 | 2026-11-02 | medium |
| [27] | National Code Std 8: attendance only school/ELICOS/Foundation; VET if ASQA requires | [Dept of Education (AU) – Standard 8 factsheet](https://internationaleducation.gov.au/regulatory-information/Documents/National%20Code%202018%20Factsheets/Standard%208.pdf) | n.d. | 2026-11-02 | medium |
| [28] | Clause 8.6 attendance policy scope | [Navitas English](https://navitasenglish.edu.au/wp-content/uploads/policy-procedure-student-attendance-nes-9.01.pdf) | n.d. | 2026-11-02 | medium |
| [29] | HE not attendance-monitored | [University of Canberra](https://policies.canberra.edu.au/document/view-current.php?id=12) | n.d. | 2026-11-02 | medium |
| [30] | 80%/70%, NOIR, 20 working days, PRISMS (schools) | [Meriden School (NSW CRICOS)](https://www.meriden.nsw.edu.au/wp-content/uploads/2023/11/Monitoring-Course-Attendance-Policy_November-2023.pdf) | 2023-11 | 2026-11-02 | medium |
| [31] | NOIR + 20 working days + PRISMS (HE/ELICOS) | [Macquarie University](https://policies.mq.edu.au/document/view.php?id=57) | n.d. | 2026-11-02 | medium |
| [32] | ESOS s19 reporting 14 days (<18) / 31 days (18+) | [ASQA – ESOS obligations checklist 2025](https://asqa.gov.au/sites/default/files/2025-02/ESOS_Obligations_checklist_2025.pdf) | 2025-02 | 2026-11-02 | high |
| [33] | TCSI event-based reporting, 7-day corrections | [Dept of Education – TCSI Support](https://www.tcsisupport.gov.au/reporting/hestudent/requirements) | 2026 | 2026-11-02 | medium |
| [34] | USI required for HE awards/Commonwealth assistance; CHESSN phase-out | [Dept of Education (AU)](https://www.education.gov.au/node/12866) | 2021 | 2026-11-02 | medium |
| [35] | USI s53 gate on VET certificates | [USI Registrar](https://www.usi.gov.au/about-us/newsroom/vet-sector-compliance-obligations-under-student-identifiers-act) | n.d. | 2026-11-02 | high |
| [36] | USI = 10 characters | [Dept of Education – TCSI element 584](https://www.tcsisupport.gov.au/element/584) | n.d. | 2026-11-02 | high |
| [37] | CRICOS code format examples | [Study Melbourne / Vic Dept of Education](https://www.study.vic.gov.au/jp/international-student-program/applications-and-departure) | n.d. | 2026-11-02 | medium |
| [38] | 2026 National Planning Level 295,000 | [IEAA](https://www.ieaa.org.au/IEAA/News/2025/Australian-Government-2026-National-Planning-Level.aspx) | 2025 | 2026-11-02 | high |
| [39] | Non-government Schools Census 2026 | [Dept of Education (AU)](https://content.educationhub.gov.au/system/files/2026-07/2026%20Non-government%20schools%20census%20guide%20v.1.pdf) | 2026-07 | 2026-11-02 | medium |
| [40] | ACARA national attendance standards (Y1–10) | [ACARA](https://acara.edu.au/reporting/national-standards-for-student-attendance-data-reporting) | 2020-07 | 2026-11-02 | high |
| [41] | WWCC validity by state | [Upcover (secondary)](https://www.upcover.com/blog/where-to-get-your-working-with-children-check-in-australia) | n.d. | 2026-11-02 | low |
| [42] | NSW 2027 term dates | [NSW Department of Education](https://education.nsw.gov.au/schooling/calendars/future-and-past-nsw-term-and-vacation-dates) | n.d. | 2026-11-02 | high |
| [43] | QUT 7-point grade scale | [QUT Manual of Policies and Procedures](https://www.mopp.qut.edu.au/C/C_05_02.jsp) | n.d. | 2026-11-02 | high |
| [44] | RTO Standards 2025 retention: assessments 2 yrs, AQF records 30 yrs | [ASQA practice guide](https://www.asqa.gov.au/for-providers/standards-for-RTOs/practice-guides/compliance-standards-for-rtos/integrity-of-nationally-recognised-training-practice-guide) | 2026-10 | 2026-11-02 | medium |
| [45] | AVETMISS Release 8.0 effective 1 Jan 2018 | [NCVER](https://ncver.edu.au/__data/assets/pdf_file/0031/2252479/Data-Support-Bulletin-March-2018.pdf) | 2018-03 | 2026-11-02 | high |
| [46] | AVETMISS quarterly reporting; FFS window Aug 2026 | [NCVER – Data Support Bulletin](https://ncver.edu.au/__data/assets/pdf_file/0027/9706041/Data_Support_Bulletin_June_2026.pdf) | 2026-06 | 2026-11-02 | medium |
| [47] | AVETMISS NAT file set | [Wisenet (ReadyTech)](https://learn.wisenet.co/nat-file-guidelines/) | n.d. | 2026-11-02 | medium |
| [48] | AVETMISS outcome identifiers | [NCVER](https://www.ncver.edu.au/__data/assets/pdf_file/0029/3371177/Reporting-a-final-outcome.pdf) | n.d. | 2026-11-02 | medium |
| [49] | Privacy Act amendments 2024; tort Jun 2025 | [MinterEllison](https://www.minterellison.com/articles/privacy-and-other-legislation-amendment-act-2024-now-in-effect) | 2025 | 2026-11-02 | high |
| [50] | Children's Online Privacy Code draft, due 10 Dec 2026 | [OAIC](https://www.oaic.gov.au/engage-with-us/consultations/draft-childrens-online-privacy-code-consultation-for-industry,-civil-society,-academia) | 2026-03 | 2026-11-02 | high |
| [51] | SG Student's Pass: 90% monthly, 7 consecutive days | [ICA – eForm V36A](https://www.ica.gov.sg/docs/default-source/ica/forms/form-v36a_application-for-stp_info-on-school.pdf) | n.d. | 2026-11-02 | high |
| [52] | SG FSS must be EduTrust-certified for Student's Pass | [ICA](https://www.ica.gov.sg/reside/STP/apply/fss) | 2026-10 | 2026-11-02 | high |
| [53] | SSG removed trainee 75% rule from 1 Jan 2024 | [SkillsFuture Singapore](https://www.skillsfuture.gov.sg/docs/default-source/resources/terms-conditions/ssg-circular_rpd_2023_2_compliance-with-guidelines-on-the-reviewed-policies_29092023_final_clean.pdf) | 2023-09 | 2026-11-02 | medium |
| [54] | SSG TMS requirement for training providers | [SkillsFuture Singapore](https://www.skillsfuture.gov.sg/docs/default-source/resources/terms-conditions/ssg-circular_mipd_2020_2---digitalisation-of-tae-sector---tms-requirement-(13-jul-2020).pdf) | 2020-07 | 2026-11-02 | medium |
| [55] | TPGateway attendance/assessment within 120 days | [Institute of Banking & Finance](https://www.ibf.org.sg/home/claim-submission/for-training-providers) | 2024 | 2026-11-02 | medium |
| [56] | Singpass e-attendance mandatory Oct 2023 | [Institute of Banking & Finance](https://www.ibf.org.sg/docs/default-source/tpg-document/faq/FAQs-on-Singpass-e-attendance-for-TPs_20230831.pdf) | 2023-08 | 2026-11-02 | medium |
| [57] | MOE private school teacher registration | [MOE Singapore](https://moe.gov.sg/private-education/register-school) | 2026-01 | 2026-11-02 | high |
| [58] | M-series FIN from 2022 | [ICA](https://ica.gov.sg/news-and-publications/newsroom/media-release/new-m-fin-series-to-be-introduced-from-1-january-2022) | 2021 | 2026-11-02 | medium |
| [59] | NUS honours GPA bands | [NUS Registrar](https://www.nus.edu.sg/registrar/docs/info/administrative-policies-procedures/transcript-information-grade-legend.pdf) | 2026-06 | 2026-11-02 | medium |
| [60] | MOE 2027 school terms | [MOE Singapore](https://www.moe.gov.sg/news/press-releases/20260714-school-terms-and-holidays-for-2027) | 2026-07 | 2026-11-02 | medium |
| [61] | PEI record-keeping incl. NRIC/FIN, attendance | [AGC – Private Education Regulations 2009](https://sso.agc.gov.sg/SL/PEA2009-S617-2009) | 2009 | 2026-11-02 | medium |
| [62] | PDPC children's data advisory guidelines | [PDPC](https://www.pdpc.gov.sg/organisations/regulations-decisions/regulatory-guidance/advisory-guidelines-on-the-pdpa-for-childrens-personal-data-in-the-digital-environment) | 2024-03 | 2026-11-02 | medium |
| [63] | MY school Student Pass via Immigration IMM.14 + MOHA letter | [Jabatan Imigresen Malaysia](https://www.imi.gov.my/index.php/en/main-services/pass/long-term-social-visit-pass/student-pass/) | n.d. | 2026-11-02 | high |
| [64] | EMGS renewal: 80% attendance, CGPA 2.0 | [EMGS](https://educationmalaysia.gov.my/visa-renewal-for-existing-student/) | n.d. | 2026-11-02 | high |
| [65] | MY national schools back to January (2026) | [Malay Mail](https://www.malaymail.com/news/malaysia/2025/10/28/moe-malaysias-2026-school-year-returns-to-january-full-calendar-now-available-online/196316) | 2025-10 | 2026-11-02 | high |
| [66] | MY PDPA amendment phases (DPO/breach 1 Jun 2025) | [Skrine](https://www.skrine.com/insights/alerts/december-2024/amendments-to-the-personal-data-protection-act-201) | 2024-12 | 2026-11-02 | high |
| [67] | JPK SKM/DKM/DLKM levels; MySPIKE | [Jabatan Pembangunan Kemahiran](https://www.dsd.gov.my/images/04-sumber/statistik/pencapaian/2025/LAPORAN%20STATISTIK%20PENCAPAIAN%20JPK%20OGOS%202025.pdf) | 2025-08 | 2026-11-02 | high |
| [68] | HRD Corp claims: T3 attendance, 6 months | [HRD Corp](https://supportcentre.hrdcorp.gov.my/portal/en/kb/articles/claim) | 2023-11 | 2026-11-02 | high |
| [69] | MY Child Register screening voluntary | [Malay Mail](https://www.malaymail.com/news/malaysia/2017/11/02/child-registry-use-cant-be-forced-says-rohani/1500571) | 2017-11 | 2026-11-02 | medium |
| [70] | Permit Mengajar incl. international schools, 5 yrs | [JPN Selangor form](https://pulami.upsi.edu.my/wp-content/uploads/2023/09/JPN-SELANGOR-BORANG-PERMIT.pdf) | 2023-09 | 2026-11-02 | medium |
| [71] | UM CGPA ≥3.70 top class | [Universiti Malaya](https://ebook.um.edu.my/fbe/BEc_Handbook_2024_2025/files/basic-html/page71.html) | 2024 | 2026-11-02 | medium |
| [72] | MyKad YYMMDD-PB-###G | [eCentral (secondary)](https://ecentral.my/no-ic-ikut-negeri/) | n.d. | 2026-11-02 | low |
| [73] | Monash Malaysia 80% attendance | [Monash University Malaysia](https://www.monash.edu.my/student-services/international-students/attendance-requirement) | n.d. | 2026-11-02 | medium |
| [74] | ADEK eSIS mandatory; daily attendance; 13 absence reasons; thresholds | [ADEK – Student Administrative Affairs Policy v1.1](https://reptonabudhabi.org/wp-content/uploads/sites/16/2024/10/ADEK_S_Student_Administrative_Affairs_Policy.pdf) | 2024-09 | 2026-11-02 | high |
| [75] | SPEA regulates Sharjah private schools | [SPEA](https://spea.shj.ae/en/about-spea/who-we-are/) | n.d. | 2026-11-02 | medium |
| [76] | MoE licenses private schools (federal) | [UAE Government portal](https://u.ae/en/information-and-services/education/licensing-private-educational-institutes) | n.d. | 2026-11-02 | high |
| [77] | RAK co-regulator | [Gulf Business](https://gulfbusiness.com/en/2026/education/live-updates-will-khda-other-uae-bodies-reopen-schools-soon/) | 2026 | 2026-11-02 | low |
| [78] | KHDA Appointment Notice (Sep 2025) | [Dubai Media Office](https://www.mediaoffice.ae/en/news/2025/september/10-09/khda-issues-new-private-education-guideline) | 2025-09 | 2026-11-02 | high |
| [79] | KHDA faculty registration: attested good conduct certificate | [KHDA](https://web.khda.gov.ae/en/Services/School-Permit-Services/Requesting-Faculty-Registration) | 2026 | 2026-11-02 | medium |
| [80] | ADEK good conduct certificate; licensing portal | [Gulf News](https://gulfnews.com/uae/education/abu-dhabi-mandates-criminal-record-checks-for-private-school-teachers-1.500238169) | 2025-08 | 2026-11-02 | medium |
| [81] | ADEK PASS staff portal | [ADEK](https://pass.adek.gov.ae/) | n.d. | 2026-11-02 | medium |
| [82] | Dubai good conduct: countries worked in past 5 years (2018) | [The National](https://www.thenationalnews.com/uae/dubai-s-education-regulator-to-step-up-background-checks-on-teachers-1.773189) | 2018-09 | 2026-11-02 | low |
| [83] | UAE unified 2026-27 school calendar | [UAE Ministry of Education](https://moe.gov.ae/en/mediacenter/news/Pages/MOE-announces-the-academic-calendar-for-the-next-3-years.aspx) | 2026 | 2026-11-02 | high |
| [84] | Dubai April-start (Indian) schools began 6 Apr 2026 | [Gulf News](https://gulfnews.com/uae/education/dubais-khda-confirms-distance-learning-for-indian-schools-till-term-end-1.500464445) | 2026-04 | 2026-11-02 | medium |
| [85] | Sharjah Indian/Pakistani schools start moved to 30 Mar 2026 | [Gulf News](https://gulfnews.com/uae/sharjah-postpones-2026-27-academic-year-start-for-indian-pakistani-schools-amid-iranian-aggression-1.500464499) | 2026-03 | 2026-11-02 | medium |
| [86] | Unified calendar excludes Indian/Pakistani/Bangladeshi curricula | [Khaleej Times](https://www.khaleejtimes.com/uae/education/uae-announces-public-private-school-academic-calendar-for-next-three-years) | 2026 | 2026-11-02 | medium |
| [87] | Dubai attendance: authorised/unauthorised; DSIB bands | [Khaleej Times](https://www.khaleejtimes.com/uae/schools-and-parents/dubai-school-attendance-khda-rules-policies) | 2026 | 2026-11-02 | medium |
| [88] | UAE teacher licence required | [UAE Government portal](https://u.ae/en/information-and-services/education/school-education-k-12/qualifications-to-be-a-teacher) | n.d. | 2026-11-02 | medium |
| [89] | MoHESR HEDB; CAA-accredited HEIs must submit | [MoHESR](https://hedb.mohesr.gov.ae/) | n.d. | 2026-11-02 | high |
| [90] | MoHESR real-time integration with 54 HEIs | [MoHESR](https://www.mohesr.gov.ae/En/MediaCenter/News/Pages/MoHESR-completes-electronic-data-integration-with-54-UAE-higher-education-.aspx) | 2026-01 | 2026-11-02 | high |
| [91] | KHDA free-zone HE / UQAIB | [KHDA](https://web.khda.gov.ae/en/Guides/Education-Providers/Responsibilities/Quality-Assurance) | n.d. | 2026-11-02 | medium |
| [92] | UAE HE calendar 2026-29 | [MoHESR](https://www.mohesr.gov.ae/En/MediaCenter/News/Pages/MoHESR-announces-the-academic-calendar-for-higher-education-institutions-for-the-next-three-years.aspx) | 2026-02 | 2026-11-02 | high |
| [93] | Emirates ID 784-YYYY-NNNNNNN-C pattern | [UAE Government Design System](https://designsystem.gov.ae/docs/patterns/emirates-id-input) | n.d. | 2026-11-02 | medium |
| [94] | Emirates ID YYYY not reliably birth year | [Khaleej Times](https://khaleejtimes.com/uae/what-does-your-emirates-id-number-really-mean?amp=1) | n.d. | 2026-11-02 | medium |
| [95] | UAE PDPL executive regulations not issued | [BusinessDubai](https://www.businessdubai.ae/blogs/uae-pdpl-data-protection) | 2026-08 | 2026-11-02 | low |
| [96] | KHDA training-institute permit 1 yr | [KHDA](https://web.khda.gov.ae/en/Services/Training-Institute-Permit-Services/Issuing-an-Educational-Services-Permit-for-a-Train) | n.d. | 2026-11-02 | medium |
| [97] | ACTVET licensing of Abu Dhabi training centres | [Al Tamimi & Co](https://turtl.tamimi.com/story/law-update-education-in-mena-2022/page/6) | 2022 | 2026-11-02 | medium |
| [98] | UAE university visa tied to enrolment | [British University in Dubai](https://www.buid.ac.ae/wp-content/uploads/Documents/BUiD-Policy-on-Student-Visa-Sponsorship.pdf) | n.d. | 2026-11-02 | medium |
| [99] | Saudi General Education Law M/36 (repeals Foreign Schools Reg.) | [Al Tamimi & Co](https://www.tamimi.com/news/opening-a-school-in-saudi-arabia-what-the-new-education-law-means-for-international-educators/) | 2026 | 2026-11-02 | high |
| [100] | Noor scope: institutions affiliated with MoE | [Saudi Ministry of Education](https://www.moe.gov.sa/ar/aboutus/Portal/Application/Pages/Noor.aspx) | n.d. | 2026-11-02 | high |
| [101] | Saudi public schools back to two semesters 2025-26 | [Gulf News](https://gulfnews.com/world/gulf/saudi/saudi-arabia-returns-to-two-semester-school-year-unveils-four-year-academic-roadmap-1.500223782) | 2025 | 2026-11-02 | high |
| [102] | Saudi universities/private schools choose term model | [Education Middle East](https://educationmiddleeast.com/?p=11525) | 2025-08 | 2026-11-02 | high |
| [103] | KSU 2026-27 starts 30 Aug 2026 | [King Saud University](https://ksu.edu.sa/en/academic-calendar) | n.d. | 2026-11-02 | medium |
| [104] | Saudi ID: 10 digits, 1=citizen 2=resident, check digit | [Saudi Central Bank (SAMA) Rulebook](https://rulebook.sama.gov.sa/en/entiresection/2324) | n.d. | 2026-11-02 | medium |
| [105] | ETEC teacher licence covers private/international | [Okaz](https://www.okaz.com.sa/ampArticle/2051613) | 2021 | 2026-11-02 | medium |
| [106] | Saudi PDPL in force 14 Sep 2023 | [Clyde & Co](https://www.clydeco.com/en/insights/2024/09/saudi-arabia-s-personal-data-protection-law-become) | 2024-09 | 2026-11-02 | high |
| [107] | TVTC private training licence 5 yrs; programme types | [TVTC](https://tvtc.gov.sa/en/ContactUS/FAQs/Pages/default.aspx) | n.d. | 2026-11-02 | high |
| [108] | TVTC violations incl. record manipulation | [TVTC](https://tvtc.gov.sa/En/MediaCenter/News/Pages/288mok.aspx) | 2025 | 2026-11-02 | medium |
| [109] | KSU 5-point GPA | [Simon Fraser University](https://www.sfu.ca/content/sfu/gradstudies/faculty-staff/knowledge-base/admissions/international-reqs-docs/saudi-arabia.html) | n.d. | 2026-11-02 | medium |
| [110] | NQF-KSA 8 levels | [ETEC (via KFU)](https://www.kfu.edu.sa/ar/Deans/QA/Documents/qms/NQF-2023%20English.pdf) | 2023 | 2026-11-02 | medium |
| [111] | Noor used for private/international Grade 1 registration | [Sayidaty](https://www.sayidaty.net/node/1635771) | 2023 | 2026-11-02 | medium |
| [112] | Qatar MoEHE private school admission guide; e-enrolment platform | [Qatar News Agency](https://qna.org.qa/en/News-Area/News/2026-4/12/moehe-launches-second-edition-of-guide-for-regulating-admission-registration-of-students-in-private-schools) | 2026-04 | 2026-11-02 | high |
| [113] | Qatar NSIS for private-school certificates | [Qatar Tribune](https://www.qatar-tribune.com/article/4624/TopNews/Private-school-students-scores-certificates-can-soon-be-checked-online-in-Qatar) | n.d. | 2026-11-02 | low |
| [114] | Qatar Hadori palm attendance (government schools) | [Qatar Tribune](https://www.qatar-tribune.com/article/251607/front/moehe-rolls-out-palm-based-hadori-attendance-system-for-students) | 2026-09 | 2026-11-02 | medium |
| [115] | Qatar professional licensing 2026 window | [The Peninsula](https://www.thepeninsulaqatar.com/article/06/09/2026/professional-licensing-applications-open-for-teachers-and-school-leaders) | 2026-09 | 2026-11-02 | high |
| [116] | Qatar 3-year school calendar 2025-28 | [Qatar News Agency](https://qna.org.qa/en/News-Area/News/2025-7/8/moehe-approves-new-academic-calendar-for-20252028) | 2025-07 | 2026-11-02 | high |
| [117] | QID 11 digits | [Doha Guides (secondary)](https://www.dohaguides.com/qatar-id-number/) | n.d. | 2026-11-02 | low |
| [118] | Qatar Law 13/2016 | [DLA Piper](https://www.dlapiperdataprotection.com/guide.pdf?c=QA) | n.d. | 2026-11-02 | medium |
| [119] | Qatar 182 licensed training centres | [The Peninsula](https://www.thepeninsulaqatar.com/article/28/05/2026/new-digital-platform-helps-public-locate-182-licensed-education-and-training-centres-in-qatar) | 2026-05 | 2026-11-02 | medium |
| [120] | Qatar enhanced licensing private schools 2025 | [Qatar News Agency](https://qna.org.qa/en/News-Area/News/2025-10/12/moehe-launches-enhanced-licensing-system-for-private-schools-kindergartens) | 2025-10 | 2026-11-02 | medium |
| [121] | LK international schools outside MoE; no census | [National Education Commission (LK)](https://nec.gov.lk/wp-content/uploads/2025/05/RP_2024_Quality-Assurance-FW-and-Mechanism-for-International-Other-Private-Schools-Registered-1.pdf) | 2024 | 2026-11-02 | high |
| [122] | CIS 2026-27 term dates | [Colombo International School](https://www.cis.lk/admissions#year) | n.d. | 2026-11-02 | high |
| [123] | BSC 2026-27 term dates | [The British School in Colombo](https://www.britishschool.lk/admissions/term-dates) | n.d. | 2026-11-02 | high |
| [124] | EMS 2026-27 term dates | [Elizabeth Moir School](https://elizabethmoirschool.com/calendar/) | n.d. | 2026-11-02 | high |
| [125] | LK government schools 2026 start 5 Jan | [NewsFirst](https://newsfirst.lk/2025/12/23/school-holidays-extended-new-term-starts-january-5) | 2025-12 | 2026-11-02 | high |
| [126] | LK PDPA Parts I & III from 1 Jan 2027 | [Daily FT](https://www.ft.lk/front-page/Data-protection-compliance-regime-takes-effect-on-1-Jan-2027/44-795776) | 2026-07 | 2026-11-02 | high |
| [127] | LK police clearance proposal (state sector) | [AsiaNews](https://www.asianews.it/news-en/Sri-Lanka-to-use-fingerprinting-in-public-employment-to-combat-child-abuse-64919.html) | 2026-02 | 2026-11-02 | medium |
| [128] | LK 12-digit NIC from 2016 | [Hiru News](https://hirunews.lk/english/120001/12-digit-new-national-identity-card-nic-from-1st-january) | 2015 | 2026-11-02 | high |
| [129] | SLQF 12 levels | [UGC Sri Lanka](https://eugc.ugc.ac.lk/qac/slqf.html) | 2016 | 2026-11-02 | medium |
| [130] | LK First Class ≥3.70, Second Upper 3.30 | [University of Peradeniya](https://cdce.pdn.ac.lk/Ba.php) | n.d. | 2026-11-02 | high |
| [131] | SLIIT February main intake | [Ada Derana Biz](https://bizenglish.adaderana.lk/elevate-your-education-journey-with-sliit-as-the-2026-main-intake-opens-for-registrations) | 2025-12 | 2026-11-02 | medium |
| [132] | TVEC statutory registration; NVQ 7 levels | [TVEC](https://www.tvec.gov.lk/) | n.d. | 2026-11-02 | high |
| [133] | TVEC institute registration service | [TVEC](https://tvec.gov.lk/institute-registration/) | n.d. | 2026-11-02 | high |
| [134] | ~393 LK international schools registered as companies | [The Morning](https://www.themorning.lk/gl-moots-laws-to-regulate-international-schools/) | 2021-04 | 2026-11-02 | medium |
| [135] | UDISE+ 2024-25 reference 31 Mar; covers private unaided | [MoE India – UDISE+](https://dashboard.udiseplus.gov.in/report2026/static/media/UDISE+2024_25_Booklet_existing.118ba29d4773e6372f72.pdf) | 2025 | 2026-11-02 | high |
| [136] | CBSE session 1 Apr–31 Mar | [CBSE – Circular Aff-07/2023](https://saras.cbse.gov.in/saras/Circulars/Circular07_2023.pdf) | 2023-03 | 2026-11-02 | high |
| [137] | APAAR mandatory field for CBSE 2026-27 registration/LOC | [Careers360](https://news.careers360.com/cbse-board-exams-apaar-id-class-9-11-loc-registration-2026-27-two-level-10-maths-social-science-2028) | 2026-02 | 2026-11-02 | medium |
| [138] | CBSE APAAR refused/NOGEN values | [Careers360](https://news.careers360.com/cbse-board-exams-2026-schools-submit-loc-without-apaar-id-rule-relaxed-over-lack-of-parental-consent-wrong-data-technical-issues) | 2025-09 | 2026-11-02 | medium |
| [139] | CBSE overseas schools exempt from APAAR | [Gulf News](https://gulfnews.com/uae/big-cbse-announcement-for-indian-expat-students-in-uae-on-apaar-aadhaar-1.500248160) | 2025 | 2026-11-02 | medium |
| [140] | CBSE police verification + psychometric for all staff | [Outlook India](https://www.outlookindia.com/national/cctv-installation-police-verification-psychometric-evaluation-cbse-issues-new-gu-news-301718) | 2017-09 | 2026-11-02 | high |
| [141] | APAAR 12-digit, via UDISE+, parental consent | [MoE India – APAAR portal](https://apaar.education.gov.in/) | n.d. | 2026-11-02 | medium |
| [142] | DPDP Rules 2025 phased dates | [Hogan Lovells](https://www.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-) | 2025-11 | 2026-11-02 | high |
| [143] | DPDP Fourth Schedule education exemption | [Storyboard18](https://www.storyboard18.com/digital/dpdp-rules-carve-out-key-exemptions-for-healthcare-providers-schools-and-childcare-services-processing-childrens-data-84208.htm) | 2025-11 | 2026-11-02 | medium |
| [144] | AISHE annual, MoE DoHE, 30 Sep reference | [MoHRD presentation (MoSPI)](https://mospi.gov.in/sites/default/files/cocsso/Presentation/Min.%20Of%20Human%20Resource%20Development.pdf) | n.d. | 2026-11-02 | medium |
| [145] | UGC: HEIs upload credits to NAD-ABC by APAAR | [Careers360](https://news.careers360.com/ugc-asks-institutions-upload-academic-credit-data-abc-portal-for-2024-june-2025-ease-apaar-roll-out) | 2025 | 2026-11-02 | medium |
| [146] | VBSA Bill (HECI successor) at JPC | [Careers360](https://news.careers360.com/viksit-bharat-shiksha-adhishthan-vbsa-bill-2025-sent-31-member-jpc-dharmendra-pradhan-heci-ugc-state-universities-nirf-ranking) | 2025-12 | 2026-11-02 | medium |
| [147] | UGC CBCS 10-point grades | [University of Delhi](https://dr.du.ac.in/files/Academics/psychology/B.A.%20programme.pdf) | n.d. | 2026-11-02 | high |
| [148] | Samarth eGov ERP | [Samarth (MoE)](https://samarth.edu.in/about/) | n.d. | 2026-11-02 | medium |
| [149] | NSQF revised 2023; 30 h per credit; level 4.5 | [NCVET](https://ncvet.gov.in/wp-content/uploads/2023/10/MoM-of-32nd-NSQC-meeting.pdf) | 2023-10 | 2026-11-02 | high |
| [150] | PMKVY 4.0 AEBAS biometric attendance | [NIELIT](https://www.nielit.gov.in/aurangabad/node/21795) | n.d. | 2026-11-02 | high |
| [151] | ITI NCVT MIS trainee verification → PRN | [DGT](https://dgt.gov.in/sites/default/files/2026-01/Revised-Trainee-Verification-Schedule-for-CTS-2025-withannexures_0.pdf) | 2026-01 | 2026-11-02 | medium |
| [152] | Kerala schools reopen 1 Jun 2026 | [Onmanorama](https://www.onmanorama.com/kerala/top-news/2026/05/22/kerala-schools-to-reopen-on-june-1-cm-satheesan-to-inaugurate-state-level-celebration.html) | 2026-05 | 2026-11-02 | high |
| [153] | Indian university odd semester Jul/Aug start (example) | [IFHE Hyderabad](https://www.ifheindia.org/assets/pdf/academicCalendar/UG-Common-Academic-Calendar-2026-27.pdf) | 2026 | 2026-11-02 | medium |
| [154] | PEN 11 digits vs UDISE school code 11 digits | [Education for All in India (blog)](https://educationforallinindia.com/udise-2026-27-answers-to-the-questions-parents-teachers-and-school-heads-are-actually-asking/) | 2026 | 2026-11-02 | low |
| [155] | Cambridge March series India-only | [Cambridge International](https://www.cambridgeinternational.org/Images/183437-key-dates-for-march-series.pdf) | 2025 | 2026-11-02 | medium |
| [156] | Pearson IAL Jan / May-Jun / Oct series | [Pearson](https://qualifications.pearson.com/en/qualifications/edexcel-international-advanced-levels/about.html) | n.d. | 2026-11-02 | medium |
| [157] | IB May & November sessions; results dates | [IBO](https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/getting-results/) | 2026 | 2026-11-02 | medium |
| [158] | IB DP pass ≥24 points + conditions | [IBO](https://ibo.org/about-the-ib/what-it-means-to-be-an-ib-student/recognizing-student-achievement/about-assessment/dp-passing-criteria/) | n.d. | 2026-11-02 | medium |
| [159] | England term dates set by LA/governing body (example) | [Bristol City Council](https://www.bristol.gov.uk/residents/schools-learning-and-early-years/school-term-and-holiday-dates) | n.d. | 2026-11-02 | medium |
| [160] | ESOS s19 measured from CoE start date (provider) | [ICMS](https://policies.icms.edu.au/non-commencement-of-study-procedures/) | n.d. | 2026-11-02 | medium |

## Staleness map

Windows (months) per claim class, from the domain pack (regulatory status: re-verify on every use): regulatory 6, dp-law 6, attendance 12, vetting 12, data-return 12, calendar 12, incumbent 18, identifier 36, grading 36. Computed with `recon_kit.py staleness` over the memlog claim ledger.

**Already past re-check date (34 claims)** — mostly older official documents still in force; re-confirm before relying on them:

- [140] CBSE police verification + psychometric for all staff (2017) — class vetting, published 2017-09, re-check was due 2018-09-01
- [128] LK NIC 12 digits from 2016 — class identifier, published 2015-12, re-check was due 2018-12-01
- [45] AVETMISS Release 8.0 current — class data-return, published 2018-03, re-check was due 2019-03-01
- [4] UPN 13 chars mod-23 check letter; optional for independent schools — class identifier, published 2019-06, re-check was due 2022-06-01
- [136] CBSE session 1 Apr - 31 Mar — class calendar, published 2023-03, re-check was due 2024-03-01
- [53] SSG removed trainee 75% rule 1 Jan 2024 (official excerpt only) — class attendance, published 2023-09, re-check was due 2024-09-01
- [34] USI required for HE Commonwealth assistance and graduation (official excerpt only) — class identifier, published 2021-10, re-check was due 2024-10-01
- [30] AU schools: 80% threshold, 70% discretion, NOIR + 20 working days then PRISMS — class attendance, published 2023-11, re-check was due 2024-11-01
- [68] HRD Corp Form T3 attendance; claims within 6 months — class attendance, published 2023-11, re-check was due 2024-11-01
- [144] AISHE annual by MoE DoHE, 30 Sep reference — class data-return, published 2024-01, re-check was due 2025-01-01
- [106] Saudi PDPL in force 14 Sep 2023 — class dp-law, published 2024-09, re-check was due 2025-03-01
- [66] MY PDPA DPO/breach notification from 1 Jun 2025 — class dp-law, published 2024-12, re-check was due 2025-06-01
- [121] LK MoE has no authority over international schools; no census — class regulatory, published 2024-12, re-check was due 2025-06-01
- [63] MY school Student Pass via Immigration IMM.14 + MOHA letter, not EMGS — class regulatory, published 2025-01, re-check was due 2025-07-01
- [75] Sharjah SPEA regulates private schools (official snippet only) — class regulatory, published 2025-01, re-check was due 2025-07-01
- [76] MoE licenses private schools in northern emirates — class regulatory, published 2025-01, re-check was due 2025-07-01
- [132] TVEC statutory registration of institutes and courses; NVQ 7 levels — class regulatory, published 2025-01, re-check was due 2025-07-01
- [74] ADEK eSIS mandatory; daily attendance; 13 authorised reasons; no codes — class data-return, published 2024-09, re-check was due 2025-09-01
- [107] TVTC private training licence 5 years; programme types — class regulatory, published 2025-06, re-check was due 2025-12-01
- [27] AU ESOS attendance monitoring only school/ELICOS/Foundation (VET if ASQA requires); not HE — class attendance, published 2025-01, re-check was due 2026-01-01
- [51] SG ICA Student's Pass: <90% monthly or 7+ consecutive days must be notified — class attendance, published 2025-01, re-check was due 2026-01-01
- [89] MoHESR HEDB mandatory for CAA-accredited HEIs — class data-return, published 2025-01, re-check was due 2026-01-01
- [100] Noor mandatory for Saudi international schools attendance/grades - not evidenced — class data-return, published 2025-01, re-check was due 2026-01-01
- [150] PMKVY 4.0 AEBAS daily biometric for candidate/trainer/assessor — class attendance, published 2025-01, re-check was due 2026-01-01
- [32] ESOS s19 PRISMS 14 days under-18, 31 days 18+ — class data-return, published 2025-02, re-check was due 2026-02-01
- [38] AU 2026 National Planning Level 295,000 — class regulatory, published 2025-08, re-check was due 2026-02-01
- [22] Apprenticeships/adult skills moved to DWP Sept 2025 — class regulatory, published 2025-09, re-check was due 2026-03-01
- [15] ILR FundModel codes 11/25/36/38/81/99 — class data-return, published 2025-04, re-check was due 2026-04-01
- [142] DPDP Rules: consent managers 13 Nov 2026, main duties 13 May 2027 — class dp-law, published 2025-11, re-check was due 2026-05-01
- [101] Saudi public schools two semesters from 2025-26 — class calendar, published 2025-08, re-check was due 2026-08-01
- [78] KHDA Appointment Notice per teacher per school from 10 Sep 2025 — class vetting, published 2025-09, re-check was due 2026-09-01
- [65] MY national schools January start from 2026 — class calendar, published 2025-10, re-check was due 2026-10-01
- [112] Qatar MoEHE private school admission guide with e-enrolment platform — class regulatory, published 2026-04, re-check was due 2026-10-01
- [149] NSQF 1 credit = 30 hours, half-levels — class grading, published 2023-10, re-check was due 2026-10-01

**Next re-checks due:**

- 2026-12-01: [7] UKVI BCA from 1 Jun 2026: refusals <5%, enrolment >=95%, completion >=85% (90% from Jun 2027) (regulatory)
- 2026-12-01: [125] LK government schools Jan-Dec, 2026 started 5 Jan (calendar)
- 2026-12-01: [135] UDISE+ reference date 31 March; covers private unaided (data-return)
- 2027-01-01: [1] Independent schools cannot issue penalty notices or attendance contracts; daily data to DfE state-funded only (regulatory)
- 2027-01-01: [122] LK international schools late Aug - early Jul, 3 terms (CIS/BSC/EMS) (calendar)
- 2027-01-01: [126] LK PDPA Parts I & III from 1 Jan 2027 (dp-law)
- 2027-01-01: [147] UGC CBCS 10-point letter grades (grading)
- 2027-02-01: [21] Apprenticeship OTJ minimum hours per standard (floor 187h) for starts from 1 Aug 2025 (regulatory)
- 2027-02-01: [83] UAE unified 2026-27 calendar 31 Aug 2026 - 2 Jul 2027 (calendar)
- 2027-02-01: [95] UAE PDPL executive regulations not issued (dp-law)
- 2027-03-01: [99] Saudi General Education Law M/36 repeals Foreign Schools Regulation, effective ~Jan 2027 (regulatory)
- 2027-04-01: [14] DUAA DP core in force 5 Feb 2026; Information Commission from 30 Sep 2026 (dp-law)

Earliest re-check in the ledger: 2018-09-01. Calendar claims expire with each academic year; DP-law claims should be re-checked at each commencement date (IN 13 Nov 2026 and 13 May 2027; LK 1 Jan 2027; AU Children's Code 10 Dec 2026; KSA education law ~20 Jan 2027). Use Refresh to re-run the stale set.
