/* ── Pack-tenant message threads, merged into the core `chat` / `chatGroups`
 * collections so Messages shows each institution's own people.
 *
 * Pack threads never mix with the classic demo: every seeded id starts with
 * "PCH-" (messages) or "PGRP-" (groups), and the Messages page only shows a
 * pack user the people of their own institution (see `packDirectory`).
 *
 * Who talks to whom (age-appropriate):
 *   • school pupils → no pupil-to-pupil or pupil-to-teacher DMs in primary;
 *     the family (parent account, or the family-used primary account) talks
 *     to the class teacher, subject teachers and the school office.
 *   • university / college learners (adults) → their module leaders, tutors,
 *     classmates on the same modules and the student hub.
 *   • teachers → their groups' families (school) or students (HE / VET), and
 *     colleagues. Admins → staff, plus families / learners when needed. */
import type { ChatContact, ChatGroup, ChatMessage } from "../../mockData";
import type { Learner } from "../foundationData";
import { TENANT_STAFF } from "../opsData";
import { ageBandFor, type TeachingGroup } from "./learning";

/* ── Office contacts (one shared inbox per institution) ─────────────────── */

const OFFICES: Record<string, { name: string; role: string }> = {
  "T-009": {
    name: "Meridian Dubai School Office",
    role: "School office · fees, transport, admissions",
  },
  "T-012": {
    name: "Meridian Colombo School Office",
    role: "School office · fees, transport, admissions",
  },
  "T-010": { name: "Northbridge Student Hub", role: "Student services · letters, visas, fees" },
  "T-011": {
    name: "Harbourside Student Services",
    role: "Student services · enrolment, fees, USI",
  },
};

/** The shared office inbox for a pack tenant. */
export function officeContactFor(tenantId: string, tenantName?: string) {
  return (
    OFFICES[tenantId] ?? {
      name: `${tenantName ?? "Institution"} Office`,
      role: "Office · fees, letters, admissions",
    }
  );
}

/** Is this group a pack-tenant group (seeded or created in a pack tenant)? */
export const isPackGroupId = (id: string) => id.startsWith("PGRP-");

/* ── Directory: the people a pack user can message ──────────────────────── */

export interface PackDirectoryInput {
  me: string; // the name the user messages as (guardian for family accounts)
  role: "student" | "parent" | "teacher" | "admin";
  tenantId: string;
  tenantName?: string;
  learners: Learner[]; // all learners (filtered here)
  groups: TeachingGroup[]; // all teaching groups (filtered here)
  /** Learners the user acts for: self (student), children (parent / family). */
  actingFor: string[];
  /** Family-used primary account: talk as the family, never as the pupil. */
  family: boolean;
}

const childLabel = (l: Learner) => `${l.name.split(" ")[0]} (${l.group ?? l.level})`;

/** Staff role, plus "class teacher" / "form tutor" when they lead the form. */
function staffRole(tenantId: string, name: string) {
  return TENANT_STAFF[tenantId]?.find((s) => s.name === name)?.role ?? "Staff";
}

/** Form / tutor group a staff member leads, read from their staff role. */
export function formOf(tenantId: string, staffName: string): string | undefined {
  const role = staffRole(tenantId, staffName);
  return role.match(/Tutor (\S+)/)?.[1] ?? role.match(/class teacher · (.+)$/)?.[1]?.trim();
}

/** Every contact a pack user may start a chat with — their institution only. */
export function packDirectory(i: PackDirectoryInput): ChatContact[] {
  const map = new Map<string, string>();
  const add = (name: string | undefined, role: string) => {
    if (name && name !== i.me && !map.has(name)) map.set(name, role);
  };
  const tenantLearners = i.learners.filter((l) => l.tenantId === i.tenantId);
  const tenantGroups = i.groups.filter((g) => g.tenantId === i.tenantId);
  const staff = TENANT_STAFF[i.tenantId] ?? [];
  const office = officeContactFor(i.tenantId, i.tenantName);
  const isSchoolBand = (l: Learner) => !l.programmeId && !l.qualificationId;

  if (i.role === "admin") {
    for (const s of staff) add(s.name, s.role);
    add(office.name, office.role);
    for (const l of tenantLearners) {
      if (isSchoolBand(l)) for (const g of l.guardians ?? []) add(g, `Parent · ${childLabel(l)}`);
      else if (l.status !== "Graduated") add(l.name, `Student · ${l.group ?? l.level}`);
    }
  } else if (i.role === "teacher") {
    for (const s of staff) add(s.name, s.role);
    add(office.name, office.role);
    const mine = tenantGroups.filter((g) => g.teacher === i.me);
    const ids = new Set(mine.flatMap((g) => g.studentIds));
    const form = formOf(i.tenantId, i.me);
    for (const l of tenantLearners) {
      if (!ids.has(l.id) && !(form && l.group === form)) continue;
      // School: the family is the contact. Adults (HE / VET): the learner.
      if (isSchoolBand(l)) for (const g of l.guardians ?? []) add(g, `Parent · ${childLabel(l)}`);
      else add(l.name, `Student · ${l.group ?? l.level}`);
    }
  } else {
    // student / parent / family-used account
    const kids = tenantLearners.filter((l) => i.actingFor.includes(l.id));
    for (const k of kids) {
      const band = ageBandFor(
        k.level,
        k.programmeId ? "he" : k.qualificationId ? "vet" : undefined,
      );
      // Class teacher / form tutor first.
      for (const s of staff) {
        // Early-years leads are listed by stage ("Upper Nursery"), not by form.
        const leadsStage = band === "early" && s.role.includes(k.level);
        if ((k.group && formOf(i.tenantId, s.name) === k.group) || leadsStage) {
          add(
            s.name,
            `${band === "primary" || band === "early" ? "Class teacher" : "Form tutor"} · ${childLabel(k)}`,
          );
        }
      }
      for (const g of tenantGroups.filter((x) => x.studentIds.includes(k.id))) {
        if (g.teacher)
          add(
            g.teacher,
            `${g.kind === "module" ? `${g.code} module leader` : g.title} · ${staffRole(i.tenantId, g.teacher)}`,
          );
      }
      // Adult learners also reach classmates on the same modules.
      if (i.role === "student" && !i.family && (band === "higher-ed" || band === "vocational")) {
        const mates = new Set(
          tenantGroups.filter((g) => g.studentIds.includes(k.id)).flatMap((g) => g.studentIds),
        );
        for (const l of tenantLearners) {
          if (mates.has(l.id) && l.id !== k.id) add(l.name, `Classmate · ${l.group ?? l.level}`);
        }
      }
    }
    // Head / registrar for families and adult learners.
    const head = staff.find((s) => /Principal|Head of School|Registrar/i.test(s.role));
    if (head) add(head.name, head.role);
    add(office.name, office.role);
  }
  return Array.from(map, ([name, role]) => ({ name, role })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** Members for a new group built from a teaching group: the teacher, plus the
 *  families (school) or the learners themselves (university / college). */
export function membersForTeachingGroup(g: TeachingGroup, learners: Learner[]): string[] {
  const names = new Set<string>();
  if (g.teacher) names.add(g.teacher);
  for (const id of g.studentIds) {
    const l = learners.find((x) => x.id === id);
    if (!l) continue;
    if (g.band === "higher-ed" || g.band === "vocational") names.add(l.name);
    else (l.guardians ?? []).forEach((n) => names.add(n));
  }
  return Array.from(names);
}

/* ── Seed threads ───────────────────────────────────────────────────────── */

const TZ: Record<string, string> = {
  "T-009": "+04:00", // Dubai
  "T-012": "+05:30", // Colombo
  "T-010": "+00:00", // UK (GMT from 25 Oct)
  "T-011": "+11:00", // Sydney (AEDT)
};

/** Local wall-clock time at the tenant → ISO. */
const at = (tenantId: string, date: string, time: string) =>
  new Date(`${date}T${time}:00${TZ[tenantId] ?? "Z"}`).toISOString();

let n = 0;
const nextMsgId = () => `PCH-${String(++n).padStart(3, "0")}`;

function dm(
  tenantId: string,
  from: string,
  fromRole: string,
  to: string,
  date: string,
  time: string,
  text: string,
): ChatMessage {
  const [a, b] = from.localeCompare(to) <= 0 ? [from, to] : [to, from];
  return { id: nextMsgId(), a, b, fromName: from, fromRole, text, at: at(tenantId, date, time) };
}

function post(
  tenantId: string,
  groupId: string,
  from: string,
  fromRole: string,
  date: string,
  time: string,
  text: string,
): ChatMessage {
  return {
    id: nextMsgId(),
    a: groupId,
    b: groupId,
    groupId,
    fromName: from,
    fromRole,
    text,
    at: at(tenantId, date, time),
  };
}

/* Names */
// Meridian Colombo (T-012)
const DILANI = "Dilani Perera"; // guardian — messages from Sasindu's family-used account
const ISHARA = "Ms. Ishara Fernando";
const NADEESHA = "Mrs. Nadeesha Silva";
const DILRUKSHI = "Mrs. Dilrukshi Gunawardena";
const SANJEEWA = "Mr. Sanjeewa Perera";
const CMB_OFFICE = OFFICES["T-012"].name;
// Meridian Dubai (T-009)
const SARAH = "Sarah Khan";
const CARTER = "Mr. James Carter";
const MENON = "Ms. Anjali Menon";
const HANNAH = "Hannah Clarke";
const LEWIS = "Ms. Emma Lewis";
const DAWSON = "Mrs. Claire Dawson";
const WEBB = "Dr. Marcus Webb";
const YUSUF = "Mr. Yusuf Ali";
const BENNETT = "Ms. Laura Bennett";
const DXB_OFFICE = OFFICES["T-009"].name;
// Northbridge (T-010)
const ARJUN = "Arjun Mehta";
const REID = "Dr. Samuel Reid";
const HUGHES = "Dr. Eleanor Hughes";
const MOORE = "Prof. Helen Moore";
const BELLO = "Dr. Aisha Bello";
const HARTLEY = "Dr. Tom Hartley";
const EVANS = "Mr. Gareth Evans";
const PRIYA = "Priya Shah";
const HUB = OFFICES["T-010"].name;
// Harbourside (T-011)
const LIAM = "Liam O'Connor";
const SULLIVAN = "Ms. Kate Sullivan";
const KOWALSKI = "Ms. Jess Kowalski";
const WALSH = "Mr. Darren Walsh";
const ARCHER = "Mr. Ben Archer";
const PATEL = "Dr. Nina Patel";

const ROLE = {
  parent: "Parent",
  teacher: "Teacher",
  lecturer: "Lecturer",
  admin: "Admin",
  student: "Student",
  office: "Office",
};

export const seedChatGroups: ChatGroup[] = [
  {
    id: "PGRP-01",
    name: "3B Parents",
    members: [ISHARA, DILANI, "Ruwani Jayawardena", "Fathima Rizvi", "Kasun Wickramasinghe"],
    createdBy: ISHARA,
    createdAt: at("T-012", "2026-09-01", "08:00"),
  },
  {
    id: "PGRP-02",
    name: "10C Parents",
    members: [CARTER, SARAH, "Tom Morgan", "Grace Okafor"],
    createdBy: CARTER,
    createdAt: at("T-009", "2026-08-28", "08:00"),
  },
  {
    id: "PGRP-03",
    name: "7B Parents",
    members: [MENON, SARAH, "Neha Shah"],
    createdBy: MENON,
    createdAt: at("T-009", "2026-08-28", "08:30"),
  },
  {
    id: "PGRP-04",
    name: "Meridian Dubai Staff Room",
    members: [HANNAH, CARTER, LEWIS, DAWSON, WEBB, MENON, YUSUF, BENNETT],
    createdBy: HANNAH,
    createdAt: at("T-009", "2026-08-20", "07:00"),
  },
  {
    id: "PGRP-05",
    name: "CS201 Algorithms",
    members: [REID, ARJUN, "Grace Walker", "Noah Bennett", "Chen Wei", "Mia Collins", "Ananya Rao"],
    createdBy: REID,
    createdAt: at("T-010", "2026-09-21", "09:00"),
  },
  {
    id: "PGRP-06",
    name: "CS204 Web Development",
    members: [REID, ARJUN, "Grace Walker", "Noah Bennett", "Mia Collins"],
    createdBy: REID,
    createdAt: at("T-010", "2026-09-21", "09:05"),
  },
  {
    id: "PGRP-07",
    name: "School of Computing Staff",
    members: [HUGHES, REID, MOORE, BELLO, HARTLEY, EVANS],
    createdBy: HUGHES,
    createdAt: at("T-010", "2026-09-01", "09:00"),
  },
  {
    id: "PGRP-08",
    name: "Harbourside Trainers",
    members: [LIAM, SULLIVAN, WALSH, KOWALSKI, ARCHER, PATEL],
    createdBy: LIAM,
    createdAt: at("T-011", "2026-07-13", "08:00"),
  },
  {
    id: "PGRP-09",
    name: "Meridian Colombo Staff",
    members: [DILRUKSHI, SANJEEWA, ISHARA, NADEESHA],
    createdBy: DILRUKSHI,
    createdAt: at("T-012", "2026-08-25", "07:30"),
  },
];

export const seedChat: ChatMessage[] = [
  /* ── Meridian Colombo — the Perera family (Sasindu's family-used account) ── */
  dm(
    "T-012",
    ISHARA,
    ROLE.teacher,
    DILANI,
    "2026-10-27",
    "14:10",
    "Good afternoon Mrs. Perera. Sasindu read his new reading book beautifully today — he is now on the Turquoise band. Please keep reading with him for 10 minutes each evening.",
  ),
  dm(
    "T-012",
    DILANI,
    ROLE.parent,
    ISHARA,
    "2026-10-27",
    "19:45",
    "Thank you Miss! He was so proud. We are practising the 2, 5 and 10 times tables too.",
  ),
  dm(
    "T-012",
    ISHARA,
    ROLE.teacher,
    DILANI,
    "2026-10-28",
    "07:50",
    "Lovely. There is a short spelling check on Friday (words ending in -ing). The list is in his reading folder.",
  ),
  dm(
    "T-012",
    DILANI,
    ROLE.parent,
    ISHARA,
    "2026-10-30",
    "18:20",
    "Sasindu has a cough today, so he will stay home tomorrow. Can he do the spelling check next week?",
  ),
  dm(
    "T-012",
    ISHARA,
    ROLE.teacher,
    DILANI,
    "2026-10-31",
    "07:40",
    "Of course. Please mark the absence as illness in the app. Hope he feels better soon!",
  ),

  dm(
    "T-012",
    NADEESHA,
    "Early Years lead",
    DILANI,
    "2026-10-29",
    "13:30",
    "Hello Mrs. Perera. Senuli counted to 10 on her own today and helped tidy the reading corner. A new photo is in her learning journal.",
  ),
  dm(
    "T-012",
    DILANI,
    ROLE.parent,
    NADEESHA,
    "2026-10-29",
    "17:05",
    "That is wonderful, thank you! Does she need anything for the community helpers day?",
  ),
  dm(
    "T-012",
    NADEESHA,
    "Early Years lead",
    DILANI,
    "2026-10-30",
    "08:15",
    "Just a simple costume — a doctor, farmer or postman is perfect. No need to buy anything new.",
  ),

  dm(
    "T-012",
    DILANI,
    ROLE.parent,
    CMB_OFFICE,
    "2026-10-26",
    "10:05",
    "Hello, we moved house. Can Sasindu and Senuli change to the Nugegoda school van route from next week?",
  ),
  dm(
    "T-012",
    CMB_OFFICE,
    ROLE.office,
    DILANI,
    "2026-10-26",
    "11:30",
    "Hello Mrs. Perera. Yes — the Nugegoda van has two seats. Please send the new address through Requests and we will confirm the pickup time.",
  ),
  dm(
    "T-012",
    CMB_OFFICE,
    ROLE.office,
    DILANI,
    "2026-10-31",
    "09:00",
    "Thank you, the route change is done from Monday 2 November. Pickup is 6:50 AM at the Nugegoda junction.",
  ),

  post(
    "T-012",
    "PGRP-01",
    ISHARA,
    ROLE.teacher,
    "2026-10-26",
    "15:00",
    "Dear 3B parents, our class trip to the Dehiwala Zoo is on Thursday 12 November. Please give consent in the app by Friday.",
  ),
  post(
    "T-012",
    "PGRP-01",
    "Ruwani Jayawardena",
    ROLE.parent,
    "2026-10-26",
    "16:20",
    "Thank you Miss. Do they need a packed lunch?",
  ),
  post(
    "T-012",
    "PGRP-01",
    ISHARA,
    ROLE.teacher,
    "2026-10-26",
    "16:45",
    "Yes please — a packed lunch, a water bottle and a sun hat.",
  ),
  post(
    "T-012",
    "PGRP-01",
    DILANI,
    ROLE.parent,
    "2026-10-27",
    "07:30",
    "Consent done for Sasindu. Thank you for organising!",
  ),
  post(
    "T-012",
    "PGRP-01",
    ISHARA,
    ROLE.teacher,
    "2026-10-30",
    "14:30",
    "Reminder: the inter-house sports meet is on Saturday 14 November. Children come in house T-shirts.",
  ),

  post(
    "T-012",
    "PGRP-09",
    DILRUKSHI,
    "Head of School",
    "2026-10-28",
    "07:15",
    "Staff briefing moved to 7:10 AM on Monday. Agenda: sports meet duties and Term 1 reports.",
  ),
  post(
    "T-012",
    "PGRP-09",
    SANJEEWA,
    ROLE.teacher,
    "2026-10-28",
    "07:40",
    "Noted. I can run the Year 10 chemistry practical revision on Saturday if the lab is free.",
  ),
  dm(
    "T-012",
    DILRUKSHI,
    "Head of School",
    SANJEEWA,
    "2026-10-30",
    "11:00",
    "Mr. Perera, your police clearance has expired. Please renew it this week and upload the receipt to Staff Vetting.",
  ),

  /* ── Meridian Dubai — Sarah Khan (Zara 10C, Adam 7B) ── */
  dm(
    "T-009",
    CARTER,
    ROLE.teacher,
    SARAH,
    "2026-10-28",
    "13:20",
    "Hi Mrs Khan — Zara scored 47/50 in the forces test, the top mark in the class. I've raised her predicted grade to 8.",
  ),
  dm(
    "T-009",
    SARAH,
    ROLE.parent,
    CARTER,
    "2026-10-28",
    "18:05",
    "That's brilliant news, thank you! She has been working hard on the past papers.",
  ),
  dm(
    "T-009",
    CARTER,
    ROLE.teacher,
    SARAH,
    "2026-11-01",
    "08:10",
    "A reminder that the Hatta fieldwork consent closes on Thursday. Pupils need walking shoes and a packed lunch.",
  ),
  dm(
    "T-009",
    SARAH,
    ROLE.parent,
    CARTER,
    "2026-11-01",
    "20:30",
    "Consent done. Is the coach back by 3 PM?",
  ),

  dm(
    "T-009",
    MENON,
    ROLE.teacher,
    SARAH,
    "2026-10-29",
    "10:15",
    "Hello Mrs Khan. Adam arrived after the 7:45 bell on Monday and Wednesday. Could you help him get in a little earlier?",
  ),
  dm(
    "T-009",
    SARAH,
    ROLE.parent,
    MENON,
    "2026-10-29",
    "16:40",
    "Sorry about that — the school bus changed its route. We will drop him ourselves from next week.",
  ),
  dm(
    "T-009",
    MENON,
    ROLE.teacher,
    SARAH,
    "2026-10-30",
    "07:55",
    "Thank you. His science worksheet on food and nutrition was very good, by the way.",
  ),

  dm(
    "T-009",
    DXB_OFFICE,
    ROLE.office,
    SARAH,
    "2026-10-27",
    "09:30",
    "Dear Mrs Khan, Adam's Term 1 instalment is now overdue. You can pay by card or bank transfer under Fees & Payments.",
  ),
  dm(
    "T-009",
    SARAH,
    ROLE.parent,
    DXB_OFFICE,
    "2026-10-27",
    "12:10",
    "Thanks. Can we split it into two payments this term?",
  ),
  dm(
    "T-009",
    DXB_OFFICE,
    ROLE.office,
    SARAH,
    "2026-10-28",
    "08:45",
    "Yes, we can set up two instalments. The accounts team will send the new plan this week.",
  ),

  post(
    "T-009",
    "PGRP-02",
    CARTER,
    ROLE.teacher,
    "2026-10-26",
    "14:00",
    "Dear 10C parents, mock exams start on 23 November. Revision timetables are on the LMS.",
  ),
  post(
    "T-009",
    "PGRP-02",
    "Grace Okafor",
    ROLE.parent,
    "2026-10-26",
    "17:25",
    "Thank you. Will there be a revision session for Physics?",
  ),
  post(
    "T-009",
    "PGRP-02",
    CARTER,
    ROLE.teacher,
    "2026-10-27",
    "07:30",
    "Yes — Tuesdays after school in the Physics lab, starting 3 November.",
  ),
  post("T-009", "PGRP-02", SARAH, ROLE.parent, "2026-10-27", "08:05", "Great, Zara will be there."),

  post(
    "T-009",
    "PGRP-03",
    MENON,
    ROLE.teacher,
    "2026-10-28",
    "13:00",
    "7B parents: the science fair is on 19 November. Projects can be done in pairs.",
  ),
  post(
    "T-009",
    "PGRP-03",
    "Neha Shah",
    ROLE.parent,
    "2026-10-28",
    "15:30",
    "Kabir and Adam want to work together on a water filter project 😊",
  ),
  post(
    "T-009",
    "PGRP-03",
    SARAH,
    ROLE.parent,
    "2026-10-28",
    "16:10",
    "Yes, Adam told me — happy with that!",
  ),

  /* Mr. James Carter — colleagues and families */
  dm(
    "T-009",
    CARTER,
    ROLE.teacher,
    "Rana Haddad",
    "2026-10-30",
    "12:30",
    "Hello Mrs Haddad. Omar's attendance is 84% this half-term and he has missed two physics practicals. Could we talk this week?",
  ),
  dm(
    "T-009",
    "Rana Haddad",
    ROLE.parent,
    CARTER,
    "2026-10-30",
    "19:10",
    "Thank you for telling me. He had a family wedding in Amman. Thursday after school works.",
  ),
  dm(
    "T-009",
    LEWIS,
    ROLE.teacher,
    CARTER,
    "2026-10-29",
    "15:45",
    "James, Omar is predicted a 7 in maths but a 6 in physics. Shall we plan one joint catch-up?",
  ),
  dm(
    "T-009",
    CARTER,
    ROLE.teacher,
    LEWIS,
    "2026-10-29",
    "16:05",
    "Good idea. I'm seeing his mum on Thursday — I'll suggest a Tuesday session.",
  ),
  dm(
    "T-009",
    HANNAH,
    "Principal",
    CARTER,
    "2026-10-31",
    "09:20",
    "James, cover is booked for your Year 11 lessons during the Hatta trip. Risk assessment approved.",
  ),
  dm("T-009", CARTER, ROLE.teacher, HANNAH, "2026-10-31", "10:00", "Thank you Hannah."),

  post(
    "T-009",
    "PGRP-04",
    HANNAH,
    "Principal",
    "2026-10-29",
    "07:00",
    "Morning all. Term 1 reports are due on 20 November. Please enter predicted grades by 13 November.",
  ),
  post(
    "T-009",
    "PGRP-04",
    WEBB,
    "IB Diploma Coordinator",
    "2026-10-29",
    "07:25",
    "DP2 internal assessment deadlines are on the shared calendar.",
  ),
  post(
    "T-009",
    "PGRP-04",
    BENNETT,
    ROLE.teacher,
    "2026-10-30",
    "14:15",
    "FS2 are performing a song at Friday's assembly — all welcome!",
  ),

  /* Hannah Clarke — staff compliance */
  dm(
    "T-009",
    HANNAH,
    "Principal",
    MENON,
    "2026-10-30",
    "11:45",
    "Anjali, your good conduct certificate expired on 15 October. Please renew it and upload it to Staff Vetting.",
  ),
  dm(
    "T-009",
    MENON,
    ROLE.teacher,
    HANNAH,
    "2026-10-30",
    "13:05",
    "Sorry Hannah, I applied last week. I will upload it as soon as it arrives.",
  ),
  dm(
    "T-009",
    HANNAH,
    "Principal",
    DAWSON,
    "2026-11-01",
    "08:30",
    "Claire, a reminder that your good conduct certificate expires on 20 December.",
  ),

  /* ── Northbridge University — Arjun Mehta (BSc CS Year 2, Student route) ── */
  dm(
    "T-010",
    REID,
    "Personal tutor",
    ARJUN,
    "2026-10-29",
    "15:10",
    "Hi Arjun, I've booked our Semester 1 check-in for Thursday at 2 PM in CS-214. Bring your placement applications.",
  ),
  dm(
    "T-010",
    ARJUN,
    ROLE.student,
    REID,
    "2026-10-29",
    "16:02",
    "Thanks Dr. Reid. I've also asked to join CS205 Machine Learning — it's waiting for approval.",
  ),
  dm(
    "T-010",
    REID,
    "Personal tutor",
    ARJUN,
    "2026-10-30",
    "09:15",
    "I've seen it. You meet the prerequisites, so I'll support it at Thursday's meeting.",
  ),
  dm(
    "T-010",
    ARJUN,
    ROLE.student,
    REID,
    "2026-11-01",
    "18:40",
    "Great. Could I get feedback on my CS201 coursework before the exam?",
  ),

  dm(
    "T-010",
    ARJUN,
    ROLE.student,
    HUB,
    "2026-10-27",
    "11:20",
    "Hello, I need a bank letter confirming my enrolment for my student account.",
  ),
  dm(
    "T-010",
    HUB,
    ROLE.office,
    ARJUN,
    "2026-10-27",
    "14:05",
    "Hi Arjun — your letter is ready to download under My Requests. Remember to keep your contact details up to date for your Student route visa.",
  ),

  post(
    "T-010",
    "PGRP-05",
    REID,
    "Module leader",
    "2026-10-26",
    "10:00",
    "CS201: coursework feedback is now on the LMS. The exam is on 14 January — revision lectures start in week 10.",
  ),
  post(
    "T-010",
    "PGRP-05",
    "Mia Collins",
    ROLE.student,
    "2026-10-26",
    "12:30",
    "Will the exam cover dynamic programming?",
  ),
  post(
    "T-010",
    "PGRP-05",
    REID,
    "Module leader",
    "2026-10-26",
    "13:10",
    "Yes — and graph algorithms. Past papers are in the module folder.",
  ),
  post(
    "T-010",
    "PGRP-05",
    ARJUN,
    ROLE.student,
    "2026-10-28",
    "20:15",
    "Anyone want to form a study group on Wednesdays in the library?",
  ),
  post("T-010", "PGRP-05", "Grace Walker", ROLE.student, "2026-10-28", "20:40", "Count me in 👍"),

  post(
    "T-010",
    "PGRP-06",
    REID,
    "Module leader",
    "2026-10-31",
    "09:30",
    "CS204: the full-stack app was due on 30 October. If you have an extension, check your email.",
  ),
  post(
    "T-010",
    "PGRP-06",
    "Noah Bennett",
    ROLE.student,
    "2026-10-31",
    "11:00",
    "Submitted — the deployment link is in the README.",
  ),

  /* Dr. Samuel Reid — students and colleagues */
  dm(
    "T-010",
    REID,
    "Personal tutor",
    "Chen Wei",
    "2026-10-30",
    "10:40",
    "Hi Chen, I haven't seen you at CS201 labs for two weeks. Is everything OK? Let's meet this week — your attendance affects your visa.",
  ),
  dm(
    "T-010",
    REID,
    ROLE.lecturer,
    HUGHES,
    "2026-10-29",
    "17:20",
    "Eleanor, CS201 coursework marks are entered. Second marking is with Tom; they'll be ready for moderation on 6 November.",
  ),
  dm(
    "T-010",
    HUGHES,
    "Academic Registrar",
    REID,
    "2026-10-30",
    "08:55",
    "Thanks Samuel. I'll add CS201 to the January board pack.",
  ),
  dm(
    "T-010",
    MOORE,
    "Head of School",
    REID,
    "2026-10-28",
    "12:00",
    "Samuel, Ananya Rao is still trailing CS103. Can you check she knows the resit date?",
  ),
  dm(
    "T-010",
    REID,
    ROLE.lecturer,
    MOORE,
    "2026-10-28",
    "12:35",
    "Will do — I'm seeing her on Friday.",
  ),

  /* Dr. Eleanor Hughes — staff compliance */
  post(
    "T-010",
    "PGRP-07",
    HUGHES,
    "Academic Registrar",
    "2026-10-27",
    "09:00",
    "Reminder: Semester 1 marks are due in the system 10 working days after each deadline.",
  ),
  post(
    "T-010",
    "PGRP-07",
    BELLO,
    ROLE.lecturer,
    "2026-10-27",
    "09:40",
    "CS202 project briefs went out today.",
  ),
  dm(
    "T-010",
    HUGHES,
    "Academic Registrar",
    EVANS,
    "2026-10-29",
    "10:30",
    "Gareth, your DBS check expired on 1 September. Please start the renewal before your outreach sessions.",
  ),
  dm(
    "T-010",
    EVANS,
    ROLE.lecturer,
    HUGHES,
    "2026-10-29",
    "11:15",
    "Apologies — submitting it today.",
  ),
  dm(
    "T-010",
    HUGHES,
    "Academic Registrar",
    HARTLEY,
    "2026-10-31",
    "14:00",
    "Tom, your DBS is still pending. HR will chase the provider on Monday.",
  ),

  /* Priya Shah — alumna */
  dm(
    "T-010",
    REID,
    ROLE.lecturer,
    PRIYA,
    "2026-10-26",
    "16:00",
    "Hi Priya! Would you give a 20-minute talk to Year 2 about life as a software engineer? We're thinking 25 November.",
  ),
  dm(
    "T-010",
    PRIYA,
    "Alumna",
    REID,
    "2026-10-26",
    "19:30",
    "I'd love to! I can also bring someone from our hiring team.",
  ),
  dm(
    "T-010",
    PRIYA,
    "Alumna",
    HUB,
    "2026-10-30",
    "12:00",
    "Hello, my new employer needs a degree verification. Can I share it from my record?",
  ),
  dm(
    "T-010",
    HUB,
    ROLE.office,
    PRIYA,
    "2026-10-30",
    "15:20",
    "Yes — use Share under My Record to send a verified link. It stays valid for 30 days.",
  ),

  /* ── Harbourside College — Liam O'Connor (Registrar) ── */
  dm(
    "T-011",
    KOWALSKI,
    "Trainer & assessor",
    LIAM,
    "2026-10-29",
    "15:30",
    "Liam, Ruby Evans has all units signed off. Can we start her certification paperwork?",
  ),
  dm(
    "T-011",
    LIAM,
    "Registrar",
    KOWALSKI,
    "2026-10-29",
    "16:10",
    "Great news. I'll issue it this week. Also, your police check expired in June — please renew it.",
  ),
  dm(
    "T-011",
    KOWALSKI,
    "Trainer & assessor",
    LIAM,
    "2026-10-30",
    "09:00",
    "Applied online this morning.",
  ),
  dm(
    "T-011",
    LIAM,
    "Registrar",
    SULLIVAN,
    "2026-10-31",
    "10:15",
    "Kate, your WWCC expires on 20 November. Please renew before then.",
  ),
  dm(
    "T-011",
    SULLIVAN,
    "Trainer & assessor",
    LIAM,
    "2026-10-31",
    "11:00",
    "Thanks — booked. Also, Sakura Tanaka is at 78% attendance. She's close to the 80% ESOS line.",
  ),
  dm(
    "T-011",
    LIAM,
    "Registrar",
    "Sakura Tanaka",
    "2026-11-01",
    "09:30",
    "Hi Sakura, your attendance is just under 80%. Could you come and see me this week so we can plan support?",
  ),
  post(
    "T-011",
    "PGRP-08",
    LIAM,
    "Registrar",
    "2026-10-28",
    "08:00",
    "Term 4 census date is 6 November. Please confirm your class lists by Wednesday.",
  ),
  post(
    "T-011",
    "PGRP-08",
    WALSH,
    "Trainer",
    "2026-10-28",
    "08:45",
    "Electrotech list confirmed. Riley Cooper is on block release next week.",
  ),
  post(
    "T-011",
    "PGRP-08",
    ARCHER,
    "Trainer",
    "2026-10-28",
    "09:20",
    "Carpentry confirmed. My police check is still pending.",
  ),
];
