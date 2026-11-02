/* ── Student Records completion: documents, entry qualifications, employment
 * history. All rows carry tenantId + studentId (the 1StudentID). */

import type { ChangeLogEntry } from "./shared";

export type DocKind =
  | "Transcript"
  | "Identity document"
  | "Passport / visa"
  | "Consent form"
  | "Certificate"
  | "Medical"
  | "Offer / contract"
  | "Other";

export type DocAudience = "admin" | "teacher" | "student" | "parent";

export interface DocVersion {
  v: number;
  fileName: string;
  uploadedBy: string;
  at: string;
  note?: string;
}

/** A student document with version history and role-gated visibility. */
export interface LearnerDocument {
  id: string;
  tenantId: string;
  studentId: string;
  kind: DocKind;
  title: string;
  versions: DocVersion[]; // newest last
  visibleTo: DocAudience[];
  verified?: { by: string; at: string };
  expires?: string; // e.g. passport / visa
}

/** Qualifications held on entry (feeds admissions decisions and regulator returns). */
export interface PriorQualification {
  id: string;
  tenantId: string;
  studentId: string;
  title: string; // "GCE A/L (Physical Science)", "A Levels", "BSc Computing"
  institution: string;
  country: string;
  year: string;
  result: string;
  /** Framework level if known, e.g. "SLQF 4", "RQF 3", "AQF 5". */
  level?: string;
  verified: boolean;
}

export interface EmploymentRecord {
  id: string;
  tenantId: string;
  studentId: string;
  employer: string;
  role: string;
  from: string;
  to?: string;
  /** Counts toward entry requirements / recognition of prior learning. */
  relevant: boolean;
  /** Reference / evidence checked by the institution. */
  verified?: boolean;
}

/** Contact details held on the record. Static seed until Learner carries them. */
export interface LearnerContact {
  studentId: string;
  phone?: string;
  /** Guardian phone for school-age learners. */
  guardianPhone?: string;
  address?: string;
}

/* ── Documents ──────────────────────────────────────────────────────────── */

export const learnerDocuments: LearnerDocument[] = [
  // Northbridge University (T-010)
  {
    id: "DOC-1001",
    tenantId: "T-010",
    studentId: "S-4001",
    kind: "Passport / visa",
    title: "Passport (India)",
    versions: [
      {
        v: 1,
        fileName: "arjun_mehta_passport_bio_page.pdf",
        uploadedBy: "Arjun Mehta",
        at: "2025-06-18T09:12:00Z",
        note: "Minor passport, 5-year validity",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Dr. Eleanor Hughes", at: "2025-09-15T10:40:00Z" },
    expires: "2026-12-20",
  },
  {
    id: "DOC-1002",
    tenantId: "T-010",
    studentId: "S-4001",
    kind: "Passport / visa",
    title: "UK eVisa — Student route (share code check)",
    versions: [
      {
        v: 1,
        fileName: "evisa_share_code_check_2025-09-15.pdf",
        uploadedBy: "Dr. Eleanor Hughes",
        at: "2025-09-15T10:38:00Z",
        note: "Right-to-study check at enrolment",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Dr. Eleanor Hughes", at: "2025-09-15T10:41:00Z" },
    expires: "2028-10-31",
  },
  {
    id: "DOC-1003",
    tenantId: "T-010",
    studentId: "S-4001",
    kind: "Offer / contract",
    title: "CAS statement E4G7H2K9P1",
    versions: [
      {
        v: 1,
        fileName: "CAS_E4G7H2K9P1.pdf",
        uploadedBy: "International Admissions",
        at: "2025-07-30T14:05:00Z",
      },
      {
        v: 2,
        fileName: "CAS_E4G7H2K9P1_reissued.pdf",
        uploadedBy: "International Admissions",
        at: "2025-08-28T11:20:00Z",
        note: "Course end date corrected to 30 Jun 2028",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Dr. Eleanor Hughes", at: "2025-08-28T15:02:00Z" },
  },
  {
    id: "DOC-1004",
    tenantId: "T-010",
    studentId: "S-4001",
    kind: "Transcript",
    title: "CBSE Class XII marksheet (AISSCE 2023)",
    versions: [
      {
        v: 1,
        fileName: "cbse_xii_marksheet_2023.pdf",
        uploadedBy: "Arjun Mehta",
        at: "2025-05-02T08:30:00Z",
      },
    ],
    visibleTo: ["admin", "teacher", "student"],
    verified: { by: "Dr. Eleanor Hughes", at: "2025-05-09T12:00:00Z" },
  },
  {
    id: "DOC-1005",
    tenantId: "T-010",
    studentId: "S-4001",
    kind: "Offer / contract",
    title: "Unconditional offer — BSc Computer Science",
    versions: [
      {
        v: 1,
        fileName: "offer_letter_unconditional_S-4001.pdf",
        uploadedBy: "International Admissions",
        at: "2025-07-22T16:45:00Z",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "International Admissions", at: "2025-07-22T16:45:00Z" },
  },
  {
    id: "DOC-1006",
    tenantId: "T-010",
    studentId: "S-4006",
    kind: "Passport / visa",
    title: "Passport (Pakistan)",
    versions: [
      {
        v: 1,
        fileName: "fatima_noor_passport.pdf",
        uploadedBy: "Fatima Noor",
        at: "2026-06-04T07:50:00Z",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Dr. Eleanor Hughes", at: "2026-08-19T09:15:00Z" },
    expires: "2031-03-14",
  },
  {
    id: "DOC-1007",
    tenantId: "T-010",
    studentId: "S-4006",
    kind: "Offer / contract",
    title: "Commonwealth Shared Scholarship award letter",
    versions: [
      {
        v: 1,
        fileName: "CSS_award_letter_2026.pdf",
        uploadedBy: "Fatima Noor",
        at: "2026-10-27T13:10:00Z",
      },
    ],
    visibleTo: ["admin", "student"],
  },
  {
    id: "DOC-1008",
    tenantId: "T-010",
    studentId: "S-4002",
    kind: "Certificate",
    title: "A Level results certificate (2024)",
    versions: [
      {
        v: 1,
        fileName: "a_level_certificate_walker.pdf",
        uploadedBy: "Grace Walker",
        at: "2026-10-30T18:22:00Z",
      },
    ],
    visibleTo: ["admin", "teacher", "student"],
  },
  {
    id: "DOC-1009",
    tenantId: "T-010",
    studentId: "S-4008",
    kind: "Other",
    title: "Interruption of studies — approval letter",
    versions: [
      {
        v: 1,
        fileName: "interruption_approval_S-4008.pdf",
        uploadedBy: "Dr. Eleanor Hughes",
        at: "2026-03-02T11:00:00Z",
        note: "Return date Sep 2027",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Dr. Eleanor Hughes", at: "2026-03-02T11:00:00Z" },
  },
  {
    id: "DOC-1010",
    tenantId: "T-010",
    studentId: "S-4008",
    kind: "Medical",
    title: "GP supporting letter",
    versions: [
      {
        v: 1,
        fileName: "gp_letter_confidential.pdf",
        uploadedBy: "Isabelle Fox",
        at: "2026-02-20T10:05:00Z",
      },
    ],
    visibleTo: ["admin"],
    verified: { by: "Dr. Eleanor Hughes", at: "2026-02-24T09:30:00Z" },
  },

  // Harbourside College Sydney (T-011)
  {
    id: "DOC-1011",
    tenantId: "T-011",
    studentId: "S-5001",
    kind: "Passport / visa",
    title: "Passport (Japan)",
    versions: [
      {
        v: 1,
        fileName: "sakura_tanaka_passport.pdf",
        uploadedBy: "Sakura Tanaka",
        at: "2026-05-11T02:30:00Z",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Liam O'Connor", at: "2026-05-14T00:45:00Z" },
    expires: "2026-12-28",
  },
  {
    id: "DOC-1012",
    tenantId: "T-011",
    studentId: "S-5001",
    kind: "Passport / visa",
    title: "Confirmation of Enrolment (CoE 0XQ2291-1)",
    versions: [
      {
        v: 1,
        fileName: "CoE_0XQ2291-1.pdf",
        uploadedBy: "Liam O'Connor",
        at: "2026-05-20T03:00:00Z",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Liam O'Connor", at: "2026-05-20T03:00:00Z" },
  },
  {
    id: "DOC-1013",
    tenantId: "T-011",
    studentId: "S-5001",
    kind: "Passport / visa",
    title: "Student visa grant notice (subclass 500)",
    versions: [
      {
        v: 1,
        fileName: "visa_grant_500_tanaka_2025.pdf",
        uploadedBy: "Sakura Tanaka",
        at: "2025-06-12T05:00:00Z",
      },
      {
        v: 2,
        fileName: "visa_grant_500_tanaka_2026.pdf",
        uploadedBy: "Sakura Tanaka",
        at: "2026-07-01T22:10:00Z",
        note: "Re-granted for Diploma CoE",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Liam O'Connor", at: "2026-07-02T01:30:00Z" },
    expires: "2027-12-15",
  },
  {
    id: "DOC-1014",
    tenantId: "T-011",
    studentId: "S-5005",
    kind: "Passport / visa",
    title: "Confirmation of Enrolment (CoE 0XP9912-3)",
    versions: [
      {
        v: 1,
        fileName: "CoE_0XP9912-3.pdf",
        uploadedBy: "Liam O'Connor",
        at: "2024-11-28T04:00:00Z",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Liam O'Connor", at: "2024-11-28T04:00:00Z" },
  },
  {
    id: "DOC-1015",
    tenantId: "T-011",
    studentId: "S-5005",
    kind: "Passport / visa",
    title: "Passport (India)",
    versions: [
      {
        v: 1,
        fileName: "ishaan_kapoor_passport.pdf",
        uploadedBy: "Ishaan Kapoor",
        at: "2024-11-02T09:00:00Z",
      },
    ],
    visibleTo: ["admin", "student"],
    verified: { by: "Liam O'Connor", at: "2024-11-05T23:00:00Z" },
    expires: "2032-08-09",
  },
  {
    id: "DOC-1016",
    tenantId: "T-011",
    studentId: "S-5002",
    kind: "Offer / contract",
    title: "Apprenticeship training contract (NSW)",
    versions: [
      {
        v: 1,
        fileName: "training_contract_cooper_coastline.pdf",
        uploadedBy: "Liam O'Connor",
        at: "2025-02-03T00:30:00Z",
        note: "Employer: Coastline Electrical Pty Ltd",
      },
    ],
    visibleTo: ["admin", "teacher", "student"],
    verified: { by: "Liam O'Connor", at: "2025-02-03T00:30:00Z" },
  },
  {
    id: "DOC-1017",
    tenantId: "T-011",
    studentId: "S-5008",
    kind: "Other",
    title: "RPL evidence — employer reference (Datacom)",
    versions: [
      {
        v: 1,
        fileName: "datacom_reference_brooks.pdf",
        uploadedBy: "Ella Brooks",
        at: "2026-10-21T06:15:00Z",
      },
    ],
    visibleTo: ["admin", "teacher", "student"],
  },
  {
    id: "DOC-1018",
    tenantId: "T-011",
    studentId: "S-5004",
    kind: "Transcript",
    title: "NSW HSC Record of Achievement",
    versions: [
      {
        v: 1,
        fileName: "hsc_roa_murphy_2021.pdf",
        uploadedBy: "Lachlan Murphy",
        at: "2024-12-09T01:00:00Z",
      },
    ],
    visibleTo: ["admin", "teacher", "student"],
    verified: { by: "Liam O'Connor", at: "2024-12-12T02:00:00Z" },
  },

  // Meridian International School Dubai (T-009)
  {
    id: "DOC-1019",
    tenantId: "T-009",
    studentId: "S-3001",
    kind: "Consent form",
    title: "Year 10 Hatta residential trip consent",
    versions: [
      {
        v: 1,
        fileName: "hatta_trip_consent_zara_khan.pdf",
        uploadedBy: "Sarah Khan",
        at: "2026-10-14T17:40:00Z",
      },
    ],
    visibleTo: ["admin", "teacher", "parent"],
    verified: { by: "Hannah Clarke", at: "2026-10-15T07:20:00Z" },
  },
  {
    id: "DOC-1020",
    tenantId: "T-009",
    studentId: "S-3001",
    kind: "Medical",
    title: "Medical information & allergy form",
    versions: [
      {
        v: 1,
        fileName: "medical_form_zara_2025.pdf",
        uploadedBy: "Sarah Khan",
        at: "2025-08-20T08:00:00Z",
      },
      {
        v: 2,
        fileName: "medical_form_zara_2026.pdf",
        uploadedBy: "Sarah Khan",
        at: "2026-08-24T09:35:00Z",
        note: "Added tree-nut allergy — EpiPen held in school clinic",
      },
    ],
    visibleTo: ["admin", "teacher", "parent"],
    verified: { by: "Hannah Clarke", at: "2026-08-25T06:10:00Z" },
  },
  {
    id: "DOC-1021",
    tenantId: "T-009",
    studentId: "S-3001",
    kind: "Passport / visa",
    title: "UAE residence visa",
    versions: [
      {
        v: 1,
        fileName: "residence_visa_zara_khan.pdf",
        uploadedBy: "Sarah Khan",
        at: "2024-12-03T10:00:00Z",
      },
    ],
    visibleTo: ["admin", "parent"],
    verified: { by: "Hannah Clarke", at: "2024-12-04T05:30:00Z" },
    expires: "2026-12-01",
  },
  {
    id: "DOC-1022",
    tenantId: "T-009",
    studentId: "S-3002",
    kind: "Certificate",
    title: "Transfer certificate (previous school)",
    versions: [
      {
        v: 1,
        fileName: "transfer_certificate_adam_khan.pdf",
        uploadedBy: "Sarah Khan",
        at: "2025-08-18T08:45:00Z",
      },
    ],
    visibleTo: ["admin", "parent"],
    verified: { by: "Hannah Clarke", at: "2025-08-19T06:00:00Z" },
  },
  {
    id: "DOC-1023",
    tenantId: "T-009",
    studentId: "S-3009",
    kind: "Passport / visa",
    title: "Passport (Japan)",
    versions: [
      {
        v: 1,
        fileName: "mei_tanaka_passport_2021.pdf",
        uploadedBy: "Hiro Tanaka",
        at: "2023-08-21T07:00:00Z",
      },
      {
        v: 2,
        fileName: "mei_tanaka_passport_2026.pdf",
        uploadedBy: "Hiro Tanaka",
        at: "2026-06-12T11:30:00Z",
        note: "Renewed passport — new number",
      },
    ],
    visibleTo: ["admin", "parent"],
    verified: { by: "Hannah Clarke", at: "2026-06-14T06:45:00Z" },
    expires: "2031-05-30",
  },

  // Meridian School Colombo (T-012)
  {
    id: "DOC-1024",
    tenantId: "T-012",
    studentId: "S-3101",
    kind: "Identity document",
    title: "Birth certificate",
    versions: [
      {
        v: 1,
        fileName: "birth_certificate_nethmi_perera.pdf",
        uploadedBy: "Dilani Perera",
        at: "2022-01-10T04:00:00Z",
      },
    ],
    visibleTo: ["admin", "parent"],
    verified: { by: "Mrs. Dilrukshi Gunawardena", at: "2022-01-12T03:30:00Z" },
  },
  {
    id: "DOC-1025",
    tenantId: "T-012",
    studentId: "S-3105",
    kind: "Identity document",
    title: "Birth certificate",
    versions: [
      {
        v: 1,
        fileName: "birth_certificate_sasindu_perera.pdf",
        uploadedBy: "Dilani Perera",
        at: "2024-01-08T04:15:00Z",
      },
    ],
    visibleTo: ["admin", "parent"],
    verified: { by: "Mrs. Dilrukshi Gunawardena", at: "2024-01-09T05:00:00Z" },
  },
  {
    id: "DOC-1026",
    tenantId: "T-012",
    studentId: "S-3105",
    kind: "Consent form",
    title: "Photo & media consent 2026–27",
    versions: [
      {
        v: 1,
        fileName: "media_consent_sasindu.pdf",
        uploadedBy: "Dilani Perera",
        at: "2026-10-30T13:20:00Z",
      },
    ],
    visibleTo: ["admin", "teacher", "parent"],
  },
  {
    id: "DOC-1027",
    tenantId: "T-012",
    studentId: "S-3102",
    kind: "Identity document",
    title: "National Identity Card (NIC)",
    versions: [
      {
        v: 1,
        fileName: "nic_kavin_fernando.pdf",
        uploadedBy: "Ruwan Fernando",
        at: "2026-03-08T05:10:00Z",
      },
    ],
    visibleTo: ["admin", "student", "parent"],
    verified: { by: "Mrs. Dilrukshi Gunawardena", at: "2026-03-10T04:00:00Z" },
  },
  {
    id: "DOC-1028",
    tenantId: "T-012",
    studentId: "S-3104",
    kind: "Transcript",
    title: "GCE O/L results sheet (2025)",
    versions: [
      {
        v: 1,
        fileName: "gce_ol_results_ashan_2025.pdf",
        uploadedBy: "Mrs. Dilrukshi Gunawardena",
        at: "2026-04-20T06:00:00Z",
      },
    ],
    visibleTo: ["admin", "teacher", "student", "parent"],
    verified: { by: "Mrs. Dilrukshi Gunawardena", at: "2026-04-20T06:00:00Z" },
  },
];

/* ── Entry qualifications ───────────────────────────────────────────────── */

export const priorQualifications: PriorQualification[] = [
  {
    id: "QUAL-1001",
    tenantId: "T-010",
    studentId: "S-4001",
    title: "CBSE Class XII (AISSCE) — Science with Computer Science",
    institution: "Delhi Public School, R.K. Puram",
    country: "India",
    year: "2023",
    result: "91.4% (best of five)",
    level: "RQF 3 (UK ENIC comparable)",
    verified: true,
  },
  {
    id: "QUAL-1002",
    tenantId: "T-010",
    studentId: "S-4001",
    title: "IELTS Academic",
    institution: "British Council, New Delhi",
    country: "India",
    year: "2024",
    result: "Overall 7.0 (no band below 6.5)",
    level: "CEFR C1",
    verified: true,
  },
  {
    id: "QUAL-1003",
    tenantId: "T-010",
    studentId: "S-4002",
    title: "A Levels — Computer Science, Mathematics, Physics",
    institution: "Harrogate Sixth Form College",
    country: "United Kingdom",
    year: "2024",
    result: "A* A B",
    level: "RQF 3",
    verified: false,
  },
  {
    id: "QUAL-1004",
    tenantId: "T-010",
    studentId: "S-4003",
    title: "A Levels — Mathematics, Further Mathematics, Economics",
    institution: "Leeds City Academy",
    country: "United Kingdom",
    year: "2024",
    result: "A A B",
    level: "RQF 3",
    verified: true,
  },
  {
    id: "QUAL-1005",
    tenantId: "T-010",
    studentId: "S-4004",
    title: "NCUK International Foundation Year (Engineering & Computing)",
    institution: "NCUK Study Centre, Shanghai",
    country: "China",
    year: "2024",
    result: "Distinction (78%)",
    level: "RQF 3",
    verified: true,
  },
  {
    id: "QUAL-1006",
    tenantId: "T-010",
    studentId: "S-4006",
    title: "BS Computer Science",
    institution: "FAST-NUCES, Lahore",
    country: "Pakistan",
    year: "2023",
    result: "CGPA 3.62 / 4.00",
    level: "RQF 6 (UK ENIC comparable)",
    verified: true,
  },
  {
    id: "QUAL-1007",
    tenantId: "T-010",
    studentId: "S-4007",
    title: "International Baccalaureate Diploma",
    institution: "King Edward's School, Bath",
    country: "United Kingdom",
    year: "2026",
    result: "38 points (HL Maths AA 7)",
    level: "RQF 3",
    verified: true,
  },
  {
    id: "QUAL-1008",
    tenantId: "T-010",
    studentId: "S-4009",
    title: "BSc Mathematics",
    institution: "University of Leeds",
    country: "United Kingdom",
    year: "2019",
    result: "Upper second-class honours (2:1)",
    level: "RQF 6",
    verified: true,
  },
  {
    id: "QUAL-1009",
    tenantId: "T-010",
    studentId: "S-4010",
    title: "ISC Class XII (CISCE)",
    institution: "La Martiniere Girls' College, Lucknow",
    country: "India",
    year: "2023",
    result: "88.6%",
    level: "RQF 3 (UK ENIC comparable)",
    verified: false,
  },
  {
    id: "QUAL-1010",
    tenantId: "T-011",
    studentId: "S-5001",
    title: "Upper secondary school diploma (Kōtōgakkō)",
    institution: "Osaka Prefectural Tennoji High School",
    country: "Japan",
    year: "2023",
    result: "Graduated — GPA 4.1 / 5",
    level: "AQF Senior Secondary (comparable)",
    verified: true,
  },
  {
    id: "QUAL-1011",
    tenantId: "T-011",
    studentId: "S-5001",
    title: "Certificate IV in Information Technology (ICT40120)",
    institution: "Harbourside College Sydney",
    country: "Australia",
    year: "2026",
    result: "Completed — all units Competent",
    level: "AQF 4",
    verified: true,
  },
  {
    id: "QUAL-1012",
    tenantId: "T-011",
    studentId: "S-5003",
    title: "Certificate III in Individual Support (CHC33021)",
    institution: "TAFE NSW — Ultimo",
    country: "Australia",
    year: "2025",
    result: "Completed",
    level: "AQF 3",
    verified: true,
  },
  {
    id: "QUAL-1013",
    tenantId: "T-011",
    studentId: "S-5004",
    title: "NSW Higher School Certificate",
    institution: "Northern Beaches Secondary College",
    country: "Australia",
    year: "2021",
    result: "ATAR 82.35",
    level: "AQF Senior Secondary",
    verified: true,
  },
  {
    id: "QUAL-1014",
    tenantId: "T-011",
    studentId: "S-5005",
    title: "CBSE Class XII (AISSCE) — Science",
    institution: "Kendriya Vidyalaya, Pune",
    country: "India",
    year: "2022",
    result: "86.2%",
    level: "AQF Senior Secondary (comparable)",
    verified: true,
  },
  {
    id: "QUAL-1015",
    tenantId: "T-011",
    studentId: "S-5006",
    title: "NSW Higher School Certificate (non-ATAR)",
    institution: "Cronulla High School",
    country: "Australia",
    year: "2023",
    result: "Awarded",
    level: "AQF Senior Secondary",
    verified: true,
  },
  {
    id: "QUAL-1016",
    tenantId: "T-011",
    studentId: "S-5007",
    title: "Certificate II in Construction Pathways (CPC20220)",
    institution: "TAFE NSW — Granville",
    country: "Australia",
    year: "2024",
    result: "Completed (VET for secondary students)",
    level: "AQF 2",
    verified: true,
  },
  {
    id: "QUAL-1017",
    tenantId: "T-011",
    studentId: "S-5008",
    title: "NCEA Level 3",
    institution: "Rangitoto College, Auckland",
    country: "New Zealand",
    year: "2021",
    result: "Merit endorsement",
    level: "NZQF 3",
    verified: false,
  },
  {
    id: "QUAL-1018",
    tenantId: "T-012",
    studentId: "S-3104",
    title: "GCE Ordinary Level",
    institution: "Department of Examinations, Sri Lanka",
    country: "Sri Lanka",
    year: "2025",
    result: "7 A, 2 B",
    verified: true,
  },
  {
    id: "QUAL-1019",
    tenantId: "T-012",
    studentId: "S-3102",
    title: "GCE Ordinary Level",
    institution: "Department of Examinations, Sri Lanka",
    country: "Sri Lanka",
    year: "2025",
    result: "6 A, 2 B, 1 C",
    verified: true,
  },
];

/* ── Employment history ─────────────────────────────────────────────────── */

export const employmentRecords: EmploymentRecord[] = [
  {
    id: "EMP-1001",
    tenantId: "T-010",
    studentId: "S-4009",
    employer: "Northwind Analytics Ltd",
    role: "Data Analyst",
    from: "2021-09-01",
    relevant: true,
    verified: true,
  },
  {
    id: "EMP-1002",
    tenantId: "T-010",
    studentId: "S-4009",
    employer: "Leeds City Council",
    role: "Graduate Information Officer",
    from: "2019-08-05",
    to: "2021-08-27",
    relevant: true,
    verified: true,
  },
  {
    id: "EMP-1003",
    tenantId: "T-011",
    studentId: "S-5002",
    employer: "Coastline Electrical Pty Ltd",
    role: "Apprentice electrician",
    from: "2025-02-03",
    relevant: true,
    verified: true,
  },
  {
    id: "EMP-1004",
    tenantId: "T-011",
    studentId: "S-5002",
    employer: "Woolworths Dee Why",
    role: "Store team member (casual)",
    from: "2022-03-14",
    to: "2025-01-24",
    relevant: false,
    verified: false,
  },
  {
    id: "EMP-1005",
    tenantId: "T-011",
    studentId: "S-5007",
    employer: "Harbour Build Co",
    role: "Apprentice carpenter",
    from: "2026-02-09",
    relevant: true,
    verified: true,
  },
  {
    id: "EMP-1006",
    tenantId: "T-011",
    studentId: "S-5007",
    employer: "Bunnings Warehouse Alexandria",
    role: "Trade desk team member",
    from: "2023-11-06",
    to: "2026-01-30",
    relevant: true,
    verified: false,
  },
  {
    id: "EMP-1007",
    tenantId: "T-011",
    studentId: "S-5008",
    employer: "Datacom (Auckland)",
    role: "Service desk analyst",
    from: "2022-01-17",
    to: "2025-06-27",
    relevant: true,
    verified: false,
  },
  {
    id: "EMP-1008",
    tenantId: "T-011",
    studentId: "S-5008",
    employer: "Northern Beaches Council",
    role: "IT support officer",
    from: "2025-07-14",
    relevant: true,
    verified: true,
  },
  {
    id: "EMP-1009",
    tenantId: "T-011",
    studentId: "S-5003",
    employer: "Uniting Aged Care, Waverley",
    role: "Assistant in nursing (part-time)",
    from: "2025-04-01",
    relevant: true,
    verified: true,
  },
];

/* ── Contact details ────────────────────────────────────────────────────── */

export const learnerContacts: LearnerContact[] = [
  {
    studentId: "S-3001",
    guardianPhone: "+971 55 318 7782",
    address: "Apt 1406, Marina Gate 1, Dubai Marina",
  },
  {
    studentId: "S-3002",
    guardianPhone: "+971 55 318 7782",
    address: "Apt 1406, Marina Gate 1, Dubai Marina",
  },
  { studentId: "S-3003", guardianPhone: "+971 50 442 1907", address: "Villa 22, Mirdif, Dubai" },
  {
    studentId: "S-3004",
    phone: "+971 52 610 3384",
    guardianPhone: "+971 50 442 1907",
    address: "Villa 22, Mirdif, Dubai",
  },
  {
    studentId: "S-3005",
    guardianPhone: "+971 56 120 8841",
    address: "Villa 7, Arabian Ranches 2, Dubai",
  },
  {
    studentId: "S-3006",
    phone: "+971 52 774 0193",
    guardianPhone: "+971 50 993 2265",
    address: "Apt 803, Silicon Oasis, Dubai",
  },
  {
    studentId: "S-3007",
    guardianPhone: "+971 50 210 5577",
    address: "Villa 15, Al Barsha 2, Dubai",
  },
  {
    studentId: "S-3008",
    guardianPhone: "+971 54 338 9020",
    address: "Apt 512, JLT Cluster D, Dubai",
  },
  {
    studentId: "S-3009",
    phone: "+971 52 901 4418",
    guardianPhone: "+971 50 776 3102",
    address: "Apt 2104, Downtown Views, Dubai",
  },
  { studentId: "S-3010", guardianPhone: "+971 55 640 7713", address: "Apt 309, Al Nahda 1, Dubai" },
  {
    studentId: "S-3101",
    guardianPhone: "+94 77 341 2290",
    address: "45/2 Havelock Road, Colombo 05",
  },
  {
    studentId: "S-3102",
    phone: "+94 71 552 0187",
    guardianPhone: "+94 77 908 1123",
    address: "12 Alfred Place, Colombo 03",
  },
  {
    studentId: "S-3103",
    phone: "+94 76 220 4419",
    guardianPhone: "+94 77 615 3380",
    address: "88 Nawala Road, Rajagiriya",
  },
  {
    studentId: "S-3104",
    phone: "+94 70 384 9926",
    guardianPhone: "+94 71 220 5541",
    address: "21 Gregory's Road, Colombo 07",
  },
  {
    studentId: "S-3105",
    guardianPhone: "+94 77 341 2290",
    address: "45/2 Havelock Road, Colombo 05",
  },
  {
    studentId: "S-4001",
    phone: "+44 7700 900 418",
    address: "Flat 3, 18 Albion Street, Northbridge NB2 4QT",
  },
  {
    studentId: "S-4002",
    phone: "+44 7700 900 214",
    address: "Room 118, Kelvin Hall, Northbridge NB1 7AA",
  },
  {
    studentId: "S-4003",
    phone: "+44 7700 900 377",
    address: "27 Moorland Road, Northbridge NB3 2LP",
  },
  {
    studentId: "S-4004",
    phone: "+44 7700 900 562",
    address: "Room 305, Kelvin Hall, Northbridge NB1 7AA",
  },
  { studentId: "S-4005", phone: "+44 7700 900 649", address: "9 Canal Wharf, Northbridge NB2 1RS" },
  {
    studentId: "S-4006",
    phone: "+44 7700 900 731",
    address: "Room 12, Graduate House, Northbridge NB1 3GH",
  },
  {
    studentId: "S-4007",
    phone: "+44 7700 900 805",
    address: "Room 221, Kelvin Hall, Northbridge NB1 7AA",
  },
  { studentId: "S-4008", phone: "+44 7700 900 916", address: "4 Ash Grove, Harrogate HG1 4DS" },
  { studentId: "S-4009", phone: "+44 7700 900 133", address: "16 Park Lane, Leeds LS6 2QA" },
  {
    studentId: "S-4010",
    phone: "+44 7700 900 288",
    address: "Room 140, Kelvin Hall, Northbridge NB1 7AA",
  },
  {
    studentId: "S-5001",
    phone: "+61 412 508 331",
    address: "Unit 7, 42 Harris Street, Pyrmont NSW 2009",
  },
  { studentId: "S-5002", phone: "+61 423 117 640", address: "18 Pittwater Road, Manly NSW 2095" },
  { studentId: "S-5003", phone: "+61 431 902 274", address: "5/61 Bondi Road, Bondi NSW 2026" },
  { studentId: "S-5004", phone: "+61 402 663 815", address: "3 Ocean Grove, Collaroy NSW 2097" },
  {
    studentId: "S-5005",
    phone: "+61 447 219 058",
    address: "Unit 12, 8 Wattle Street, Ultimo NSW 2007",
  },
  { studentId: "S-5006", phone: "+61 415 870 442", address: "27 Kingsway, Cronulla NSW 2230" },
  { studentId: "S-5007", phone: "+61 438 340 916", address: "9 Botany Road, Alexandria NSW 2015" },
  {
    studentId: "S-5008",
    phone: "+61 409 752 183",
    address: "2/14 Pacific Parade, Dee Why NSW 2099",
  },
];

/* ── Seed change-log entries (merged into the shared changeLog by the store) */

export const seedChangeLog: ChangeLogEntry[] = [
  {
    id: "CHG-1001",
    tenantId: "T-010",
    entity: "learner",
    entityId: "S-4001",
    studentId: "S-4001",
    field: "Term-time address",
    from: "Room 214, Kelvin Hall, Northbridge NB1 7AA",
    to: "Flat 3, 18 Albion Street, Northbridge NB2 4QT",
    by: "Arjun Mehta (self-service)",
    at: "2026-09-08T19:42:00Z",
    reason: "Moved out of halls for Year 2",
  },
  {
    id: "CHG-1002",
    tenantId: "T-010",
    entity: "learner",
    entityId: "S-4001",
    studentId: "S-4001",
    field: "Immigration status",
    from: "BRP (physical card)",
    to: "eVisa — UKVI account",
    by: "Dr. Eleanor Hughes",
    at: "2025-12-04T10:15:00Z",
    reason: "BRPs replaced by eVisas; share code re-checked, expiry 31 Oct 2028 unchanged",
  },
  {
    id: "CHG-1003",
    tenantId: "T-010",
    entity: "learnerDocument",
    entityId: "DOC-1003",
    studentId: "S-4001",
    field: "Document version",
    from: "v1 (CAS_E4G7H2K9P1.pdf)",
    to: "v2 (CAS_E4G7H2K9P1_reissued.pdf)",
    by: "International Admissions",
    at: "2025-08-28T11:20:00Z",
    reason: "Course end date corrected to 30 Jun 2028",
  },
  {
    id: "CHG-1004",
    tenantId: "T-010",
    entity: "learnerDocument",
    entityId: "DOC-1001",
    studentId: "S-4001",
    field: "Document verified",
    to: "Passport (India) v1",
    by: "Dr. Eleanor Hughes",
    at: "2025-09-15T10:40:00Z",
    reason: "Original seen at enrolment",
  },
  {
    id: "CHG-1005",
    tenantId: "T-010",
    entity: "learner",
    entityId: "S-4008",
    studentId: "S-4008",
    field: "Status",
    from: "Active",
    to: "Interrupted",
    by: "Dr. Eleanor Hughes",
    at: "2026-03-02T11:00:00Z",
    reason: "Approved interruption of studies (health) — return Sep 2027",
  },
  {
    id: "CHG-1006",
    tenantId: "T-010",
    entity: "learner",
    entityId: "S-4006",
    studentId: "S-4006",
    field: "Passport no.",
    from: "—",
    to: "••••0442",
    by: "Dr. Eleanor Hughes",
    at: "2026-08-19T09:15:00Z",
    reason: "Captured from passport scan at CAS check",
  },
  {
    id: "CHG-1007",
    tenantId: "T-010",
    entity: "learner",
    entityId: "S-4009",
    studentId: "S-4009",
    field: "Funding",
    from: "Self-funded",
    to: "Employer-sponsored — Northwind Analytics Ltd (100%)",
    by: "Dr. Eleanor Hughes",
    at: "2026-08-30T14:05:00Z",
    reason: "Sponsor letter received",
  },
  {
    id: "CHG-1008",
    tenantId: "T-011",
    entity: "learner",
    entityId: "S-5001",
    studentId: "S-5001",
    field: "Visa expiry",
    from: "2027-06-30",
    to: "2027-12-15",
    by: "Liam O'Connor",
    at: "2026-07-02T01:30:00Z",
    reason: "New CoE issued for the Diploma — visa re-granted",
  },
  {
    id: "CHG-1009",
    tenantId: "T-011",
    entity: "learner",
    entityId: "S-5008",
    studentId: "S-5008",
    field: "Study mode",
    from: "Full-time",
    to: "Part-time",
    by: "Liam O'Connor",
    at: "2026-05-11T03:20:00Z",
    reason: "Student request — now working full-time",
  },
  {
    id: "CHG-1010",
    tenantId: "T-011",
    entity: "learner",
    entityId: "S-5005",
    studentId: "S-5005",
    field: "USI status",
    from: "Unverified",
    to: "Verified",
    by: "Liam O'Connor",
    at: "2025-02-10T23:40:00Z",
    reason: "Checked against the USI Registry",
  },
  {
    id: "CHG-1011",
    tenantId: "T-009",
    entity: "learner",
    entityId: "S-3001",
    studentId: "S-3001",
    field: "Home address",
    from: "Villa 12, Al Barsha 2, Dubai",
    to: "Apt 1406, Marina Gate 1, Dubai Marina",
    by: "Sarah Khan (parent portal)",
    at: "2026-08-25T06:00:00Z",
  },
  {
    id: "CHG-1012",
    tenantId: "T-009",
    entity: "learner",
    entityId: "S-3009",
    studentId: "S-3009",
    field: "Passport no.",
    from: "••••8810",
    to: "••••1023",
    by: "Hannah Clarke",
    at: "2026-06-14T06:45:00Z",
    reason: "Passport renewed — new number",
  },
  {
    id: "CHG-1013",
    tenantId: "T-012",
    entity: "learner",
    entityId: "S-3102",
    studentId: "S-3102",
    field: "NIC",
    from: "—",
    to: "••••1234",
    by: "Mrs. Dilrukshi Gunawardena",
    at: "2026-03-10T04:00:00Z",
    reason: "NIC issued at 16 — birth certificate no. kept on file",
  },
  {
    id: "CHG-1014",
    tenantId: "T-012",
    entity: "learner",
    entityId: "S-3103",
    studentId: "S-3103",
    field: "NIC",
    from: "—",
    to: "••••4112",
    by: "Mrs. Dilrukshi Gunawardena",
    at: "2026-10-28T05:30:00Z",
    reason: "NIC issued at 16",
  },
];
