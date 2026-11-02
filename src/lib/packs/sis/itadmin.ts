/* ── IT administration: account lifecycle and the IT support desk. ───────── */
import type { OutboxMessage } from "./shared";
import type { SignInProvider } from "../foundationData";

/** Provisioning / revocation across connected systems, with audit identity. */
export interface AccountAction {
  id: string;
  tenantId: string;
  subject: string; // person name
  subjectId?: string; // 1StudentID or staff id
  subjectType: "Student" | "Staff" | "Parent";
  kind: "Provisioned" | "Revoked" | "Restored" | "Role changed" | "Password reset";
  reason: string; // "Graduated", "Withdrawn", "Left employment", "New starter"…
  systems: string[]; // "1StudentID", "Microsoft 365", "LMS", "Library"
  by: string;
  at: string;
}

export interface TicketPost {
  by: string;
  at: string;
  text: string;
  /** Internal note — visible to the IT team only. */
  internal?: boolean;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  raisedBy: string;
  raisedByRole: "admin" | "teacher" | "student" | "parent";
  /** Family-operated pupil accounts: the guardian actually using the account. */
  actingAs?: string;
  category:
    | "Account & password"
    | "Access & permissions"
    | "Device / network"
    | "Software"
    | "Other";
  subject: string;
  detail: string;
  priority: "Low" | "Normal" | "High" | "Urgent";
  status: "Open" | "In progress" | "Waiting on user" | "Resolved";
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  slaHours: number;
  thread: TicketPost[];
}

export const TICKET_CATEGORIES: SupportTicket["category"][] = [
  "Account & password",
  "Access & permissions",
  "Device / network",
  "Software",
  "Other",
];
export const TICKET_PRIORITIES: SupportTicket["priority"][] = ["Low", "Normal", "High", "Urgent"];
export const TICKET_STATUSES: SupportTicket["status"][] = [
  "Open",
  "In progress",
  "Waiting on user",
  "Resolved",
];

/** Response-time target by priority (hours). */
export const SLA_HOURS: Record<SupportTicket["priority"], number> = {
  Urgent: 4,
  High: 8,
  Normal: 24,
  Low: 72,
};

/** Demo clock — seeded tickets and messages are measured against this. */
export const DEMO_NOW = "2026-11-02T08:00:00Z";

/* ── Lifecycle reference data ─────────────────────────────────────────────── */

/** Systems an account is created in, by the tenant's sign-in provider. */
export function systemsForProvider(provider: SignInProvider | undefined): string[] {
  const base = ["1StudentID", "LMS", "Library"];
  if (provider === "microsoft") return ["Microsoft 365", ...base];
  if (provider === "google") return ["Google Workspace", ...base];
  return base;
}

/** Where an SSO user resets their own password. */
export const PROVIDER_RESET: Record<SignInProvider, string> = {
  microsoft: "Microsoft self-service reset (aka.ms/sspr)",
  google: "Google account settings (myaccount.google.com → Security)",
  native: "1StudentID reset link by email",
};

/** The day each tenant's accounts were imported by the roster sync. Seeded
 *  learners who started before this date count as already provisioned. */
export const ACCOUNTS_GO_LIVE: Record<string, string> = {
  "T-009": "2026-08-20",
  "T-010": "2026-09-01",
  "T-011": "2026-07-01",
  "T-012": "2026-08-17",
};

/** HR feed: staff joining or leaving (staff not listed here are in post). */
export interface StaffMovement {
  id: string;
  tenantId: string;
  name: string;
  role: string;
  kind: "Joiner" | "Leaver";
  date: string;
}

export const staffMovements: StaffMovement[] = [
  {
    id: "SM-0901",
    tenantId: "T-009",
    name: "Ms. Priya Nair",
    role: "Computer Science teacher",
    kind: "Joiner",
    date: "2026-11-09",
  },
  {
    id: "SM-0902",
    tenantId: "T-009",
    name: "Mr. Peter Holt",
    role: "Music teacher",
    kind: "Leaver",
    date: "2026-07-15",
  },
  {
    id: "SM-1001",
    tenantId: "T-010",
    name: "Dr. Kwame Asante",
    role: "Lecturer, Cyber Security",
    kind: "Joiner",
    date: "2026-11-09",
  },
  {
    id: "SM-1002",
    tenantId: "T-010",
    name: "Mr. Gareth Evans",
    role: "Lecturer, Business",
    kind: "Leaver",
    date: "2026-10-31",
  },
  {
    id: "SM-1003",
    tenantId: "T-010",
    name: "Mr. Owen Hart",
    role: "IT technician",
    kind: "Leaver",
    date: "2026-08-31",
  },
  {
    id: "SM-1101",
    tenantId: "T-011",
    name: "Mr. Josh Taylor",
    role: "Plumbing trainer",
    kind: "Joiner",
    date: "2026-11-16",
  },
  {
    id: "SM-1102",
    tenantId: "T-011",
    name: "Ms. Tara Quinn",
    role: "Hospitality trainer",
    kind: "Leaver",
    date: "2026-10-10",
  },
  {
    id: "SM-1201",
    tenantId: "T-012",
    name: "Mr. Nuwan Rajapaksa",
    role: "ICT teacher",
    kind: "Joiner",
    date: "2026-11-03",
  },
];

/** IT team members who can be assigned tickets, per tenant. */
export const IT_TEAM: Record<string, string[]> = {
  "T-009": ["Ravi Menon", "Lina Saeed"],
  "T-010": ["Owen Pritchard", "Kerry Dale", "Sam Okoye"],
  "T-011": ["Mia Hughes", "Josh Lee"],
  "T-012": ["Kasun Wickramasinghe"],
};

/** Personal contact details held for lookup (parents, and some learners). */
export const DIRECTORY_CONTACTS: Record<string, { email?: string; phone?: string }> = {
  "Sarah Khan": { email: "sarah.khan@gmail.com", phone: "+971 50 412 7781" },
  "Rana Haddad": { email: "rana.haddad@outlook.com", phone: "+971 50 778 1290" },
  "Tom Morgan": { email: "tom.morgan@gmail.com", phone: "+971 55 210 3384" },
  "Meera Iyer": { email: "meera.iyer@gmail.com", phone: "+971 56 902 4471" },
  "Khalid Rahman": { email: "k.rahman@gmail.com", phone: "+971 52 640 1187" },
  "Grace Okafor": { email: "grace.okafor@yahoo.com", phone: "+971 50 330 9012" },
  "Hiro Tanaka": { email: "hiro.tanaka@gmail.com", phone: "+971 58 114 2290" },
  "Neha Shah": { email: "neha.shah@gmail.com", phone: "+971 55 870 6623" },
  "Dilani Perera": { email: "dilani.perera@gmail.com", phone: "+94 77 812 4410" },
  "Ruwan Fernando": { email: "ruwan.f@gmail.com", phone: "+94 77 301 5520" },
  "Chamari Silva": { email: "chamari.silva@gmail.com", phone: "+94 71 455 2093" },
  "Nimali Jayasuriya": { email: "nimali.j@gmail.com", phone: "+94 76 220 8814" },
  "Arjun Mehta": { phone: "+44 7700 900123" },
  "Chen Wei": { phone: "+44 7700 900412" },
  "Daniel Price": { email: "daniel.price@gmail.com", phone: "+44 7700 900877" },
  "Riley Cooper": { phone: "+61 412 555 019" },
  "Tom Nguyen": { phone: "+61 400 118 772" },
};

/* ── Seeds ───────────────────────────────────────────────────────────────── */

export const accountActions: AccountAction[] = [
  // Northbridge University (T-010)
  {
    id: "AA-1001",
    tenantId: "T-010",
    subject: "Fatima Noor",
    subjectId: "S-4006",
    subjectType: "Student",
    kind: "Provisioned",
    reason: "New starter — Sep 2026 intake",
    systems: ["Microsoft 365", "1StudentID", "LMS", "Library"],
    by: "Roster sync (Entra ID)",
    at: "2026-09-14T07:30:00Z",
  },
  {
    id: "AA-1002",
    tenantId: "T-010",
    subject: "Leo Ward",
    subjectId: "S-4007",
    subjectType: "Student",
    kind: "Provisioned",
    reason: "New starter — Sep 2026 intake",
    systems: ["Microsoft 365", "1StudentID", "LMS", "Library"],
    by: "Roster sync (Entra ID)",
    at: "2026-09-14T07:30:00Z",
  },
  {
    id: "AA-1003",
    tenantId: "T-010",
    subject: "Dr. Tom Hartley",
    subjectType: "Staff",
    kind: "Provisioned",
    reason: "New starter — staff",
    systems: ["Microsoft 365", "1StudentID", "LMS", "Library"],
    by: "Dr. Eleanor Hughes",
    at: "2026-09-01T08:15:00Z",
  },
  {
    id: "AA-1004",
    tenantId: "T-010",
    subject: "Mr. Owen Hart",
    subjectType: "Staff",
    kind: "Revoked",
    reason: "Left employment",
    systems: ["Microsoft 365", "1StudentID", "LMS", "Library"],
    by: "Dr. Eleanor Hughes",
    at: "2026-08-31T17:05:00Z",
  },
  {
    id: "AA-1005",
    tenantId: "T-010",
    subject: "Hannah Lloyd",
    subjectId: "S-4091",
    subjectType: "Student",
    kind: "Revoked",
    reason: "Graduated — BSc Computer Science (July 2026)",
    systems: ["Microsoft 365", "LMS", "Library"],
    by: "Roster sync (Entra ID)",
    at: "2026-09-30T02:00:00Z",
  },
  {
    id: "AA-1006",
    tenantId: "T-010",
    subject: "Dr. Aisha Bello",
    subjectType: "Staff",
    kind: "Role changed",
    reason: "Added Programme lead, MSc Data Science",
    systems: ["1StudentID"],
    by: "Dr. Eleanor Hughes",
    at: "2026-10-05T10:20:00Z",
  },
  {
    id: "AA-1007",
    tenantId: "T-010",
    subject: "Callum Reyes",
    subjectId: "S-4092",
    subjectType: "Student",
    kind: "Revoked",
    reason: "Withdrawn — left the programme",
    systems: ["Microsoft 365", "LMS", "Library"],
    by: "Dr. Eleanor Hughes",
    at: "2026-10-16T11:45:00Z",
  },
  // Meridian International School Dubai (T-009)
  {
    id: "AA-0901",
    tenantId: "T-009",
    subject: "Ms. Anjali Menon",
    subjectType: "Staff",
    kind: "Provisioned",
    reason: "New starter — staff",
    systems: ["Microsoft 365", "1StudentID", "LMS", "Library"],
    by: "Hannah Clarke",
    at: "2026-08-24T06:30:00Z",
  },
  {
    id: "AA-0902",
    tenantId: "T-009",
    subject: "Mr. Peter Holt",
    subjectType: "Staff",
    kind: "Revoked",
    reason: "Left employment",
    systems: ["Microsoft 365", "1StudentID", "LMS", "Library"],
    by: "Hannah Clarke",
    at: "2026-07-15T12:00:00Z",
  },
  {
    id: "AA-0903",
    tenantId: "T-009",
    subject: "Leo Brandt",
    subjectId: "S-3091",
    subjectType: "Student",
    kind: "Revoked",
    reason: "Withdrawn — relocated to Abu Dhabi",
    systems: ["Microsoft 365", "LMS", "Library"],
    by: "Hannah Clarke",
    at: "2026-09-30T09:10:00Z",
  },
  {
    id: "AA-0904",
    tenantId: "T-009",
    subject: "Sarah Khan",
    subjectType: "Parent",
    kind: "Password reset",
    reason: "Requested by parent (ticket TKT-0901)",
    systems: ["1StudentID"],
    by: "Ravi Menon",
    at: "2026-11-01T07:40:00Z",
  },
  {
    id: "AA-0905",
    tenantId: "T-009",
    subject: "Zara Khan",
    subjectId: "S-3001",
    subjectType: "Student",
    kind: "Provisioned",
    reason: "Roster sync at go-live",
    systems: ["Microsoft 365", "1StudentID", "LMS", "Library"],
    by: "Roster sync (Entra ID)",
    at: "2026-08-20T03:00:00Z",
  },
  // Harbourside College Sydney (T-011)
  {
    id: "AA-1101",
    tenantId: "T-011",
    subject: "Sakura Tanaka",
    subjectId: "S-5001",
    subjectType: "Student",
    kind: "Provisioned",
    reason: "New starter — Jul 2026 intake",
    systems: ["Google Workspace", "1StudentID", "LMS", "Library"],
    by: "Roster sync (Google)",
    at: "2026-07-13T22:00:00Z",
  },
  {
    id: "AA-1102",
    tenantId: "T-011",
    subject: "Jack Miller",
    subjectId: "S-5091",
    subjectType: "Student",
    kind: "Revoked",
    reason: "Graduated — Certificate III in Carpentry",
    systems: ["Google Workspace", "LMS", "Library"],
    by: "Liam O'Connor",
    at: "2026-07-03T05:30:00Z",
  },
  {
    id: "AA-1103",
    tenantId: "T-011",
    subject: "Ms. Tara Quinn",
    subjectType: "Staff",
    kind: "Revoked",
    reason: "Left employment",
    systems: ["Google Workspace", "1StudentID", "LMS", "Library"],
    by: "Liam O'Connor",
    at: "2026-10-10T06:00:00Z",
  },
  {
    id: "AA-1104",
    tenantId: "T-011",
    subject: "Ms. Kate Sullivan",
    subjectType: "Staff",
    kind: "Role changed",
    reason: "Added Assessor (ICT) role",
    systems: ["1StudentID"],
    by: "Liam O'Connor",
    at: "2026-10-21T01:15:00Z",
  },
  // Meridian International School Colombo (T-012)
  {
    id: "AA-1201",
    tenantId: "T-012",
    subject: "Sasindu Perera",
    subjectId: "S-3105",
    subjectType: "Student",
    kind: "Provisioned",
    reason: "Roster sync at go-live — family-used account (Year 3)",
    systems: ["Microsoft 365", "1StudentID", "LMS", "Library"],
    by: "Roster sync (Entra ID)",
    at: "2026-08-17T02:30:00Z",
  },
  {
    id: "AA-1202",
    tenantId: "T-012",
    subject: "Ms. Ishara Fernando",
    subjectType: "Staff",
    kind: "Provisioned",
    reason: "New starter — staff",
    systems: ["Microsoft 365", "1StudentID", "LMS", "Library"],
    by: "Mrs. Dilrukshi Gunawardena",
    at: "2026-08-17T04:00:00Z",
  },
  {
    id: "AA-1203",
    tenantId: "T-012",
    subject: "Ravindu Silva",
    subjectId: "S-3191",
    subjectType: "Student",
    kind: "Revoked",
    reason: "Withdrawn — transferred to another school",
    systems: ["Microsoft 365", "LMS", "Library"],
    by: "Mrs. Dilrukshi Gunawardena",
    at: "2026-10-05T05:20:00Z",
  },
  {
    id: "AA-1204",
    tenantId: "T-012",
    subject: "Dilani Perera",
    subjectType: "Parent",
    kind: "Password reset",
    reason: "Forgot parent app password",
    systems: ["1StudentID"],
    by: "Kasun Wickramasinghe",
    at: "2026-10-20T04:10:00Z",
  },
];

export const supportTickets: SupportTicket[] = [
  // Northbridge University (T-010)
  {
    id: "TKT-1001",
    tenantId: "T-010",
    raisedBy: "Arjun Mehta",
    raisedByRole: "student",
    category: "Account & password",
    subject: "Can't sign in to Moodle after changing my phone",
    detail:
      "I got a new phone and the Microsoft Authenticator prompt never arrives, so I can't open Moodle or Outlook. Coursework is due Friday.",
    priority: "High",
    status: "In progress",
    assignee: "Owen Pritchard",
    createdAt: "2026-11-01T09:10:00Z",
    updatedAt: "2026-11-01T11:30:00Z",
    slaHours: 8,
    thread: [
      {
        by: "Arjun Mehta",
        at: "2026-11-01T09:10:00Z",
        text: "I got a new phone and the Authenticator prompt never arrives.",
      },
      {
        by: "Owen Pritchard",
        at: "2026-11-01T11:30:00Z",
        text: "Thanks Arjun — we need to re-register your MFA method. Please come to the IT desk in the library with your student card, or reply with a time for a Teams call.",
      },
      {
        by: "Owen Pritchard",
        at: "2026-11-01T11:32:00Z",
        text: "Identity check needed before MFA reset (policy IT-07).",
        internal: true,
      },
    ],
  },
  {
    id: "TKT-1002",
    tenantId: "T-010",
    raisedBy: "Dr. Samuel Reid",
    raisedByRole: "teacher",
    category: "Software",
    subject: "MATLAB licence expired on lab PCs (Room 3.05)",
    detail: "Students get a licence error when opening MATLAB in 3.05. Lab session at 14:00 today.",
    priority: "Normal",
    status: "Open",
    createdAt: "2026-11-02T07:20:00Z",
    updatedAt: "2026-11-02T07:20:00Z",
    slaHours: 24,
    thread: [
      {
        by: "Dr. Samuel Reid",
        at: "2026-11-02T07:20:00Z",
        text: "Students get a licence error when opening MATLAB in 3.05.",
      },
    ],
  },
  {
    id: "TKT-1003",
    tenantId: "T-010",
    raisedBy: "Grace Walker",
    raisedByRole: "student",
    category: "Access & permissions",
    subject: "Library e-journals say 'no access'",
    detail: "Off campus I can't open IEEE Xplore — it says my institution has no access.",
    priority: "Normal",
    status: "Waiting on user",
    assignee: "Kerry Dale",
    createdAt: "2026-10-30T14:00:00Z",
    updatedAt: "2026-10-31T09:00:00Z",
    slaHours: 24,
    thread: [
      {
        by: "Grace Walker",
        at: "2026-10-30T14:00:00Z",
        text: "Off campus I can't open IEEE Xplore.",
      },
      {
        by: "Kerry Dale",
        at: "2026-10-31T09:00:00Z",
        text: "Please sign in through the library search page (not the publisher site) and send a screenshot if it still fails.",
      },
    ],
  },
  {
    id: "TKT-1004",
    tenantId: "T-010",
    raisedBy: "Fatima Noor",
    raisedByRole: "student",
    category: "Device / network",
    subject: "eduroam won't connect on Android",
    detail: "My phone keeps asking for a certificate.",
    priority: "Low",
    status: "Resolved",
    assignee: "Sam Okoye",
    createdAt: "2026-10-27T10:00:00Z",
    updatedAt: "2026-10-27T15:20:00Z",
    slaHours: 72,
    thread: [
      {
        by: "Fatima Noor",
        at: "2026-10-27T10:00:00Z",
        text: "My phone keeps asking for a certificate.",
      },
      {
        by: "Sam Okoye",
        at: "2026-10-27T15:20:00Z",
        text: "Use the geteduroam app — it installs the certificate for you. Closing this; reply if it still fails.",
      },
    ],
  },
  {
    id: "TKT-1005",
    tenantId: "T-010",
    raisedBy: "Dr. Aisha Bello",
    raisedByRole: "teacher",
    category: "Device / network",
    subject: "Lecture capture not recording in Room 2.14",
    detail: "Panopto shows 'offline' for 2.14. I lecture there at 11:00.",
    priority: "Urgent",
    status: "Open",
    createdAt: "2026-11-02T06:45:00Z",
    updatedAt: "2026-11-02T06:45:00Z",
    slaHours: 4,
    thread: [
      {
        by: "Dr. Aisha Bello",
        at: "2026-11-02T06:45:00Z",
        text: "Panopto shows 'offline' for 2.14. I lecture there at 11:00.",
      },
    ],
  },
  // Meridian International School Dubai (T-009)
  {
    id: "TKT-0901",
    tenantId: "T-009",
    raisedBy: "Sarah Khan",
    raisedByRole: "parent",
    category: "Account & password",
    subject: "Locked out of the parent app",
    detail: "I tried my password too many times and now the app says my account is locked.",
    priority: "High",
    status: "In progress",
    assignee: "Ravi Menon",
    createdAt: "2026-10-31T16:00:00Z",
    updatedAt: "2026-11-01T07:40:00Z",
    slaHours: 8,
    thread: [
      {
        by: "Sarah Khan",
        at: "2026-10-31T16:00:00Z",
        text: "I tried my password too many times and now the app says my account is locked.",
      },
      {
        by: "Ravi Menon",
        at: "2026-11-01T07:40:00Z",
        text: "Hi Mrs Khan, I've unlocked the account and sent a reset link to your email. Please let me know once you're back in.",
      },
    ],
  },
  {
    id: "TKT-0902",
    tenantId: "T-009",
    raisedBy: "Mr. James Carter",
    raisedByRole: "teacher",
    category: "Device / network",
    subject: "Projector in Lab 3 keeps disconnecting",
    detail: "The HDMI signal drops every few minutes during lessons.",
    priority: "Normal",
    status: "Open",
    createdAt: "2026-11-01T05:30:00Z",
    updatedAt: "2026-11-01T05:30:00Z",
    slaHours: 24,
    thread: [
      {
        by: "Mr. James Carter",
        at: "2026-11-01T05:30:00Z",
        text: "The HDMI signal drops every few minutes during lessons.",
      },
    ],
  },
  {
    id: "TKT-0903",
    tenantId: "T-009",
    raisedBy: "Zara Khan",
    raisedByRole: "student",
    category: "Software",
    subject: "Teams assignment won't upload",
    detail: "Upload stalls at 99% for my physics report.",
    priority: "Normal",
    status: "Resolved",
    assignee: "Lina Saeed",
    createdAt: "2026-10-28T08:00:00Z",
    updatedAt: "2026-10-28T10:15:00Z",
    slaHours: 24,
    thread: [
      { by: "Zara Khan", at: "2026-10-28T08:00:00Z", text: "Upload stalls at 99%." },
      {
        by: "Lina Saeed",
        at: "2026-10-28T10:15:00Z",
        text: "The file was over 250 MB. Save it as PDF and upload again — that should work.",
      },
    ],
  },
  // Harbourside College Sydney (T-011)
  {
    id: "TKT-1101",
    tenantId: "T-011",
    raisedBy: "Riley Cooper",
    raisedByRole: "student",
    category: "Access & permissions",
    subject: "Can't see my placement logbook",
    detail: "The logbook link in my apprenticeship page shows a blank screen.",
    priority: "Normal",
    status: "Waiting on user",
    assignee: "Mia Hughes",
    createdAt: "2026-10-29T00:30:00Z",
    updatedAt: "2026-10-29T04:00:00Z",
    slaHours: 24,
    thread: [
      {
        by: "Riley Cooper",
        at: "2026-10-29T00:30:00Z",
        text: "The logbook link shows a blank screen.",
      },
      {
        by: "Mia Hughes",
        at: "2026-10-29T04:00:00Z",
        text: "Which browser are you using? Please try Chrome and let us know.",
      },
    ],
  },
  {
    id: "TKT-1102",
    tenantId: "T-011",
    raisedBy: "Ms. Kate Sullivan",
    raisedByRole: "teacher",
    category: "Software",
    subject: "Install Cisco Packet Tracer in room B12",
    detail: "Needed for the Cert IV networking unit from next week.",
    priority: "Low",
    status: "Open",
    createdAt: "2026-10-27T23:00:00Z",
    updatedAt: "2026-10-27T23:00:00Z",
    slaHours: 72,
    thread: [
      {
        by: "Ms. Kate Sullivan",
        at: "2026-10-27T23:00:00Z",
        text: "Needed for the Cert IV networking unit from next week.",
      },
    ],
  },
  {
    id: "TKT-1103",
    tenantId: "T-011",
    raisedBy: "Ishaan Kapoor",
    raisedByRole: "student",
    category: "Account & password",
    subject: "Google asks for a code I can't receive",
    detail: "The verification code goes to my old Indian number.",
    priority: "High",
    status: "In progress",
    assignee: "Josh Lee",
    createdAt: "2026-11-02T05:00:00Z",
    updatedAt: "2026-11-02T05:40:00Z",
    slaHours: 8,
    thread: [
      {
        by: "Ishaan Kapoor",
        at: "2026-11-02T05:00:00Z",
        text: "The verification code goes to my old Indian number.",
      },
      {
        by: "Josh Lee",
        at: "2026-11-02T05:40:00Z",
        text: "We'll issue backup codes. Bring your student card to Student Hub, level 2.",
      },
    ],
  },
  // Meridian International School Colombo (T-012)
  {
    id: "TKT-1201",
    tenantId: "T-012",
    raisedBy: "Sasindu Perera",
    raisedByRole: "student",
    actingAs: "Dilani Perera",
    category: "Software",
    subject: "Teams homework won't open on our iPad",
    detail: "Sasindu's homework files open as a blank page in Teams on the iPad.",
    priority: "Normal",
    status: "Waiting on user",
    assignee: "Kasun Wickramasinghe",
    createdAt: "2026-10-31T03:00:00Z",
    updatedAt: "2026-11-02T03:15:00Z",
    slaHours: 24,
    thread: [
      {
        by: "Dilani Perera",
        at: "2026-10-31T03:00:00Z",
        text: "Sasindu's homework files open as a blank page in Teams on the iPad.",
      },
      {
        by: "Kasun Wickramasinghe",
        at: "2026-11-02T03:15:00Z",
        text: "Please update the Teams app from the App Store and sign out and back in. Let us know if it still shows blank.",
      },
    ],
  },
  {
    id: "TKT-1202",
    tenantId: "T-012",
    raisedBy: "Mr. Sanjeewa Perera",
    raisedByRole: "teacher",
    category: "Device / network",
    subject: "Wi-Fi drops in the science block",
    detail: "Lab tablets lose Wi-Fi every period in Labs 1 and 2.",
    priority: "High",
    status: "Open",
    createdAt: "2026-10-30T04:30:00Z",
    updatedAt: "2026-10-30T04:30:00Z",
    slaHours: 8,
    thread: [
      {
        by: "Mr. Sanjeewa Perera",
        at: "2026-10-30T04:30:00Z",
        text: "Lab tablets lose Wi-Fi every period in Labs 1 and 2.",
      },
    ],
  },
  {
    id: "TKT-1203",
    tenantId: "T-012",
    raisedBy: "Nethmi Perera",
    raisedByRole: "student",
    category: "Account & password",
    subject: "Forgot my password",
    detail: "I can't remember my school password.",
    priority: "Normal",
    status: "Resolved",
    assignee: "Kasun Wickramasinghe",
    createdAt: "2026-10-26T02:00:00Z",
    updatedAt: "2026-10-26T03:10:00Z",
    slaHours: 24,
    thread: [
      { by: "Nethmi Perera", at: "2026-10-26T02:00:00Z", text: "I can't remember my password." },
      {
        by: "Kasun Wickramasinghe",
        at: "2026-10-26T03:10:00Z",
        text: "Use 'Forgot password' on the Microsoft sign-in page — your phone number is registered. Done!",
      },
    ],
  },
];

/** Seed notifications (merged into the shared outbox by the store). */
export const seedOutbox: OutboxMessage[] = [
  // T-009 — Meridian Dubai
  {
    id: "MSG-1001",
    tenantId: "T-009",
    at: "2026-10-26T06:00:00Z",
    channel: "Email",
    to: "Sarah Khan (sarah.khan@gmail.com)",
    subject: "Term 1 instalment 2 is due on 5 Nov",
    source: "Fees · reminders",
    status: "Sent",
  },
  {
    id: "MSG-1002",
    tenantId: "T-009",
    at: "2026-10-26T06:00:00Z",
    channel: "SMS",
    to: "Tom Morgan (+971 55 210 3384)",
    subject: "Fee reminder: Term 2 instalment due 5 Nov",
    source: "Fees · reminders",
    status: "Sent",
  },
  {
    id: "MSG-1003",
    tenantId: "T-009",
    at: "2026-10-29T10:15:00Z",
    channel: "Email",
    to: "Farah Siddiqui (farah.s@outlook.com)",
    subject: "Thanks for your enquiry — Year 7 places for 2027",
    source: "Admissions · enquiry",
    status: "Sent",
  },
  {
    id: "MSG-1004",
    tenantId: "T-009",
    at: "2026-11-01T09:00:00Z",
    channel: "WhatsApp",
    to: "Rana Haddad (+971 50 778 1290)",
    subject: "Year 11 mock exam timetable published",
    source: "Exams · timetable",
    status: "Sent",
  },
  {
    id: "MSG-1005",
    tenantId: "T-009",
    at: "2026-11-01T09:00:00Z",
    channel: "App",
    to: "Omar Haddad",
    subject: "Your mock exam timetable is ready",
    source: "Exams · timetable",
    status: "Sent",
  },
  {
    id: "MSG-1006",
    tenantId: "T-009",
    at: "2026-11-02T05:30:00Z",
    channel: "SMS",
    to: "Khalid Rahman (+971 52 640 1187)",
    subject: "Fee overdue — please pay by 9 Nov",
    body: "Carrier rejected the message: number not reachable.",
    source: "Fees · reminders",
    status: "Failed",
  },
  {
    id: "MSG-1007",
    tenantId: "T-009",
    at: "2026-11-01T07:40:00Z",
    channel: "Email",
    to: "Sarah Khan (sarah.khan@gmail.com)",
    subject: "Reset your 1StudentID password",
    source: "IT · account",
    relatedId: "TKT-0901",
    status: "Sent",
  },
  // T-010 — Northbridge
  {
    id: "MSG-1008",
    tenantId: "T-010",
    at: "2026-10-27T08:00:00Z",
    channel: "Email",
    to: "Arjun Mehta (arjun.mehta@northbridge.ac.uk)",
    subject: "Semester 1 exam timetable is live",
    source: "Exams · timetable",
    status: "Sent",
  },
  {
    id: "MSG-1009",
    tenantId: "T-010",
    at: "2026-10-27T08:00:00Z",
    channel: "Email",
    to: "Grace Walker (grace.walker@northbridge.ac.uk)",
    subject: "Semester 1 exam timetable is live",
    source: "Exams · timetable",
    status: "Sent",
  },
  {
    id: "MSG-1010",
    tenantId: "T-010",
    at: "2026-10-28T13:40:00Z",
    channel: "Email",
    to: "Isabelle Fox (isabelle.fox@northbridge.ac.uk)",
    subject: "Your interruption of study request was approved",
    source: "Requests · decision",
    status: "Sent",
  },
  {
    id: "MSG-1011",
    tenantId: "T-010",
    at: "2026-10-30T11:05:00Z",
    channel: "Email",
    to: "Priyanka Das (priyanka.das@gmail.com)",
    subject: "MSc Data Science — thanks for your enquiry",
    source: "Admissions · enquiry",
    status: "Sent",
  },
  {
    id: "MSG-1012",
    tenantId: "T-010",
    at: "2026-11-01T11:30:00Z",
    channel: "Email",
    to: "Arjun Mehta (arjun.mehta@northbridge.ac.uk)",
    subject: "Re: [TKT-1001] Can't sign in to Moodle after changing my phone",
    source: "IT · support desk",
    relatedId: "TKT-1001",
    status: "Sent",
  },
  {
    id: "MSG-1013",
    tenantId: "T-010",
    at: "2026-11-01T18:00:00Z",
    channel: "SMS",
    to: "Chen Wei (+44 7700 900412)",
    subject: "Tuition instalment due 6 Nov",
    source: "Fees · reminders",
    status: "Sent",
  },
  {
    id: "MSG-1014",
    tenantId: "T-010",
    at: "2026-11-02T06:00:00Z",
    channel: "Email",
    to: "Daniel Price (daniel.price@gmail.com)",
    subject: "Your Northbridge account is being set up",
    source: "IT · account",
    status: "Queued",
  },
  {
    id: "MSG-1015",
    tenantId: "T-010",
    at: "2026-10-31T09:00:00Z",
    channel: "Email",
    to: "Mr. Gareth Evans",
    subject: "Leaving Northbridge: what happens to your accounts",
    source: "IT · account",
    status: "Sent",
  },
  // T-011 — Harbourside
  {
    id: "MSG-1016",
    tenantId: "T-011",
    at: "2026-10-26T22:00:00Z",
    channel: "SMS",
    to: "Riley Cooper (+61 412 555 019)",
    subject: "Reminder: Term 4 fees are due",
    source: "Fees · reminders",
    status: "Sent",
  },
  {
    id: "MSG-1017",
    tenantId: "T-011",
    at: "2026-10-29T03:00:00Z",
    channel: "Email",
    to: "Ishaan Kapoor (ishaan.k@harbourside.edu.au)",
    subject: "Semester 2 exam timetable",
    source: "Exams · timetable",
    status: "Sent",
  },
  {
    id: "MSG-1018",
    tenantId: "T-011",
    at: "2026-10-30T01:30:00Z",
    channel: "Email",
    to: "Mei Lin Chen (meilin.chen@qq.com)",
    subject: "Diploma of IT — course guide",
    source: "Admissions · enquiry",
    status: "Sent",
  },
  {
    id: "MSG-1019",
    tenantId: "T-011",
    at: "2026-11-01T23:00:00Z",
    channel: "SMS",
    to: "Tom Nguyen (+61 400 118 772)",
    subject: "Fees overdue — a payment plan is available",
    body: "Gateway timeout from SMS provider.",
    source: "Fees · reminders",
    status: "Failed",
  },
  {
    id: "MSG-1020",
    tenantId: "T-011",
    at: "2026-11-02T02:10:00Z",
    channel: "Email",
    to: "Ruby Evans (ruby.e@harbourside.edu.au)",
    subject: "Your change of study mode request was approved",
    source: "Requests · decision",
    status: "Sent",
  },
  {
    id: "MSG-1021",
    tenantId: "T-011",
    at: "2026-11-02T04:00:00Z",
    channel: "App",
    to: "Lachlan Murphy",
    subject: "Exam room changed to B204",
    source: "Exams · timetable",
    status: "Sent",
  },
  // T-012 — Meridian Colombo
  {
    id: "MSG-1022",
    tenantId: "T-012",
    at: "2026-10-27T03:30:00Z",
    channel: "Email",
    to: "Dilani Perera (dilani.perera@gmail.com)",
    subject: "Term 1 fees — balance reminder",
    source: "Fees · reminders",
    status: "Sent",
  },
  {
    id: "MSG-1023",
    tenantId: "T-012",
    at: "2026-10-28T05:00:00Z",
    channel: "WhatsApp",
    to: "Ruwan Fernando (+94 77 301 5520)",
    subject: "A/L mock exam timetable",
    source: "Exams · timetable",
    status: "Sent",
  },
  {
    id: "MSG-1024",
    tenantId: "T-012",
    at: "2026-10-30T07:45:00Z",
    channel: "Email",
    to: "Chamari Silva (chamari.silva@gmail.com)",
    subject: "Leave request for Tharushi approved",
    source: "Requests · decision",
    status: "Sent",
  },
  {
    id: "MSG-1025",
    tenantId: "T-012",
    at: "2026-11-01T10:00:00Z",
    channel: "Email",
    to: "Nadeesha Wijesinghe (nadeesha.w@gmail.com)",
    subject: "Year 1 admissions 2027 — enquiry received",
    source: "Admissions · enquiry",
    status: "Sent",
  },
  {
    id: "MSG-1026",
    tenantId: "T-012",
    at: "2026-11-02T03:15:00Z",
    channel: "Email",
    to: "Dilani Perera (dilani.perera@gmail.com)",
    subject: "Re: [TKT-1201] Teams homework won't open on our iPad",
    source: "IT · support desk",
    relatedId: "TKT-1201",
    status: "Sent",
  },
  {
    id: "MSG-1027",
    tenantId: "T-012",
    at: "2026-11-02T06:30:00Z",
    channel: "SMS",
    to: "Nimali Jayasuriya (+94 76 220 8814)",
    subject: "Fee reminder: Term 1 balance due 10 Nov",
    source: "Fees · reminders",
    status: "Sent",
  },
];
