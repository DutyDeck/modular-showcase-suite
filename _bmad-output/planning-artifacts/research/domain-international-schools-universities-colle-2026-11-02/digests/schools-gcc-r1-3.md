# Digest: International / Private Schools (K-12, fee-paying) / UAE, Saudi Arabia, Qatar

Research run: 2026-11-02. About 22 tool calls. Primary document read in full: ADEK School Student Administrative Affairs Policy v1.1, as a school-hosted copy. Most other claims rest on reputable Gulf press (Gulf News, Khaleej Times, Qatar Tribune, QNA) reached through search summaries, with a few law-firm or vendor pages. Treat any "likely" item as needing an official-source check before it becomes product logic.

## Findings

### UAE: regulators (Q1)
- [UAE][regulator] Abu Dhabi private schools are regulated by ADEK (Abu Dhabi Department of Education and Knowledge), www.adek.gov.ae. Its policies are styled "ADEK School <X> Policy", for example Student Administrative Affairs, Student Behavior, Educational Risk, Student Protection, Safeguarding, Inclusion, Records and Reporting. | source: https://reptonabudhabi.org/wp-content/uploads/sites/16/2024/10/ADEK_S_Student_Administrative_Affairs_Policy.pdf | ADEK (school-hosted copy) | Sept 2024, v1.1 | accessed 2026-11-02 | confidence: verified | class: regulatory
- [UAE][regulator] Sharjah private schools and nurseries are regulated by SPEA (Sharjah Private Education Authority), spea.shj.ae. SPEA lists its governing legislation as Decree No. 18 of 2020 concerning Private Education, plus Federal Decree-Law No. 39 of 2022 concerning Compulsory Education. SPEA runs "specialized electronic platforms" that include student registration (portal name not found). | source: https://spea.shj.ae/en/sources/policies-and-legislation (search snippet); https://spea.shj.ae/en/about-spea/who-we-are/ | SPEA | n.d. | accessed 2026-11-02 | confidence: likely (official domain, snippet only; the establishment page returned 404) | class: regulatory
- [UAE][regulator] Private schools in the Northern Emirates are licensed and accredited by the federal Ministry of Education (MoE), moe.gov.ae. The legal basis is Federal Decree-Law No. 18 of 2020 on Private Education. MoE publishes a 2025-26 "General Inspection Form for Private Schools" at moe.gov.ae/En/ImportantLinks/Documents/Files2025/Inspection/. | source: https://u.ae/en/information-and-services/education/licensing-private-educational-institutes ; https://elaws.moj.gov.ae/UAE-MOJ_LC-En/00_EDUCATION/UAE-LC-En_2020-09-27_00018_Markait.html | UAE Gov portal / MoJ | n.d. / 2020 | accessed 2026-11-02 | confidence: verified (official portal and law) | class: regulatory
- [UAE][regulator] Ras Al Khaimah reportedly has its own private-education authority (RAK Department of Knowledge) that co-regulates with MoE. Northern-emirates oversight is therefore not purely federal. | source: Gulf Business (via search) https://gulfbusiness.com/en/2026/education/live-updates-will-khda-other-uae-bodies-reopen-schools-soon/ | Gulf Business | 2026 | accessed 2026-11-02 | confidence: likely | class: regulatory
- [UAE][regulator] Dubai private schools are regulated by KHDA (Knowledge and Human Development Authority), khda.gov.ae / web.khda.gov.ae. KHDA operates "School Permit Services", which include "Requesting Faculty Registration". | source: https://web.khda.gov.ae/en/Services/School-Permit-Services/Requesting-Faculty-Registration (WebFetch failed with a TLS error; content seen via search snippet) | KHDA | updated July 2026 per snippet | accessed 2026-11-02 | confidence: likely | class: regulatory

### UAE: SIS and data returns (Q2)
- [UAE-AD][data-return] ADEK policy clause 1.5.1: "Schools shall register all their students on the ADEK Enterprise Student Information System (eSIS)". eSIS is mandatory for Abu Dhabi private schools. | source: ADEK policy PDF above | ADEK | Sept 2024 v1.1 (effective AY 2024/25 Fall, compliance from AY 2025/26 Fall) | accessed 2026-11-02 | confidence: verified | class: data-return
- [UAE-AD][data-return] Attendance must be reported "to ADEK daily on eSIS" (clause 2.1.2.d). Under clause 2.2, teachers record attendance daily and report it "to the centralized unit responsible for updating eSIS". | source: ADEK policy PDF | ADEK | 2024 | accessed 2026-11-02 | confidence: verified | class: data-return
- [UAE-AD][data-return] Registration documents required (clause 1.5.2):
  - registration form with the child's contact information
  - birth certificate
  - passport
  - Emirates ID, or diplomatic card with passport
  - both parents' passports, plus UAE residency evidence or diplomatic cards
  - DoH-compliant medical records with consent
  - Transfer Certificate (attested if applicable) and a student performance report from the sending school, for entry to Grade 2/Year 3 and above or a mid-year Grade 1 transfer
  - a Leaving Certificate when moving from a government school
  
  Non-UAE transfer students may defer the Emirates ID until the end of their enrolment term under a signed parental undertaking. Schools must update eSIS with the new EID. "Registration" is defined as uploading the child's information to eSIS and to the school's management system. | source: ADEK policy PDF | ADEK | 2024 | accessed 2026-11-02 | confidence: verified | class: data-return
- [UAE-AD][calendar/grading] ADEK cycle definitions:
  - KG: Pre-KG/FS1 to KG2/Y1
  - Cycle 1: G1/Y2 to G5/Y6
  - Cycle 2: G6/Y7 to G8/Y9
  - Cycle 3: G9/Y10 to G12/Y13
  
  MoE-curriculum private schools may use the MoE cycles instead: KG, C1 G1-4, C2 G5-8, C3 G9-12. Secondary certificates need MoE "Equivalency" to the UAE General Education Certificate (Al Thanawiya). | source: ADEK policy PDF | ADEK | 2024 | accessed 2026-11-02 | confidence: verified | class: grading
- [UAE-SHJ][data-return] New students must be registered with SPEA using documents submitted within one week of joining. SPEA requires an equivalency certificate for transfers into Year 12 from outside the UAE. This comes from one school's page. | source: https://www.sharjahenglishschool.org/documentation-checklist | Sharjah English School | n.d. | accessed 2026-11-02 | confidence: likely | class: data-return
- [UAE-DXB][data-return] I could not find the name or frequency of a KHDA student-data system or census in this run. MoE "Manhal" was not evidenced either. | confidence: unverified | class: data-return

### UAE: attendance (Q3)
- [UAE-AD][attendance] Absence categories under the ADEK policy. The policy defines Absence, Absence rate (absences divided by school days on the approved calendar, counted from the joining date for mid-year joiners), Attendance rate (whole school days attended), Present, Lateness, Punctuality, Examination Leave and Study Leave. "Authorized Absences" (clause 2.1.3.a) must be supported by a signed parent letter or official documents. The 13 enumerated reasons are:
  1. Illness
  2. Death of a 1st- or 2nd-degree relative
  3. Medical appointment scheduled before the absence
  4. Official community task
  5. Mandatory appearance before an official body
  6. Essential urgent family travel
  7. Conferences, competitions or events with the Principal's permission
  8. Work in the entertainment industry
  9. Religious holidays that are not UAE public holidays
  10. Examination leave (board and pre-collegiate exams, ADEK-approved)
  11. Study leave, up to 4 weeks a year (ADEK-approved)
  12. Medical or therapeutic leave for students with additional learning needs
  13. Government-approved closures for extreme weather
  
  No statutory alphanumeric attendance codes appear in the policy. | source: ADEK policy PDF | ADEK | 2024 | accessed 2026-11-02 | confidence: verified | class: attendance
- [UAE-AD][attendance] ADEK thresholds and deadlines:
  - Schools must follow up all unreported absences within 2 hours of the attendance register closing.
  - For Grade 1/Year 2 and above, an absence rate above 5% of ADEK calendar days is a "cause for concern", which can lead to an "educational risk" designation (ADEK School Educational Risk Policy) or a neglect report (Student Protection Policy).
  - For KG, the threshold is above 10%, counting both authorized and unauthorized absence.
  - Lateness on 3 or more occasions in a year triggers action under the ADEK School Student Behavior Policy, with a late-pass-at-reception mechanism.
  - Arrival/departure notification is required for unaccompanied Cycle 3 students.
  - Each school must publish its attendance policy on its website. | source: ADEK policy PDF | ADEK | 2024 | accessed 2026-11-02 | confidence: verified | class: attendance
- [UAE-DXB][attendance] There is no single KHDA absence allowance. Schools classify absences as AUTHORISED or UNAUTHORISED, and term-time holidays are typically unauthorised. School policies quote attendance-rate bands attributed to the KHDA/DSIB inspection framework: Outstanding ≥98%, Very Good 96%, Good 94%, Acceptable 92%, Unacceptable <92%. Some schools cite withdrawal of a place after 20 consecutive or 25 non-consecutive unauthorised days. | source: https://www.khaleejtimes.com/uae/schools-and-parents/dubai-school-attendance-khda-rules-policies ; school policies e.g. https://dubaischolars.com/wp-content/uploads/2026/08/ds_attendance_policy_2026-27.pdf | Khaleej Times / schools | 2026 | accessed 2026-11-02 | confidence: likely | class: attendance
- [UAE][attendance] Gulf News reports that ADEK classifies unexcused absences around holidays, weekends and exams as mid-level violations under its conduct policy. | source: https://gulfnews.com/uae/education/adek-issues-strict-guidelines-to-abu-dhabi-schools-regarding-student-absenteeism-1.500247086 | Gulf News | 2025 | accessed 2026-11-02 | confidence: likely | class: attendance

### UAE: staff vetting (Q4)
- [UAE-AD][vetting] ADEK requires a criminal record check or certificate of good conduct, which it calls "a fundamental requirement". UAE residents obtain it from UAE authorities; overseas applicants obtain it from their home country. Documents must be attested. Schools upload documents to the "School Staff Licensing Portal", and ADEK verifies them with the issuing authorities before final approval. Other requirements: a bachelor's degree, an accredited teaching licence or diploma, a language proficiency test and a medical fitness report. | source: https://gulfnews.com/uae/education/abu-dhabi-mandates-criminal-record-checks-for-private-school-teachers-1.500238169 | Gulf News | 19 Aug 2025 | accessed 2026-11-02 | confidence: likely | class: vetting
- [UAE-DXB][vetting] KHDA faculty registration requires a good conduct certificate attested by the issuing authority, whether issued in or outside the UAE. Newer rules (2025-26) are reported to add:
  - police clearance from every country of residence in the last 5 years, plus UAE clearance
  - a per-person, non-transferable "Appointment Notice" for every teacher and school leader
  - a signed Code of Conduct
  - a 90-day notice rule
  - "deregistration", which bars a person from Dubai private education
  
  The governing document is the "Technical Guide for Appointing Teaching Staff in Private Schools in Dubai". | source: https://web.khda.gov.ae/en/Services/School-Permit-Services/Requesting-Faculty-Registration (snippet); https://gulfnews.com/living-in-uae/education/new-khda-rules-for-recruiting-teachers-in-dubai-explained-1.500268743-1.500268743 | KHDA / Gulf News | 2025-2026 | accessed 2026-11-02 | confidence: likely | class: vetting
- [UAE][vetting] MoE's national educator licence is described as mandatory for education professionals. Private-school teachers register using an access code given to principals. The original private-school deadline was 2021, and coverage was extended to principals, vice-principals and other professional staff (Khaleej Times, March 2021). The official "TLS" product name was not confirmed. | source: https://u.ae/en/information-and-services/education/school-education-k-12/qualifications-to-be-a-teacher ; https://www.khaleejtimes.com/uae/education/uae-new-licence-compulsory-for-all-school-staff-from-next-year | UAE Gov portal / Khaleej Times | n.d. / 2021 | accessed 2026-11-02 | confidence: likely | class: vetting
- [UAE][vetting] The ADEK policy defines "Parent" by reference to Federal Decree-Law No. 3 of 2016 Concerning Child Rights (Wadeema). Child-protection duties run through the ADEK School Student Protection and Safeguarding Policies. | source: ADEK policy PDF | ADEK | 2024 | accessed 2026-11-02 | confidence: verified | class: vetting

### UAE: calendar (Q5)
- [UAE][calendar] The MoE unified 2026-27 calendar covers public and most private schools:
  - Start: 31 Aug 2026
  - End: 2 Jul 2027 (some reports say 1 Jul)
  - Mid-term break: 12-18 Oct 2026
  - Winter break: 14 Dec 2026 to 3 Jan 2027
  - Spring break: 5-11 Apr 2027 (Gulf News says 5-8 Apr)
  
  MoE also announced the 2027-28 and 2028-29 calendars. KHDA states that Dubai private schools must follow the MoE calendar. Indian, Pakistani and Bangladeshi curriculum schools are excluded. | source: https://gulfnews.com/uae/education/dubai-schools-october-mid-term-break-dates-2026-27-1.500663256 ; https://www.khaleejtimes.com/uae/education/uae-announces-public-private-school-academic-calendar-for-next-three-years | Gulf News / Khaleej Times | 2026 | accessed 2026-11-02 | confidence: verified (two independent press sources) | class: calendar
- [UAE][calendar] Indian and Pakistani curriculum schools run April to March. KHDA set 6 Apr 2026 as the start of AY 2026-27 for Dubai April-start (CBSE/ICSE) schools, and those schools opened online because of the regional conflict. Sharjah postponed the start for Indian and Pakistani curricula from 23 Mar to 30 Mar 2026. One secondary listing gives a minimum of 182 school days. | source: https://gulfnews.com/uae/education/dubais-khda-confirms-distance-learning-for-indian-schools-till-term-end-1.500464445 ; https://gulfnews.com/uae/sharjah-postpones-2026-27-academic-year-start-for-indian-pakistani-schools-amid-iranian-aggression-1.500464499 | Gulf News | Mar-Apr 2026 | accessed 2026-11-02 | confidence: verified (two articles; official KHDA document not read) | class: calendar
- [UAE][grading] CBSE schools in the UAE and GCC were reported to adopt a new CBSE "global curriculum" from April 2026. | source: https://gulfnews.com/uae/education/cbse-schools-in-uae-gcc-to-follow-new-global-curriculum-from-april-2026-1.500334377 | Gulf News | 2025 | accessed 2026-11-02 | confidence: likely (headline only) | class: grading

### UAE: identifiers and DP law (Q6, Q7)
- [UAE][identifier] The Emirates ID is the mandatory student identifier in eSIS. The diplomatic-card exception is in ADEK clause 1.5.4. The format (784-YYYY-NNNNNNN-C, 15 digits) was not verified this run. | source: ADEK policy PDF | confidence: verified (use) / unverified (format) | class: identifier
- [UAE][dp-law] The executive regulations for Federal Decree-Law No. 45 of 2021 (PDPL) appear to be still unissued as of mid-2026, per several secondary sources including Chambers TMT 2026 and BusinessDubai (Aug 2026). Some low-quality pages claim they were issued in 2026 with a 1 Jan 2027 deadline, without citing an instrument. DIFC and ADGM regimes were not researched. | source: https://practiceguides.chambers.com/practice-guides/tmt-2026/uae ; https://www.businessdubai.ae/blogs/uae-pdpl-data-protection | Chambers / BusinessDubai | 2026 | accessed 2026-11-02 | confidence: likely (status contested) | class: dp-law

### Saudi Arabia (Q8)
- [KSA][regulatory] Saudi Arabia has a new General Education Law (Royal Decree M/36), published in the Umm Al-Qura gazette on 24 Jul 2026. It takes effect after 180 days, about 20 Jan 2027, and it repeals the Foreign Schools Regulation. Under the new law:
  - Private schools need accreditation from ETEC or an ETEC-recognised international body.
  - The Ministry approves international programmes, and national-identity subjects are mandatory.
  - A new General Education Affairs Council, chaired by the Minister, will set rules on fees, co-education in private schools, non-Arabic instruction and online schools.
  
  Implementing rules are pending, expected around Jan 2028. | source: https://www.tamimi.com/news/opening-a-school-in-saudi-arabia-what-the-new-education-law-means-for-international-educators/ ; https://www.argaam.com/en/article/articledetail/id/1922853 ; https://gulfnews.com/amp/story/world%2Fgulf%2Fsaudi%2Fsaudi-arabia-approves-landmark-education-law-in-major-school-system-overhaul-1.500619923 | Al Tamimi / Argaam / Gulf News | Jul-Sep 2026 | accessed 2026-11-02 | confidence: verified (multiple independent sources; gazette text not read) | class: regulatory
- [KSA][data-return] Noor is the Ministry of Education's unified registration platform and integrated student database, used by public and many MoE-affiliated private schools. Vendor pages claim all accredited private schools must report demographics, enrolment, attendance, behaviour and term results into Noor, and that international schools on iSAMS, PowerSchool or Veracross integrate with Noor for enrolment, transcripts and promotion. Whether Noor is mandatory for international schools specifically was not confirmed by an official source. | source: https://saudipedia.com/en/article/785/government-and-politics/education-and-training/education-in-saudi-arabia ; https://openeducat.org/mena/compliance/noor/ | Saudipedia / OpenEduCat (vendor) | n.d. | accessed 2026-11-02 | confidence: likely (Noor's existence and role) / unverified (mandatory for international schools) | class: data-return
- [KSA][calendar] Public schools returned to a two-semester year from 1447H (2025-26), and MoE published a 4-year calendar through 1451H (2029-30) with 180 instructional days. Private and international schools keep the freedom to choose their own academic structure. International schools sampled start late August, e.g. 31 Aug 2025. | source: https://gulfnews.com/world/gulf/saudi/saudi-arabia-returns-to-two-semester-school-year-unveils-four-year-academic-roadmap-1.500223782 ; https://www.argaam.com/en/article/articledetail/id/1833642 | Gulf News / Argaam | 2025 | accessed 2026-11-02 | confidence: verified | class: calendar
- [KSA][identifier/vetting/dp-law] Not researched this run, for lack of budget: Iqama vs National ID formats, the ETEC teacher licence for international-school expat staff, police clearance, and SDAIA PDPL. Madrasati is believed to be the MoE LMS for public schools, but it is not evidenced as required for international schools. | confidence: unverified

### Qatar (Q9)
- [QA][regulatory] MoEHE (Ministry of Education and Higher Education) regulates private schools through a "Private Schools and Kindergartens Department" (licensing) under an "Assistant Undersecretary for Private Education Affairs". The second 2026 edition of the guide regulating admission and registration in private schools and kindergartens (12 Apr 2026) covers registration, transfer, cancellation, admission ages by stage and grade-equivalence tables across curricula. It mandates a unified electronic enrolment platform (name not given) under Law No. 25 of 2001 on Mandatory Education. | source: https://qna.org.qa/en/News-Area/News/2026-4/12/moehe-launches-second-edition-of-guide-for-regulating-admission-registration-of-students-in-private-schools | Qatar News Agency (official) | 12 Apr 2026 | accessed 2026-11-02 | confidence: verified | class: regulatory
- [QA][data-return] MoEHE's "National Student Information System (NSIS)" is used to upload private-school students' certificates. | source: https://www.qatar-tribune.com/article/4624/TopNews/Private-school-students-scores-certificates-can-soon-be-checked-online-in-Qatar | Qatar Tribune | n.d. (older) | accessed 2026-11-02 | confidence: likely | class: data-return
- [QA][attendance] For 2026-27, MoEHE rolled out "Hadori", a contactless palm-recognition attendance system, across all government schools and school buses. Students on the bus are registered 4 times a day; students using private transport are registered twice a day. A related "My Attendance" app is mentioned. Private schools are not stated to be in scope. | source: https://www.qatar-tribune.com/article/251607/front/moehe-rolls-out-palm-based-hadori-attendance-system-for-students | Qatar Tribune | Sept 2026 | accessed 2026-11-02 | confidence: likely | class: attendance
- [QA][vetting] A professional licence is mandatory for teachers, coordinators and school leaders, including in private schools. It runs in phases: temporary licence, then professional licence, then full licence. MoEHE opened its e-application window for professional licences on 3 September (Peninsula, 6 Sep 2026). MoEHE also assesses private-school teacher competency in the compulsory subjects (Arabic, Islamic studies, Qatari history), and has said private schools may now recruit directly within approved staffing structures without waiting for ministry approval. | source: https://www.thepeninsulaqatar.com/article/06/09/2026/professional-licensing-applications-open-for-teachers-and-school-leaders ; https://www.qatar-tribune.com/article/204368/latest-news/moehe-launches-project-to-assess-teacher-competency-in-three-compulsory-subjects/amp | The Peninsula / Qatar Tribune | 2026 | accessed 2026-11-02 | confidence: likely | class: vetting
- [QA][identifier/calendar/dp-law] Not researched this run: QID (11 digits), the private-school calendar, and Law No. 13 of 2016. | confidence: unverified

### Exam boards (Q10)
- Not researched this run. My unverified belief is that Cambridge International, Pearson Edexcel International, IB, CBSE (plus CISCE), and College Board AP/SAT are all prevalent across GCC private schools. | confidence: unverified | class: incumbent

## Contradictions / surprises
- **Regional conflict disrupted 2026 schooling.** Dubai April-start Indian/Pakistani schools began AY 2026-27 online (Apr 2026). Sharjah postponed its start "amid Iranian aggression", and Khaleej Times references a "US-Israel-Iran ceasefire" live blog and distance-learning absence tracking in Abu Dhabi. Product implication: attendance needs a "distance learning / remote present" mode, and ADEK already tracks absence in distance learning.
- **The Saudi Foreign Schools Regulation is being repealed** by the 2026 General Education Law, effective around Jan 2027. Licensing and accreditation for international schools moves to an ETEC-accreditation model. Any Saudi pack built on the old "foreign schools" framing will be outdated.
- **ADEK has no coded attendance taxonomy.** It defines an enumerated list of 13 authorized-absence reasons rather than codes. Dubai relies on school-level AUTHORISED/UNAUTHORISED classification plus DSIB attendance-rate bands.
- **KHDA calendar rule.** KHDA now explicitly requires Dubai private schools to follow the federal MoE calendar, with April-start curricula excepted. Historically Dubai set its own calendar.
- **Qatar is deregulating hiring.** Private schools may recruit directly without MoEHE pre-approval, a reversal of the prior approval model, while the licence remains mandatory.
- **UAE PDPL executive regulations**: sources conflict on whether they have been issued.
- **ADEK spring-break dates** conflict between Gulf News (5-8 Apr 2027) and Khaleej Times (5-11 Apr 2027).

## Leads not chased
- ADEK Policy Manual hub on adek.gov.ae (Student Behavior Policy, Educational Risk Policy, School Records Policy, School Reporting Policy), which sets the data-return list.
- KHDA "Technical Guide for Appointing Teaching Staff in Private Schools in Dubai" and the full KHDA faculty registration page (fetch failed on a TLS error).
- Khaleej Times "Abu Dhabi private schools absence tracking distance learning" (2026).
- The National, 22 Sep 2025: "Abu Dhabi updates rules on pupil absences for private schools".
- MoE "UAE MoE Attendance and Assessment Policy" explainer (lylawyers.com) for Northern Emirates absence thresholds.
- Al Tamimi PDF (Sept 2026) on the Saudi education law, for full Noor and licensing detail.
- MoEHE Qatar "enhanced licensing system for private schools and kindergartens" (Qatar Tribune 198838) and the 2026-27 KG operating-licence applications.
- SPEA "Policy on Enrolment of Learners in Private Schools" PDF (spea.shj.ae/media/lhrpapzv/...).

## Looked for but could not find
- The name and frequency of any KHDA student census or data system. MoE "Manhal" for private schools was not evidenced.
- The name of SPEA's student registration portal.
- Statutory alphanumeric attendance codes in any of the three countries. None were found; ADEK uses enumerated reasons instead.
- Official confirmation that Noor is mandatory for Saudi international schools.
- An official Qatar private-school SIS name beyond "NSIS", and Qatar private-school attendance rules.
- The official "TLS" product name for UAE teacher licensing.
