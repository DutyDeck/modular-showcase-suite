/* ── Admissions CRM completion: counsellors, targets, follow-ups. ──────────
 * Enquiries ARE applications at stage "Enquiry" (see opsData Application) —
 * there is no second pipeline. Follow-ups live on the application. */
import type { Learner } from "../foundationData";
import type { Application } from "../opsData";

export interface CounsellorTarget {
  id: string;
  tenantId: string;
  intake: string; // matches Application.intake
  /** Programme / year group / qualification label (matches Application.target), or "All". */
  target: string;
  counsellor: string;
  goal: number; // registrations
  branch?: string;
}

/** Counsellors per tenant and who is on duty (receives auto-assigned walk-ins). */
export interface CounsellorRota {
  id: string; // = tenantId
  tenantId: string;
  counsellors: string[];
  onDuty: string;
}

export type EnquiryChannel = NonNullable<Application["channel"]>;

export const ENQUIRY_CHANNELS: EnquiryChannel[] = [
  "Walk-in",
  "Phone",
  "Web form",
  "Exhibition",
  "Email",
  "WhatsApp",
  "Agent",
];

/** How a capture channel maps onto the older Application.source field. */
export const CHANNEL_SOURCE: Record<EnquiryChannel, Application["source"]> = {
  "Walk-in": "Direct",
  Phone: "Direct",
  "Web form": "Website",
  Exhibition: "Open day",
  Email: "Direct",
  WhatsApp: "Direct",
  Agent: "Agent",
};

/** Front desks / offices that take enquiries, per tenant. */
export const CRM_BRANCHES: Record<string, string[]> = {
  "T-009": ["Al Barsha campus", "Dubai Hills info centre"],
  "T-010": ["Main campus", "London centre", "International office"],
  "T-011": ["Sydney CBD", "Parramatta"],
  "T-012": ["Colombo campus"],
};

/** Country calling code by region (enquiry phone numbers). */
export const DIAL_CODES: Record<string, string> = {
  UK: "+44",
  LK: "+94",
  AU: "+61",
  AE: "+971",
  SA: "+966",
  QA: "+974",
  IN: "+91",
  SG: "+65",
  MY: "+60",
  GLOBAL: "+",
};

/* ── Matching helpers ────────────────────────────────────────────────────── */

export const normName = (s?: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normEmail = (s?: string) => (s ?? "").trim().toLowerCase();

/** Last 9 digits — "+44 7700 900461", "07700900461" and "0044…" all match. */
export const normPhone = (s?: string) => {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length >= 7 ? d.slice(-9) : "";
};

export const normId = (s?: string) => (s ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();

export interface DuplicateProbe {
  name: string;
  dob?: string;
  email?: string;
  phone?: string;
  officialIds?: Record<string, string>;
}

export type DuplicateMatch =
  | { kind: "application"; app: Application; reasons: string[] }
  | { kind: "learner"; learner: Learner; reasons: string[] };

function idHits(a?: Record<string, string>, b?: Record<string, string>) {
  if (!a || !b) return false;
  return Object.entries(a).some(([k, v]) => normId(v).length >= 5 && normId(b[k]) === normId(v));
}

/**
 * Duplicate check for an enquiry / application.
 *  • applications in THIS tenant: official id, email, phone, or name + DOB
 *  • learners on the WHOLE platform: official id, email, or name + DOB
 * `self` (an existing application) is excluded, as is the learner it enrolled as.
 */
export function findDuplicates(
  probe: DuplicateProbe,
  tenantApps: Application[],
  allLearners: Learner[],
  self?: Pick<Application, "id" | "studentId">,
): DuplicateMatch[] {
  const name = normName(probe.name);
  const email = normEmail(probe.email);
  const phone = normPhone(probe.phone);
  const nameDob = (n: string, dob?: string) =>
    !!name && !!probe.dob && !!dob && normName(n) === name && dob === probe.dob;

  const out: DuplicateMatch[] = [];
  for (const a of tenantApps) {
    if (a.id === self?.id) continue;
    const reasons: string[] = [];
    if (idHits(probe.officialIds, a.officialIds)) reasons.push("Official ID");
    if (email && normEmail(a.email) === email) reasons.push("Email");
    if (phone && normPhone(a.phone) === phone) reasons.push("Phone");
    if (nameDob(a.applicantName, a.dob)) reasons.push("Name + date of birth");
    if (reasons.length) out.push({ kind: "application", app: a, reasons });
  }
  for (const l of allLearners) {
    if (self?.studentId && l.id === self.studentId) continue;
    const reasons: string[] = [];
    if (idHits(probe.officialIds, l.officialIds)) reasons.push("Official ID");
    if (email && normEmail(l.email) === email) reasons.push("Email");
    if (nameDob(l.name, l.dob)) reasons.push("Name + date of birth");
    if (reasons.length) out.push({ kind: "learner", learner: l, reasons });
  }
  return out;
}

/* ── Masking (cross-institution matches show only enough to confirm) ─────── */

export const maskEmail = (e?: string) => {
  if (!e || !e.includes("@")) return "—";
  const [u, d] = e.split("@");
  return `${u.slice(0, 1)}${"•".repeat(Math.max(2, u.length - 1))}@${d}`;
};

export const maskId = (v?: string) => {
  if (!v) return "—";
  const s = v.replace(/\s/g, "");
  if (s.length <= 4) return "•".repeat(s.length);
  return `${s.slice(0, 2)}${"•".repeat(s.length - 4)}${s.slice(-2)}`;
};

/* ── Seeds ───────────────────────────────────────────────────────────────── */

export const counsellorRotas: CounsellorRota[] = [
  {
    id: "T-009",
    tenantId: "T-009",
    counsellors: ["Reem Al Hashimi", "Priya Nair", "Daniel Brooks"],
    onDuty: "Reem Al Hashimi",
  },
  {
    id: "T-010",
    tenantId: "T-010",
    counsellors: ["Priya Raman", "Oliver Bennett", "Fatima Malik"],
    onDuty: "Oliver Bennett",
  },
  {
    id: "T-011",
    tenantId: "T-011",
    counsellors: ["Mia Nguyen", "Josh Taylor", "Liam O'Connor"],
    onDuty: "Mia Nguyen",
  },
];

const tgt = (
  id: string,
  tenantId: string,
  intake: string,
  target: string,
  counsellor: string,
  goal: number,
  branch?: string,
): CounsellorTarget => ({ id, tenantId, intake, target, counsellor, goal, branch });

export const counsellorTargets: CounsellorTarget[] = [
  // Meridian Dubai — targets by year group (school)
  tgt("CT-001", "T-009", "Aug 2027", "Year 7", "Reem Al Hashimi", 24),
  tgt("CT-002", "T-009", "Aug 2027", "All", "Daniel Brooks", 30),
  tgt("CT-003", "T-009", "Term 2 2026–27", "All", "Priya Nair", 12),
  // Northbridge University — targets by programme
  tgt("CT-004", "T-010", "Sep 2027", "BSc (Hons) Computer Science", "Priya Raman", 40),
  tgt("CT-005", "T-010", "Sep 2027", "BSc (Hons) Business Management", "Oliver Bennett", 30),
  tgt("CT-006", "T-010", "Sep 2027", "MSc Data Science", "Fatima Malik", 25),
  tgt("CT-007", "T-010", "Jan 2027", "MSc Data Science", "Fatima Malik", 12),
  tgt("CT-008", "T-010", "Jan 2027", "BSc (Hons) Business Management", "Oliver Bennett", 6),
  tgt("CT-009", "T-010", "Sep 2027", "All", "Priya Raman", 15, "International office"),
  // Harbourside College — targets by qualification / programme
  tgt(
    "CT-010",
    "T-011",
    "Feb 2027",
    "ICT50220 Diploma of Information Technology",
    "Mia Nguyen",
    20,
  ),
  tgt("CT-011", "T-011", "Feb 2027", "Bachelor of Information Technology", "Mia Nguyen", 15),
  tgt("CT-012", "T-011", "Feb 2027", "HLT54121 Diploma of Nursing", "Josh Taylor", 18),
  tgt(
    "CT-013",
    "T-011",
    "Rolling (VET)",
    "CPC30220 Certificate III in Carpentry",
    "Josh Taylor",
    10,
    "Parramatta",
  ),
];
