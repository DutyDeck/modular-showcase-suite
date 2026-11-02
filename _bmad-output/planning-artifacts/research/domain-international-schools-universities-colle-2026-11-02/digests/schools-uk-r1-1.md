# Digest: International / Independent Schools (K-12) / United Kingdom (England)

Research run 2026-11-02. Primary sources were read as PDF text, extracted locally with pdftotext:
- **WTISA 2026:** DfE, "Working together to improve school attendance", statutory guidance, July 2026 edition (100 pp). https://assets.publishing.service.gov.uk/media/6a4f9ec6a6586e258d371bd0/Working_together_to_improve_school_attendance_2026.pdf. Publication page: https://www.gov.uk/government/publications/working-together-to-improve-school-attendance (published 6 May 2022, last updated 9 July 2026).
- **KCSIE 2026:** DfE, "Keeping children safe in education 2026". Added 7 July 2026, in force 1 September 2026. https://assets.publishing.service.gov.uk/media/6ac3c09c11ed58342ad8e4ac/Keeping_children_safe_in_education_2026.pdf
- **SLASC spec:** DfE, "School level annual school census (SLASC) 2027 (registered independent schools) Business and technical specification v1.0", July 2026. This is the content now served at the URL whose file name still says "SLASC_2026 ... v1.3": https://assets.publishing.service.gov.uk/media/694a6e472f02611393508a1e/SLASC_2026_Independent_Schools_Business_and_Technical_Specification_v1.3.pdf
- **UPN guide:** DfE, "Unique pupil numbers (UPNs): guide for schools and local authorities" (DFE-00116-2020), v1.2, June 2019. https://assets.publishing.service.gov.uk/media/5cfa739a40f0b663fd865a6a/UPN_Guide_1.2.pdf

legislation.gov.uk (SI 2024/208) returned HTTP 500/502/404 on every attempt, so the regulation text itself was NOT read. Regulation references below are as cited inside WTISA 2026.

## Findings

### Attendance: national attendance and absence codes (England), as summarised in WTISA 2026 ch. 8 (regulation 10 of the School Attendance (Pupil Registration) (England) Regulations 2024)

Source for every row: WTISA 2026, paras 297-422 (pp. 81-98). Confidence: **verified** (official statutory guidance, read this run). Class: attendance.

"Statistical category" is the exact classification the guidance gives under each code.

| Code | Meaning (official heading) | Group heading in guidance / regulation table | Statistical category |
|---|---|---|---|
| `/` | Present at the school, morning session | Attending the school, reg 10(2) Table 1 | Attending |
| `\` | Present at the school, afternoon session | Attending the school, reg 10(2) Table 1 | Attending |
| L | Late arrival before the register is closed | Attending the school, Table 1 | Attending |
| K | Attending education provision arranged by the local authority | Attending a place other than the school, reg 10(3) Table 2 | Attending an approved educational activity |
| V | Attending an educational visit or trip | Attending a place other than the school, Table 2 | Attending an approved educational activity |
| P | Participating in a sporting activity | Attending a place other than the school, Table 2 | Attending an approved educational activity |
| W | Attending work experience | Attending a place other than the school, Table 2 | Attending an approved educational activity |
| B | Attending any other approved educational activity (the school must also record the nature of the activity) | Attending a place other than the school, Table 2 | Attending an approved educational activity |
| C1 | Leave of absence for the purpose of participating in a regulated performance or undertaking regulated employment abroad | Absent: leave of absence, reg 10(4) Table 3 | Authorised absence |
| M | Leave of absence for the purpose of attending a medical or dental appointment | Absent: leave of absence, Table 3 | Authorised absence |
| J1 | Leave of absence for the purpose of attending an interview for employment or admission to another educational institution | Absent: leave of absence, Table 3 | Authorised absence |
| S | Leave of absence for the purpose of studying for a public examination | Absent: leave of absence, Table 3 | Authorised absence |
| X | Non-compulsory school age pupil not required to attend school | Absent: leave of absence, Table 3 | Not a possible attendance |
| C2 | Leave of absence for a compulsory school age pupil subject to a part-time timetable | Absent: leave of absence, Table 3 | Authorised absence |
| D | Dual registered at another school | Absent: leave of absence, Table 3 | Not a possible attendance (avoids double counting) |
| C | Leave of absence for exceptional circumstance | Absent: leave of absence, Table 3 | Authorised absence |
| T | Parent travelling for occupational purposes | Absent: other authorised reasons, Table 3 | Authorised absence |
| R | Religious observance | Absent: other authorised reasons, Table 3 | Authorised absence |
| I | Illness (not medical or dental appointment) | Absent: other authorised reasons, Table 3 | Authorised absence |
| E | Suspended or permanently excluded | Absent: other authorised reasons, Table 3 | Authorised absence |
| Q | Unable to attend the school because of a lack of access arrangements | Absent: unable to attend because of unavoidable cause, reg 10(4), (12), (13) | Not a possible attendance |
| Y1 | Unable to attend due to transport normally provided not being available | Unavoidable cause | Not a possible attendance |
| Y2 | Unable to attend due to widespread disruption to travel | Unavoidable cause | Not a possible attendance |
| Y3 | Unable to attend due to part of the school premises being closed | Unavoidable cause | Not a possible attendance |
| Y4 | Unable to attend due to the whole school site being unexpectedly closed (reg 10(10)) | Unavoidable cause | Not a possible attendance |
| Y5 | Unable to attend as pupil is in criminal justice detention (reg 10(14)) | Unavoidable cause | Not a possible attendance |
| Y6 | Unable to attend in accordance with public health guidance or law | Unavoidable cause | Not a possible attendance |
| Y7 | Unable to attend because of any other unavoidable cause | Unavoidable cause | Not a possible attendance |
| G | Holiday not granted by the school | Absent: unauthorised absence | Unauthorised absence |
| N | Reason for absence not yet established | Absent: unauthorised absence | Unauthorised absence |
| O | Absent in other or unknown circumstances | Absent: unauthorised absence | Unauthorised absence |
| U | Arrived in school after registration closed (reg 10(7), (8)) | Absent: unauthorised absence | Unauthorised absence |
| Z | Prospective pupil not on admission register | Administrative codes | Not collected for statistical purposes |
| `#` | Planned whole school closure: days between terms, half terms, occasional days such as bank holidays, weekends where the MIS requires it, up to 5 non-educational days, and use of the school as a polling station | Administrative codes | Not collected for statistical purposes |

Notes:
- The 2024 code set has **no H, J, F or plain Y code**. J is now **J1**, and there is an **R** code (religious observance), which the brief's list omitted.
- The codes come from reg 10(2) Table 1, 10(3) Table 2, 10(4) Table 3, 10(8) and 10(10). Where a pupil meets the criteria for a Table 2 code and a Table 3 code, the Table 2 code must be used (para 295).
- Code precedence uses the "primary reason". For example, leave of absence combined with detention is coded Y5 (para 296).

### Attendance: register-keeping rules (product requirements)

- **[UK-ENG][attendance] Two registers, kept electronically.** The law requires all schools, including independent schools, to have an admission register and an attendance register. The exception is schools where all pupils are boarders, which do not need an attendance register. Registers must be kept electronically, and a proprietor who fails to comply commits an offence. | source: WTISA 2026 para 29 | DfE | Jul 2026 | accessed 2026-11-02 | confidence: verified | class: attendance
- **[UK-ENG][attendance] Session timing.** The register is taken at the start of the morning session and once during each afternoon session. It is taken at the same time for all pupils and kept open for a maximum of 30 minutes. Where the register is taken more than once in an afternoon, DfE uses the last afternoon session for statistics. | source: WTISA 2026 paras 32, 290 | confidence: verified | class: attendance
- **[UK-ENG][attendance] Who gets a code.** A code must be entered for every pupil on the admission register, of compulsory or non-compulsory school age, except boarders (para 291). Code N must be replaced once the reason is known, and no later than 5 school days after the session (regs 10(7)-(8)). A pupil coded N who arrives after the register closes is amended to U. | source: WTISA 2026 paras 291, 299, ~407 | confidence: verified | class: attendance
- **[UK-ENG][attendance] Remote education.** Pupils absent from school and receiving remote education must still be marked absent with the most appropriate absence code. | source: WTISA 2026 para 293 | confidence: verified | class: attendance
- **[UK-ENG][attendance] Admission register fields (seed schema):**
  - full name
  - name used at school
  - sex
  - address
  - full name and address of each parent
  - which parent(s) the pupil normally lives with, plus at least one emergency phone number per such parent
  - date of birth
  - starting day
  - name and address of the last school attended
  - boarder or day pupil, for schools with boarding pupils of compulsory school age
  - future address, parent and date; other school name and start date, where applicable

  | source: WTISA 2026 paras 216-219 | confidence: verified | class: attendance
- **[UK-ENG][attendance] New Pupil Return.** A school must send this to the local authority within 5 days of adding a pupil to the admission register (reg 13(1)-(3)). It is not required for intake at the start of the most junior year unless the LA requests it. | source: WTISA 2026 para 215 | confidence: verified | class: data-return
- **[UK-ENG][attendance] Deletion Return.** A school must send this to the local authority when deleting a pupil (reg 13(4)-(6)). It carries name, address, parent details, emergency phone, future address, the other school and the reg 9(1) or 9(3) ground. It is not required for leavers from the most senior year at the end of the year. Retrospective deletion is prohibited. | source: WTISA 2026 paras 223-225 | confidence: verified | class: data-return
- **[UK-ENG][attendance] Deletion grounds (reg 9(1)), compulsory school age:**
  - A: registered at another school
  - B: not continued after completion of ...
  - C: dual registered at another school, and the other school ...
  - D: school attendance order changed
  - E: school attendance order revoked
  - F: parent has notified the school in writing (elective home education)
  - G: no longer lives a reasonable distance from the school
  - H: not returned after leave of absence
  - I: continually absent for 20 school days
  - J: detained under a sentence of detention
  - K: has died
  - L: over compulsory school age and not continuing
  - M: boarder whose board charges are unpaid (maintained schools and academies only)
  - **N: has ceased to be a pupil at an independent school or non-maintained special school (the independent-school-specific ground)**
  - O: permanently excluded

  Non-compulsory-age grounds (reg 9(3)) run A-E. | source: WTISA 2026 paras ~226-287 | confidence: verified (headings read; full text of A-C truncated) | class: attendance

### Applicability to independent schools

- **[UK-ENG][regulatory] WTISA is statutory for independent schools.** The title page says "Statutory guidance for maintained schools, academies, independent schools and local authorities". It is issued for independent schools under paragraph 7(b) of the Education (Independent School Standards) Regulations 2014, for chapters 1 and 2 only. | source: WTISA 2026 p.1 and footnote 1 p.6; gov.uk publication page | DfE | Jul 2026 | confidence: verified | class: regulatory
- **[UK-ENG][attendance] Daily attendance data to DfE is mandatory only for state-funded schools.** "State funded schools must also provide specific pupil information on request to the Secretary of State" (para 51). Footnote 5 adds the exceptions of nursery schools, CTCs and CCTAs. Schools that share data automatically get access to DfE's "View Your Education Data" tool. Independent schools are not in the mandatory scope. Whether they can opt in voluntarily was not confirmed this run. | source: WTISA 2026 para 51, fn 5 | confidence: verified (mandatory for state-funded only); unverified (voluntary opt-in for independents) | class: data-return
- **[UK-ENG][attendance] Independent schools cannot use penalty notices or attendance contracts.** Penalty notices "can be used by all schools (with the exception of independent schools)". Attendance contracts can be made between a parent and the school "with the exception of independent schools and non-maintained special schools", or with the LA. Product implication: hide or disable the penalty-notice workflow for independent-school tenants. | source: WTISA 2026 paras 142, 179 | confidence: verified | class: attendance
- **[UK-ENG][attendance] Registers and returns.** LA officers may access the registers of "all types of schools" and take extracts (para 50). The codes apply to "all schools" (para 322: "All schools must use the following codes"). | source: WTISA 2026 | confidence: verified | class: attendance
- **[UK-ENG][regulatory] Regulation scope text (SI 2024/208, citation and application) was NOT read** because legislation.gov.uk was unavailable. That the regulations apply to independent schools is **verified via the guidance** (para 29: "The law requires all schools including independent schools..."), not via the SI text. | confidence: verified (via guidance) | class: regulatory

### Statutory data returns

- **[UK-ENG][data-return] School Level Annual School Census (SLASC), registered independent schools only.**
  - **When:** annual. Census date is the **third Thursday in January** (SLASC 2027: 21 January 2027). Statutory deadline 21 February 2027.
  - **How:** submitted via the DfE COLLECT system, as XML from the MIS or by manual input. Data items are defined in the Common Basic Data Set (CBDS).
  - **Legal basis:** a statutory requirement under the Independent Educational Provision in England (Provision of Information) and Non-Maintained Special Schools (England) and Independent School Standards (Amendment) Regulations 2018, made under the Education and Skills Act 2008. All elements are mandatory unless stated voluntary. Failing to complete it can lead to removal from the register of independent schools.
  - **2027 vs 2026:** no changes.
  - **2026 census day:** Thursday 15 January 2026, per search snippet of the gov.uk SLASC page.

  | source: SLASC spec 2027 v1.0 secs 1.2, 1.5, 1.6 | DfE | Jul 2026 | confidence: verified (2026 date: likely) | class: data-return
- **[UK-ENG][data-return] SLASC is aggregate, not pupil-level.** Sections:
  - 1: general school information, including headteacher name
  - 2: accommodation
  - 3: annual fees (lowest/highest day and boarding: N00307-N00310)
  - 4: pupils on register, counted by age at 31 August and sex, full-time and part-time
  - 5: SEN, as counts with an EHC plan (N00425) and SEN support without an EHC plan (N00426)
  - 6: boarding (beds, boy and girl boarders N00421/N00422)
  - 7: teaching staff FTE/PT by sex, for the week of the census
  - 8: courses of study for age 15+ by principal aim (Level 4+, International Baccalaureate, GCE A level / Pre-U / AS, other Level 3 e.g. BTEC, GCSE/IGCSE, Levels 2 and 1, other)
  - 9: count of pupils in the final year of KS4
  - Annex A: teacher new appointments and leavers
  - Annex B: non-teaching staff appointments and leavers
  - Annex C: proprietors, chair and new proprietor-body members

  | source: SLASC spec 2027 contents and secs 3.5-3.14 | confidence: verified | class: data-return
- **[UK-ENG][data-return] SLASC is separate from the ISC Census.** The Independent Schools Council runs its own annual census, a voluntary membership survey also based on January data. ISC Census 2026: 1,455 schools and 526,611 pupils, published 24 June 2026. | source: https://www.isc.co.uk/media/5rmduu0j/2026-06-isc-census-2026.pdf (search snippet only) | ISC | Jun 2026 | confidence: likely | class: data-return
- **[UK-ENG][data-return] School Census (termly, pupil-level) applies to state-funded schools.** The 2026-27 spec exists at https://assets.publishing.service.gov.uk/media/699872b4a58a315dbe72c0ad/school-census-2026-to-2027-business-and-technical-specification.pdf. The scope was not read this run. | confidence: unverified (belief: autumn, spring and summer collections; state-funded only) | class: data-return

### Identifiers

- **[UK-ENG][identifier] UPN format: 13 characters.**
  - Character 1: check letter
  - Characters 2-4: LA code (3 digits)
  - Characters 5-8: DfE establishment number (4 digits)
  - Characters 9-10: year of allocation (2 digits, the year the academic year *begins*)
  - Characters 11-13: school serial number (3 digits)
  - Check letter: sum of (digit × character position) for characters 2-13, mod 23, mapped to a letter: 0=A 1=B 2=C 3=D 4=E 5=F 6=G 7=H 8=J 9=K 10=L 11=M 12=N 13=P 14=Q 15=R 16=T 17=U 18=V 19=W 20=X 21=Y 22=Z. I, O and S are never used. Worked example: H801200001001.
  - Temporary UPN: characters 11-13 become a 2-digit serial plus a letter (e.g. X00180001701A). Once the real UPN is known, it replaces the temporary one, which is kept in the "former UPN" field.
  - A UPN is never re-issued to another pupil.

  | source: UPN guide v1.2 Annex A and 6.1 | DfE | Jun 2019 | confidence: verified | class: identifier
- **[UK-ENG][identifier] UPNs are statutory for state-funded schools only.** They are allocated on first entry to the state-funded sector. "There is no statutory duty placed on independent schools to maintain UPNs"; independents *may* allocate them via the MIS or DfE's Excel UPN Generator, using the LA number of the LA they are physically located in plus their DfE establishment number (found via Get Information About Schools). Independents receive and keep UPNs from state schools and share them as required. LAs allocate UPNs for children not in state schools using "dummy" school numbers 3950-3999. | source: UPN guide v1.2 secs 1.1, 3.1, 5.1-5.3 | confidence: verified | class: identifier
- **[UK-ENG][identifier] LA/Estab number.** This is the 3-digit LA number plus the 4-digit DfE establishment number, i.e. 7 digits (LAESTAB), which also forms characters 2-8 of a UPN. Independent schools use the LA they are physically located in. | source: UPN guide v1.2 | confidence: verified | class: identifier
- **[UK-ENG][identifier] URN (GIAS unique reference number) and ULN (Learning Records Service, age 14+):** not researched this run. | confidence: unverified | class: identifier

### Staff vetting: KCSIE 2026, Single Central Record

- **[UK-ENG][vetting] Who the SCR covers.** Schools must keep a single central record ("the register" in the Regulations). For schools it covers all staff, including teacher trainees on salaried routes and agency or third-party supply staff (even for one day). For **independent schools it also covers all members of the proprietor body**; for academies, this means members and trustees. Legal basis for independents: Part 4 of the Schedule to the Education (Independent School Standards) Regulations 2014. | source: KCSIE 2026 paras 347-348, fn 96 | DfE | in force 1 Sep 2026 | confidence: verified | class: vetting
- **[UK-ENG][vetting] Mandatory SCR checks, each with yes/no plus the date completed or certificate obtained (para 350):**
  1. identity check
  2. standalone children's barred list check
  3. enhanced DBS check (with children's barred list check), requested or certificate provided
  4. prohibition from teaching check
  5. further checks on people who have lived or worked outside the UK (paras 359-363)
  6. check of professional qualifications, where required
  7. right to work in the UK
  - Plus, for **independent schools (including academies and free schools): details of section 128 checks for those in management positions**.
  - Plus, for colleges: whether the post involves "relevant activity".
  - For supply staff: written confirmation from the agency, the date received, and whether enhanced DBS details were provided (para 349).
  - Footnote 97: independent schools should also record the date each certificate was obtained.
  - Entries are removed once the person no longer works at the school (para 351). The SCR may be paper or electronic (para 353).

  | source: KCSIE 2026 paras 349-353 | confidence: verified | class: vetting
- **[UK-ENG][vetting] Childcare disqualification is optional on the SCR.** Whether staff have been told of their duty to disclose under the childcare disqualification arrangements is listed as **optional, non-statutory** SCR information. So are checks on volunteers and governors, safer-recruitment training dates, and who carried out each check (para 352). | source: KCSIE 2026 para 352 | confidence: verified | class: vetting

## Contradictions / surprises

- **SLASC spec is now 2027.** The URL named "SLASC_2026 ... v1.3" now serves the **SLASC 2027 v1.0 (July 2026)** document. Census date 21 January 2027, deadline 21 February 2027, no changes from 2026. The SLASC 2026 guide URL returned HTTP 410 (withdrawn).
- **WTISA has a July 2026 edition.** It adds clarifications: same-time registration for all pupils, benchmarking, young carers, illness evidence, remote education only as a last resort, and no blanket leave-of-absence policies.
- **The brief's code list is out of date.** "J" is now **J1**, there is no H, and **R (religious observance)** exists. X, D, Q and Y1-Y7 count as **"not a possible attendance"**, not as authorised absence. B, K, P, V and W count as **"attending an approved educational activity"**, not as present.
- **Ground N and Ground M.** Deletion ground N exists solely for independent and non-maintained special schools. Ground M (unpaid boarding charges) is limited to maintained schools and academies, so an independent school cannot delete a pupil on that ground. It would instead use N, ceased to be a pupil.
- **Fully boarding schools.** Schools where all pupils are boarders need no attendance register, and boarders are excluded from session coding. This is relevant for international boarding schools.
- **No penalty notices.** Independent schools cannot issue penalty notices or make school-level attendance contracts.

## Leads not chased

- SI 2024/208 text on legislation.gov.uk (regs 9, 10, 13 and the citation/application regulation). Retry: https://www.legislation.gov.uk/uksi/2024/208
- DfE "Sharing daily pupil attendance data" guidance: check whether independent schools can opt in and what VYED access they get.
- School Census 2026-27 spec (link above): termly dates and scope.
- School Workforce Census scope (believed state-funded only, November).
- GIAS: the duty for independent schools to keep records up to date. URN format.
- ULN / Learning Records Service: relevance for 14+ in schools.
- KCSIE 2026 paras 359-363 (overseas checks, letters of professional standing) and section 128 details. The text is extracted locally, so this is a quick follow-up.
- Regulators: Ofsted vs ISI remit; Education (Independent School Standards) Regulations 2014; DfE register of independent schools.
- Grading (GCSE 9-1, A level A*-E, IGCSE, IB 1-7/45) and the calendar (Sept-July, three terms): not researched this run.
- Incumbent MIS market share (Arbor, Bromcom, SIMS, iSAMS, Engage, WCBS): not researched. Likely sources: the DfE "school MIS market" report and Edtech market analyses.

## Looked for but could not find

- The SI 2024/208 schedule and regulations: legislation.gov.uk returned 500/502/404 errors.
- The SLASC 2026 non-technical guide PDF: HTTP 410 Gone.
- Whether independent schools can *voluntarily* share daily attendance data with DfE: not stated in WTISA 2026.
- Scotland, Wales and Northern Ireland: not covered (budget).
