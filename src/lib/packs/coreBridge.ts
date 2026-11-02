/* ── Core-module bridge for pack tenants ─────────────────────────────────────
 * Packs ADD to the core platform — they never replace it. A segment tenant's
 * people still use the core modules (Record Book, Grades, Calendar, LMS…), so
 * those modules must resolve the tenant's learners, not the classic demo
 * roster. This file is the single seam between the two:
 *
 *   Learner (SIS record, pack data)  ──►  core "student" / "child" / enrolment
 *
 * Production merge note: in production there is ONE student entity (the
 * 1StudentID) and the Learner fields are its institution-scoped SIS profile.
 * The prototype keeps two seeds, and every core page that needs a person goes
 * through these helpers so the merge is a data change, not a UI rewrite. */
import type { DemoUser, SrbEntry, StudentEnrollment } from "../mockData";
import { tenants } from "../mockData";
import type { Learner, TenantProfile } from "./foundationData";
import { learners as seedLearners } from "./foundationData";
import { registerMarks as seedMarks, summarise, type RegisterMark } from "./opsData";
import { codeSetById } from "./regions";

const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name ?? id;

/** True when the user belongs to a segment (pack) tenant. */
export function isPackTenantUser(
  user: Pick<DemoUser, "institutionId"> | null | undefined,
  profiles: TenantProfile[],
): boolean {
  const tid = user?.institutionId;
  return !!tid && profiles.some((p) => p.tenantId === tid && p.experience === "segment");
}

/** The learners a pack-tenant user may see in core person views:
 *  parent → their own children; student → themself; staff → their tenant. */
export function learnersForUser(user: DemoUser | null, all: Learner[]): Learner[] {
  if (!user?.institutionId) return [];
  const mine = all.filter((l) => l.tenantId === user.institutionId);
  if (user.role === "parent") return mine.filter((l) => l.guardians?.includes(user.name));
  if (user.role === "student") return mine.filter((l) => l.id === user.oneEduId);
  return mine;
}

/** Attendance % from the tenant's own registers and code set. */
export function learnerAttendancePct(
  l: Learner,
  profiles: TenantProfile[],
  marks: RegisterMark[] = seedMarks,
): number | undefined {
  const mine = marks.filter((m) => m.studentId === l.id);
  if (!mine.length) return undefined;
  const set = codeSetById(profiles.find((p) => p.tenantId === l.tenantId)?.codeSetId ?? "");
  return summarise(mine, set).pct;
}

/** A learner in the classic core "student" shape. */
export function learnerAsStudent(l: Learner, profiles: TenantProfile[], marks?: RegisterMark[]) {
  return {
    id: l.id,
    name: l.name,
    grade: l.level,
    batch: l.group ?? "",
    attendance: learnerAttendancePct(l, profiles, marks) ?? 0,
    gpa: "—" as number | string,
    status: l.status,
    parent: l.guardians?.join(", ") ?? "—",
    risk: "low" as const,
  };
}

/** A learner in the classic core "child" shape (parent views). */
export function learnerAsChild(l: Learner, profiles: TenantProfile[], marks?: RegisterMark[]) {
  return {
    id: l.id,
    name: l.name,
    grade: l.group ? `${l.level} · ${l.group}` : l.level,
    attendance: learnerAttendancePct(l, profiles, marks) ?? 0,
    gpa: "—" as number | string,
    nextClass: `${tenantName(l.tenantId)}`,
    duesUSD: undefined as number | undefined,
  };
}

/** The learner's enrolment at their tenant, in the core multi-institution shape. */
export function learnerEnrollment(l: Learner): StudentEnrollment {
  return {
    institutionId: l.tenantId,
    institution: tenantName(l.tenantId),
    role: "Main school",
    classLabel: l.group ? `${l.level} · ${l.group}` : l.level,
    since: (l.startDate ?? "").slice(0, 4) || "—",
    primary: true,
  };
}

/* ── Record Book seed for pack learners ──────────────────────────────────── */
const at = (daysAgo: number, hour = 9) => {
  const x = new Date();
  x.setDate(x.getDate() - daysAgo);
  x.setHours(hour, 0, 0, 0);
  return x.toISOString();
};

type Seed = Omit<SrbEntry, "studentName" | "institutionId" | "institutionName" | "replies"> &
  Partial<Pick<SrbEntry, "replies">>;

const seed: Seed[] = [
  // Meridian Dubai — Zara (Year 10, British) and Adam (Grade 7, CBSE)
  {
    id: "SRB-P901",
    studentId: "S-3001",
    authorName: "Mr. James Carter",
    authorRole: "teacher",
    type: "permission",
    title: "Year 10 Geography fieldwork — Hatta (12 Nov)",
    body: "Coastal and river fieldwork at Hatta, 7:30 AM – 3 PM. Please acknowledge and complete the trip consent under Trips & Activities.",
    date: at(0, 8),
    pinned: true,
    requiresAck: true,
  },
  {
    id: "SRB-P902",
    studentId: "S-3001",
    authorName: "Mr. James Carter",
    authorRole: "teacher",
    type: "achievement",
    title: "IGCSE Physics — top mark in the forces test",
    body: "Zara scored 47/50 on the forces and motion test (class average 34). Predicted grade raised to 8.",
    date: at(2, 14),
    replies: [
      {
        id: "r1",
        authorName: "Sarah Khan",
        authorRole: "parent",
        text: "Wonderful — thank you for letting us know!",
        at: at(2, 19),
      },
    ],
  },
  {
    id: "SRB-P903",
    studentId: "S-3001",
    authorName: "Mrs. Claire Dawson",
    authorRole: "teacher",
    type: "homework",
    title: "English Literature — An Inspector Calls essay",
    body: "Essay on Mr Birling's dramatic irony, 600 words, due Thursday on the LMS.",
    date: at(4, 10),
  },
  {
    id: "SRB-P904",
    studentId: "S-3002",
    authorName: "Ms. Anjali Menon",
    authorRole: "teacher",
    type: "homework",
    title: "CBSE Science — food and nutrition worksheet",
    body: "NCERT Chapter 2 questions 1–10, due Wednesday.",
    date: at(1, 11),
  },
  {
    id: "SRB-P905",
    studentId: "S-3002",
    authorName: "Ms. Anjali Menon",
    authorRole: "teacher",
    type: "behavior",
    title: "Late to registration twice this week",
    body: "Adam arrived after the 7:45 AM bell on Monday and Wednesday. Please help with an earlier start.",
    date: at(3, 9),
    requiresAck: true,
  },
  // Northbridge University — Arjun (BSc Computer Science, Year 2)
  {
    id: "SRB-P101",
    studentId: "S-4001",
    authorName: "Dr. Samuel Reid",
    authorRole: "teacher",
    type: "communication",
    title: "Personal tutor meeting booked",
    body: "Semester 1 check-in, Thu 2 PM, Room CS-214. We'll review your CS201 coursework plan and your placement-year applications.",
    date: at(1, 15),
  },
  {
    id: "SRB-P102",
    studentId: "S-4001",
    authorName: "Dr. Samuel Reid",
    authorRole: "teacher",
    type: "achievement",
    title: "CS201 coursework — commended",
    body: "Your algorithms coursework was commended at moderation for its testing strategy.",
    date: at(6, 12),
  },
  // Harbourside College — Ruby (certification due)
  {
    id: "SRB-P111",
    studentId: "S-5003",
    authorName: "Liam O'Connor",
    authorRole: "admin",
    type: "remark",
    title: "Workplace visit — on track for certification",
    body: "Assessor visit completed at the host employer. All units signed off; certification paperwork started.",
    date: at(2, 13),
  },
];

/** SRB entries for pack learners, tagged with the learner's tenant. */
export const learnerSrb: SrbEntry[] = seed.flatMap((e) => {
  const l = seedLearners.find((x) => x.id === e.studentId);
  if (!l) return [];
  return [
    {
      replies: [],
      ...e,
      studentName: l.name,
      institutionId: l.tenantId,
      institutionName: tenantName(l.tenantId),
    },
  ];
});
