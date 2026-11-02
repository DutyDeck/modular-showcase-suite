/* ── Alumni: graduates keep their 1StudentID for life. ────────────────────── */

/** Graduated learners stay on the platform for life — the 1StudentID is permanent. */
export interface AlumniRecord {
  id: string;
  tenantId: string;
  studentId: string;
  graduatedOn: string;
  award: string;
  classification?: string;
  contactConsent: boolean;
  currentEmployer?: string;
  currentRole?: string;
  country?: string;
  mentor?: boolean;
  /** Verified credential links the graduate has shared (employer, embassy…). */
  credentialShares: { id: string; to: string; at: string; code: string; purpose?: string }[];
  /** Name / email for alumni migrated from a previous system (no learner row). */
  name?: string;
  email?: string;
  /** "Migrated" from the legacy system, or "Moved" from a Graduated learner. */
  source?: "Migrated" | "Moved";
  /** Events the graduate was invited to. */
  invites?: { event: string; date: string; at: string }[];
  /** Mentoring requests from current students (mentors only). */
  mentoringRequests?: MentoringRequest[];
}

export interface MentoringRequest {
  id: string;
  studentId: string;
  studentName: string;
  at: string;
  topic: string;
  status: "Requested" | "Accepted" | "Declined";
}

/** Alumni events and talks (read-only seed — shown to students and admins). */
export interface AlumniEvent {
  id: string;
  tenantId: string;
  title: string;
  date: string;
  format: "On campus" | "Online" | "Hybrid";
  host: string;
  blurb: string;
}

export const alumniEvents: AlumniEvent[] = [
  {
    id: "AEV-1001",
    tenantId: "T-010",
    title: "Careers in fintech — alumni panel",
    date: "2026-11-18",
    format: "Hybrid",
    host: "Priya Shah (Monzo) & Emily Carter (Shopify)",
    blurb: "Three graduates on landing a first tech role and what they'd do differently.",
  },
  {
    id: "AEV-1002",
    tenantId: "T-010",
    title: "Data science CV clinic",
    date: "2026-12-02",
    format: "Online",
    host: "Rahul Verma (Infosys)",
    blurb: "Bring your CV — 15-minute one-to-one reviews with MSc alumni.",
  },
  {
    id: "AEV-1003",
    tenantId: "T-010",
    title: "Winter alumni reunion & networking evening",
    date: "2026-12-11",
    format: "On campus",
    host: "Alumni Relations",
    blurb: "Final-year students welcome. Meet graduates from 2021–2026.",
  },
  {
    id: "AEV-1101",
    tenantId: "T-011",
    title: "Trades & tech alumni breakfast",
    date: "2026-11-27",
    format: "On campus",
    host: "Alumni Office",
    blurb: "Meet employers who hire Harbourside graduates.",
  },
];

const share = (id: string, to: string, at: string, code: string, purpose?: string) => ({
  id,
  to,
  at,
  code,
  purpose,
});

export const alumniRecords: AlumniRecord[] = [
  // ── Northbridge University (T-010) — migrated from the legacy SITS export ──
  {
    id: "ALU-1001",
    tenantId: "T-010",
    studentId: "S-4801",
    name: "Priya Shah",
    email: "priya.shah@alumni.northbridge.ac.uk",
    graduatedOn: "2025-07-15",
    award: "BSc (Hons) Computer Science",
    classification: "First",
    contactConsent: true,
    currentEmployer: "Monzo",
    currentRole: "Software Engineer",
    country: "United Kingdom",
    mentor: true,
    source: "Migrated",
    credentialShares: [
      share(
        "CS-1001",
        "Monzo HR (pre-employment screening)",
        "2025-08-02T10:20:00Z",
        "NBU-7KQ3-2FXA",
        "Employment",
      ),
    ],
    mentoringRequests: [
      {
        id: "MR-1001",
        studentId: "S-4002",
        studentName: "Grace Walker",
        at: "2026-10-12T17:40:00Z",
        topic: "Interview prep for fintech summer internships",
        status: "Accepted",
      },
    ],
  },
  {
    id: "ALU-1002",
    tenantId: "T-010",
    studentId: "S-4802",
    name: "Oliver Grant",
    email: "oliver.grant@alumni.northbridge.ac.uk",
    graduatedOn: "2025-07-15",
    award: "BSc (Hons) Computer Science",
    classification: "Upper Second (2:1)",
    contactConsent: true,
    currentEmployer: "BAE Systems",
    currentRole: "Graduate Engineer",
    country: "United Kingdom",
    mentor: false,
    source: "Migrated",
    credentialShares: [],
  },
  {
    id: "ALU-1003",
    tenantId: "T-010",
    studentId: "S-4803",
    name: "Rahul Verma",
    email: "rahul.verma@alumni.northbridge.ac.uk",
    graduatedOn: "2025-11-20",
    award: "MSc Data Science",
    classification: "Distinction",
    contactConsent: true,
    currentEmployer: "Infosys",
    currentRole: "Data Scientist",
    country: "India",
    mentor: true,
    source: "Migrated",
    credentialShares: [
      share(
        "CS-1002",
        "UK Home Office (Graduate visa)",
        "2025-12-04T09:00:00Z",
        "NBU-3PLM-8RTE",
        "Visa",
      ),
      share(
        "CS-1003",
        "Infosys Talent Acquisition",
        "2026-02-11T14:30:00Z",
        "NBU-9WQZ-4HCB",
        "Employment",
      ),
    ],
  },
  {
    id: "ALU-1004",
    tenantId: "T-010",
    studentId: "S-4804",
    name: "Amara Okafor",
    email: "amara.okafor@alumni.northbridge.ac.uk",
    graduatedOn: "2024-07-16",
    award: "BSc (Hons) Business Management",
    classification: "Upper Second (2:1)",
    contactConsent: true,
    currentEmployer: "Deloitte",
    currentRole: "Consultant",
    country: "Nigeria",
    mentor: true,
    source: "Migrated",
    credentialShares: [],
  },
  {
    id: "ALU-1005",
    tenantId: "T-010",
    studentId: "S-4805",
    name: "Liu Yang",
    email: "liu.yang@alumni.northbridge.ac.uk",
    graduatedOn: "2024-11-21",
    award: "MSc Data Science",
    classification: "Merit",
    contactConsent: false,
    currentEmployer: "Tencent",
    currentRole: "Machine Learning Engineer",
    country: "China",
    mentor: false,
    source: "Migrated",
    credentialShares: [
      share(
        "CS-1004",
        "China Service Center for Scholarly Exchange",
        "2025-01-09T08:15:00Z",
        "NBU-2XNV-6KDP",
        "Degree recognition",
      ),
    ],
  },
  {
    id: "ALU-1006",
    tenantId: "T-010",
    studentId: "S-4806",
    name: "Hannah Brooks",
    email: "hannah.brooks@alumni.northbridge.ac.uk",
    graduatedOn: "2023-07-18",
    award: "BSc (Hons) Computer Science",
    classification: "Lower Second (2:2)",
    contactConsent: true,
    currentEmployer: "NHS Digital",
    currentRole: "Analyst",
    country: "United Kingdom",
    mentor: false,
    source: "Migrated",
    credentialShares: [],
  },
  {
    id: "ALU-1007",
    tenantId: "T-010",
    studentId: "S-4807",
    name: "Yusuf Al-Amin",
    email: "yusuf.alamin@alumni.northbridge.ac.uk",
    graduatedOn: "2023-11-22",
    award: "MSc Data Science",
    classification: "Distinction",
    contactConsent: true,
    currentEmployer: "Emirates Group",
    currentRole: "Lead Data Engineer",
    country: "United Arab Emirates",
    mentor: true,
    source: "Migrated",
    credentialShares: [
      share(
        "CS-1005",
        "UAE Ministry of Education (equivalency)",
        "2024-01-15T11:40:00Z",
        "NBU-5RJT-1MWS",
        "Degree recognition",
      ),
    ],
  },
  {
    id: "ALU-1008",
    tenantId: "T-010",
    studentId: "S-4808",
    name: "Sophie Laurent",
    email: "sophie.laurent@alumni.northbridge.ac.uk",
    graduatedOn: "2022-07-19",
    award: "BSc (Hons) Business Management",
    classification: "First",
    contactConsent: true,
    currentEmployer: "L'Oréal",
    currentRole: "Brand Manager",
    country: "France",
    mentor: false,
    source: "Migrated",
    credentialShares: [],
  },
  {
    id: "ALU-1009",
    tenantId: "T-010",
    studentId: "S-4809",
    name: "James Whitfield",
    email: "james.whitfield@alumni.northbridge.ac.uk",
    graduatedOn: "2022-07-19",
    award: "BSc (Hons) Computer Science",
    classification: "Upper Second (2:1)",
    contactConsent: false,
    country: "United Kingdom",
    mentor: false,
    source: "Migrated",
    credentialShares: [],
  },
  {
    id: "ALU-1010",
    tenantId: "T-010",
    studentId: "S-4810",
    name: "Bilal Qureshi",
    email: "bilal.qureshi@alumni.northbridge.ac.uk",
    graduatedOn: "2021-11-24",
    award: "MSc Data Science",
    classification: "Merit",
    contactConsent: true,
    currentEmployer: "Careem",
    currentRole: "Head of Analytics",
    country: "Pakistan",
    mentor: true,
    source: "Migrated",
    credentialShares: [],
  },
  {
    id: "ALU-1011",
    tenantId: "T-010",
    studentId: "S-4811",
    name: "Emily Carter",
    email: "emily.carter@alumni.northbridge.ac.uk",
    graduatedOn: "2021-07-20",
    award: "BSc (Hons) Business Management",
    classification: "Upper Second (2:1)",
    contactConsent: true,
    currentEmployer: "Shopify",
    currentRole: "Product Manager",
    country: "Canada",
    mentor: true,
    source: "Migrated",
    credentialShares: [
      share(
        "CS-1006",
        "Shopify People Team",
        "2026-03-03T16:00:00Z",
        "NBU-8CVB-7NQL",
        "Employment",
      ),
    ],
  },
  {
    id: "ALU-1012",
    tenantId: "T-010",
    studentId: "S-4812",
    name: "Kwame Mensah",
    email: "kwame.mensah@alumni.northbridge.ac.uk",
    graduatedOn: "2024-07-16",
    award: "BSc (Hons) Computer Science",
    classification: "First",
    contactConsent: true,
    currentEmployer: "Google",
    currentRole: "Site Reliability Engineer",
    country: "Ireland",
    mentor: true,
    source: "Migrated",
    credentialShares: [],
  },
  {
    id: "ALU-1013",
    tenantId: "T-010",
    studentId: "S-4813",
    name: "Anna Kowalczyk",
    email: "anna.kowalczyk@alumni.northbridge.ac.uk",
    graduatedOn: "2026-07-14",
    award: "BSc (Hons) Computer Science",
    classification: "Upper Second (2:1)",
    contactConsent: true,
    currentEmployer: "SAP",
    currentRole: "Associate Developer",
    country: "Germany",
    mentor: false,
    source: "Moved",
    credentialShares: [
      share(
        "CS-1007",
        "SAP Graduate Recruitment",
        "2026-08-21T09:30:00Z",
        "NBU-4TYH-3GZK",
        "Employment",
      ),
    ],
  },
  {
    id: "ALU-1014",
    tenantId: "T-010",
    studentId: "S-4814",
    name: "Tomás Rivera",
    email: "tomas.rivera@alumni.northbridge.ac.uk",
    graduatedOn: "2026-07-14",
    award: "BSc (Hons) Business Management",
    classification: "Lower Second (2:2)",
    contactConsent: false,
    country: "Spain",
    mentor: false,
    source: "Moved",
    credentialShares: [],
  },
  // ── Harbourside College Sydney (T-011) ──
  {
    id: "ALU-1101",
    tenantId: "T-011",
    studentId: "S-5801",
    name: "Jack Thompson",
    email: "jack.thompson@alumni.harbourside.edu.au",
    graduatedOn: "2025-12-12",
    award: "Diploma of Information Technology",
    contactConsent: true,
    currentEmployer: "Telstra",
    currentRole: "Network Technician",
    country: "Australia",
    mentor: true,
    source: "Migrated",
    credentialShares: [],
  },
  {
    id: "ALU-1102",
    tenantId: "T-011",
    studentId: "S-5802",
    name: "Mai Nguyen",
    email: "mai.nguyen@alumni.harbourside.edu.au",
    graduatedOn: "2025-12-12",
    award: "Certificate IV in Ageing Support",
    contactConsent: true,
    currentEmployer: "Bupa Aged Care",
    currentRole: "Care Coordinator",
    country: "Australia",
    mentor: false,
    source: "Migrated",
    credentialShares: [
      share(
        "CS-1101",
        "AHPRA registration check",
        "2026-01-20T03:00:00Z",
        "HSC-6PDR-2LMX",
        "Registration",
      ),
    ],
  },
  {
    id: "ALU-1103",
    tenantId: "T-011",
    studentId: "S-5803",
    name: "Arjun Singh",
    email: "arjun.singh@alumni.harbourside.edu.au",
    graduatedOn: "2024-12-13",
    award: "Bachelor of Information Technology",
    classification: "Distinction",
    contactConsent: true,
    currentEmployer: "Atlassian",
    currentRole: "Software Engineer",
    country: "Australia",
    mentor: true,
    source: "Migrated",
    credentialShares: [],
  },
  {
    id: "ALU-1104",
    tenantId: "T-011",
    studentId: "S-5804",
    name: "Hemi Walker",
    email: "hemi.walker@alumni.harbourside.edu.au",
    graduatedOn: "2024-06-28",
    award: "Certificate III in Electrotechnology",
    contactConsent: false,
    currentEmployer: "Self-employed",
    currentRole: "Licensed Electrician",
    country: "New Zealand",
    mentor: false,
    source: "Migrated",
    credentialShares: [],
  },
];
