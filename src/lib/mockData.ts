export type Role = "student" | "parent" | "teacher" | "admin";

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  /** Professional headshot URL for the demo user. */
  photo: string;
  institution: string;
  tagline: string;
  meta?: Record<string, string>;
  /** Contact number — editable from the profile page (email stays locked). */
  phone?: string;
  /* Admin-scope split: "global" is the platform super-admin (Isla) who can
   * see every tenant; "institute" is a principal/registrar bound to a single
   * tenant. Only meaningful when role === "admin". */
  adminScope?: "global" | "institute";
  institutionId?: string;
  institutionName?: string;
  /* Guardianship model (for student accounts). A student who is 18 or older is
   * "self-managed": they own their account and authorise their own enrolments,
   * payments and course selection with no guardian in the loop. A minor is
   * guardian-linked — those same actions require the named guardian's consent. */
  dob?: string; // ISO date of birth
  selfManaged?: boolean; // true ⇒ adult, manages own account; false ⇒ minor
  guardianName?: string; // the guardian who approves actions for a minor
  oneEduId?: string; // link to the roster student record (S-XXXX)
}

const portrait = (path: string) => `https://randomuser.me/api/portraits/${path}`;

/** Age in whole years on a given date (defaults to today). */
export function ageOn(dob: string, on: Date = new Date()): number {
  const b = new Date(dob);
  let age = on.getFullYear() - b.getFullYear();
  const m = on.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < b.getDate())) age--;
  return age;
}

export const demoUsers: DemoUser[] = [
  {
    id: "u1",
    email: "student@demo.com",
    password: "demo",
    name: "Oliver Smith",
    role: "student",
    photo: portrait("men/32.jpg"),
    institution: "Royal Vista College + 3 tuition classes",
    tagline: "1 app · 4 institutes · A/L Science",
    meta: { grade: "Grade 12", batch: "Science-A", institutions: "4" },
    dob: "2009-03-14",
    selfManaged: false,
    guardianName: "Jack Smith",
    oneEduId: "S-1001",
  },
  /* Adult, self-managed student (18+) — no guardian. Owns her account and
   * authorises her own enrolments, payments and course selection. Also the
   * subject of the cross-tenant enrolment demo (searchable as S-2001). */
  {
    id: "u6",
    email: "adult@demo.com",
    password: "demo",
    name: "Emily Taylor",
    role: "student",
    photo: portrait("women/29.jpg"),
    institution: "EduStar International + self-managed",
    tagline: "18+ · Self-managed · own fees & enrolments",
    meta: { grade: "Foundation Year", age: "19", account: "Self-managed" },
    dob: "2007-02-20",
    selfManaged: true,
    oneEduId: "S-2001",
  },
  {
    id: "u2",
    email: "parent@demo.com",
    password: "demo",
    name: "Jack Smith",
    role: "parent",
    photo: portrait("men/65.jpg"),
    institution: "Manages 2 children across 6 institutes",
    tagline: "1 login · 2 children · 6 institutes",
    meta: { children: "2", institutions: "6" },
  },
  {
    id: "u3",
    email: "teacher@demo.com",
    password: "demo",
    name: "Dr. Charlie Brown",
    role: "teacher",
    photo: portrait("men/45.jpg"),
    institution: "Global Coaching Hub",
    tagline: "Physics faculty · 12 yrs experience",
    meta: { subject: "Physics" },
  },
  /* Global super-admin — sees every tenant. */
  {
    id: "u4",
    email: "admin@demo.com",
    password: "demo",
    name: "Isla Williams",
    role: "admin",
    photo: portrait("women/44.jpg"),
    institution: "1StudentID — Platform HQ",
    tagline: "Global admin · 8 tenants",
    meta: { tenants: "8" },
    adminScope: "global",
  },
  /* Institute-scoped admin — principal of Royal Vista College, sees only T-006. */
  {
    id: "u5",
    email: "principal@royalvista.com",
    password: "demo",
    name: "Jacob Wilson",
    role: "admin",
    photo: portrait("men/52.jpg"),
    institution: "Royal Vista College",
    tagline: "Institute admin · Royal Vista only",
    meta: { tenant: "T-006" },
    adminScope: "institute",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  /* Swim coach — instructor on the Royal Vista Swim Academy (multi-coach club).
   * Demonstrates the holistic pool view + per-session attendance & record-book
   * tasks. Role is "teacher"; the login screen labels her "Swim coach" via the
   * meta.discipline flag. Her name matches a coach record in `teachers`/sessions
   * so instructor-scoping (by name) lights up her sessions. */
  {
    id: "u7",
    email: "coach@demo.com",
    password: "demo",
    name: "Coach Ava Johnson",
    role: "teacher",
    photo: portrait("women/63.jpg"),
    institution: "Royal Vista Aquatics",
    tagline: "Head Swim Coach · Learn-to-Swim & Squad",
    meta: { discipline: "Swimming" },
    institutionId: "T-006",
    institutionName: "Royal Vista Aquatics",
  },
  /* Swim-club admin — runs the Royal Vista Swim Academy day-to-day. Unlike the
   * coach (who only sees her own sessions), the club admin sees the whole club:
   * manages coach cover on sessions (add/remove a coach when one is absent) and
   * reads daily/weekly/monthly/yearly summary reports. Scoped to T-006. The
   * shared meta.discipline "Swimming" flag switches the whole app into the
   * single-purpose swim-club experience for this account. */
  {
    id: "u8",
    email: "clubadmin@demo.com",
    password: "demo",
    name: "Jessica Davies",
    role: "admin",
    photo: portrait("women/68.jpg"),
    institution: "Royal Vista Aquatics",
    tagline: "Club Manager · Royal Vista Aquatics",
    meta: { discipline: "Swimming", scope: "Club admin" },
    adminScope: "institute",
    institutionId: "T-006",
    institutionName: "Royal Vista Aquatics",
  },
  /* Co-parent — Oliver & Olivia's second guardian (separated parents who both stay
   * involved). She logs in independently, sees the same two children as Jack,
   * and can pay for different classes on her own. Demonstrates the co-parent
   * access + separate-payment model. */
  {
    id: "u9",
    email: "coparent@demo.com",
    password: "demo",
    name: "Amelia Smith",
    role: "parent",
    photo: portrait("women/50.jpg"),
    institution: "Co-parent · 2 children",
    tagline: "1 login · 2 children · shared custody",
    meta: { children: "2", role: "Co-parent" },
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Multi-institution model
 *
 * 1StudentID's headline promise: one app, one identity for the student/parent —
 * but a student/child may be enrolled at *several* institutes simultaneously
 * (main school + tuition classes + online cohorts). Each institute keeps its
 * own enrolment record. The 1StudentID (S-XXXX) is unique platform-wide and
 * acts as the primary key. The legacy ID is whatever the institute used in
 * its previous LMS/SIS before migrating to 1StudentID — preserved so that
 * institute admins (and migrated reports/grade sheets) keep working.
 * ──────────────────────────────────────────────────────────────────────── */
export interface StudentEnrollment {
  institutionId: string; // tenant id, e.g. "T-006"
  institution: string; // display name
  role: string; // "Main school" | "A/L tuition" | "IELTS prep" …
  classLabel: string; // institute-specific class/grade label
  legacyId?: string; // student id used in the institute's prior system
  legacySystem?: string; // e.g. "Moodle (migrated Feb 2026)"
  since: string; // year the student joined that institute
  primary?: boolean; // marks the institute used for top-line summary
  nextSession?: string; // human-readable next class at this institute
  contactTeacher?: string; // primary contact at this institute
}

export const students = [
  {
    id: "S-1001",
    name: "Oliver Smith",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 94,
    gpa: 3.8,
    status: "Active",
    parent: "Jack Smith",
    risk: "low",
  },
  {
    id: "S-1002",
    name: "Isabella Evans",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 88,
    gpa: 3.5,
    status: "Active",
    parent: "Connor Booth",
    risk: "low",
  },
  {
    id: "S-1003",
    name: "William Walker",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 72,
    gpa: 2.7,
    status: "Active",
    parent: "Trevor Green",
    risk: "medium",
  },
  {
    id: "S-1004",
    name: "Sophie White",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 96,
    gpa: 3.9,
    status: "Active",
    parent: "Mia Jackson",
    risk: "low",
  },
  {
    id: "S-1005",
    name: "James Roberts",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 61,
    gpa: 2.2,
    status: "At Risk",
    parent: "Nicholas Murphy",
    risk: "high",
  },
  {
    id: "S-1006",
    name: "Alice Gibson",
    grade: "Grade 11",
    batch: "Science-A",
    attendance: 91,
    gpa: 3.6,
    status: "Active",
    parent: "Sophia Foster",
    risk: "low",
  },
  {
    id: "S-1007",
    name: "Dylan Sharp",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 84,
    gpa: 3.2,
    status: "Active",
    parent: "Neil Vaughan",
    risk: "low",
  },
  {
    id: "S-1008",
    name: "Gareth Norton",
    grade: "Grade 10",
    batch: "Science-A",
    attendance: 79,
    gpa: 3.0,
    status: "Active",
    parent: "Christopher Rogers",
    risk: "medium",
  },
  /* Olivia — second child for the demo parent. Lives at a different main school
     (LittleSparks Academy) and shares a tuition-class with her brother. */
  {
    id: "S-1009",
    name: "Olivia Smith",
    grade: "Grade 8",
    batch: "Junior-A",
    attendance: 97,
    gpa: 3.7,
    status: "Active",
    parent: "Jack Smith",
    risk: "low",
  },
  // ---- Extended roster (realistic class sizes — 10-14 students per batch) ----
  // Science-A · Grade 12
  {
    id: "S-1010",
    name: "Florence Stevens",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 92,
    gpa: 3.7,
    status: "Active",
    parent: "Nigel Wright",
    risk: "low",
  },
  {
    id: "S-1011",
    name: "Michael Johnson",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 87,
    gpa: 3.4,
    status: "Active",
    parent: "Logan Baker",
    risk: "low",
  },
  {
    id: "S-1012",
    name: "Henry Green",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 95,
    gpa: 3.8,
    status: "Active",
    parent: "Scott Hill",
    risk: "low",
  },
  {
    id: "S-1013",
    name: "Samuel Morris",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 81,
    gpa: 3.1,
    status: "Active",
    parent: "Reuben Nash",
    risk: "medium",
  },
  {
    id: "S-1014",
    name: "Stephen Williams",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 89,
    gpa: 3.5,
    status: "Active",
    parent: "Carl Ward",
    risk: "low",
  },
  {
    id: "S-1015",
    name: "Karen Barnes",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 93,
    gpa: 3.7,
    status: "Active",
    parent: "Joseph Ward",
    risk: "low",
  },
  {
    id: "S-1016",
    name: "Craig Parker",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 76,
    gpa: 2.9,
    status: "Active",
    parent: "Cameron Barker",
    risk: "medium",
  },
  {
    id: "S-1017",
    name: "Bethany Burton",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 90,
    gpa: 3.6,
    status: "Active",
    parent: "Gary Clarke",
    risk: "low",
  },
  {
    id: "S-1018",
    name: "Claire Moore",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 97,
    gpa: 3.9,
    status: "Active",
    parent: "Katie Brown",
    risk: "low",
  },
  {
    id: "S-1019",
    name: "Freddie Edwards",
    grade: "Grade 12",
    batch: "Science-A",
    attendance: 84,
    gpa: 3.3,
    status: "Active",
    parent: "Aiden Holmes",
    risk: "low",
  },

  // Science-B · Grade 10
  {
    id: "S-1020",
    name: "Imogen Blake",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 88,
    gpa: 3.4,
    status: "Active",
    parent: "Liam Payne",
    risk: "low",
  },
  {
    id: "S-1021",
    name: "Theo Gray",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 73,
    gpa: 2.8,
    status: "Active",
    parent: "Nicola Bailey",
    risk: "medium",
  },
  {
    id: "S-1022",
    name: "Peter Robinson",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 91,
    gpa: 3.6,
    status: "Active",
    parent: "Kevin Powell",
    risk: "low",
  },
  {
    id: "S-1023",
    name: "Millie Sanderson",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 94,
    gpa: 3.8,
    status: "Active",
    parent: "Jonathan Cox",
    risk: "low",
  },
  {
    id: "S-1024",
    name: "Lucas Mitchell",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 68,
    gpa: 2.5,
    status: "At Risk",
    parent: "Alan Ellis",
    risk: "high",
  },
  {
    id: "S-1025",
    name: "Phoebe Palmer",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 89,
    gpa: 3.5,
    status: "Active",
    parent: "Marcus Lloyd",
    risk: "low",
  },
  {
    id: "S-1026",
    name: "Robert Gray",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 82,
    gpa: 3.2,
    status: "Active",
    parent: "Nathan Dixon",
    risk: "low",
  },
  {
    id: "S-1027",
    name: "Julie Shaw",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 96,
    gpa: 3.9,
    status: "Active",
    parent: "Georgia Middleton",
    risk: "low",
  },
  {
    id: "S-1028",
    name: "Derek Webb",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 78,
    gpa: 3.0,
    status: "Active",
    parent: "Scarlett Richardson",
    risk: "medium",
  },
  {
    id: "S-1029",
    name: "Ruby Clarke",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 86,
    gpa: 3.4,
    status: "Active",
    parent: "Ian Walker",
    risk: "low",
  },
  {
    id: "S-1030",
    name: "Roger Roberts",
    grade: "Grade 10",
    batch: "Science-B",
    attendance: 71,
    gpa: 2.7,
    status: "Active",
    parent: "Mason Morgan",
    risk: "medium",
  },

  // Commerce-A · Grade 12
  {
    id: "S-1031",
    name: "Freya Barnes",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 92,
    gpa: 3.6,
    status: "Active",
    parent: "Martin Baker",
    risk: "low",
  },
  {
    id: "S-1032",
    name: "Ethan Moore",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 85,
    gpa: 3.3,
    status: "Active",
    parent: "Leo Hall",
    risk: "low",
  },
  {
    id: "S-1033",
    name: "Amy Davies",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 94,
    gpa: 3.7,
    status: "Active",
    parent: "Barry Hall",
    risk: "low",
  },
  {
    id: "S-1034",
    name: "Sebastian Murphy",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 79,
    gpa: 3.0,
    status: "Active",
    parent: "Anthony Morgan",
    risk: "medium",
  },
  {
    id: "S-1035",
    name: "Helen Chapman",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 88,
    gpa: 3.4,
    status: "Active",
    parent: "Archie Hill",
    risk: "low",
  },
  {
    id: "S-1036",
    name: "Callum Lowe",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 75,
    gpa: 2.8,
    status: "Active",
    parent: "Ross Fisher",
    risk: "medium",
  },
  {
    id: "S-1037",
    name: "Rachel Morris",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 96,
    gpa: 3.8,
    status: "Active",
    parent: "Andrew Jones",
    risk: "low",
  },
  {
    id: "S-1038",
    name: "Wayne Turner",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 83,
    gpa: 3.2,
    status: "Active",
    parent: "Jamie Reed",
    risk: "low",
  },
  {
    id: "S-1039",
    name: "Elsie Sutton",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 91,
    gpa: 3.5,
    status: "Active",
    parent: "Harrison Bailey",
    risk: "low",
  },
  {
    id: "S-1040",
    name: "Timothy Marshall",
    grade: "Grade 12",
    batch: "Commerce-A",
    attendance: 87,
    gpa: 3.4,
    status: "Active",
    parent: "Sarah Hughes",
    risk: "low",
  },

  // Commerce-B · Grade 11
  {
    id: "S-1041",
    name: "Emma Pearce",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 90,
    gpa: 3.5,
    status: "Active",
    parent: "Adam Ellis",
    risk: "low",
  },
  {
    id: "S-1042",
    name: "Arthur Kelly",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 67,
    gpa: 2.4,
    status: "At Risk",
    parent: "Gemma Watson",
    risk: "high",
  },
  {
    id: "S-1043",
    name: "Megan Smith",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 84,
    gpa: 3.2,
    status: "Active",
    parent: "Stanley Fletcher",
    risk: "low",
  },
  {
    id: "S-1044",
    name: "Ryan Kent",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 78,
    gpa: 3.0,
    status: "Active",
    parent: "Benjamin Cook",
    risk: "medium",
  },
  {
    id: "S-1045",
    name: "Victoria Cook",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 93,
    gpa: 3.7,
    status: "Active",
    parent: "Joshua Parker",
    risk: "low",
  },
  {
    id: "S-1046",
    name: "Colin Thompson",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 81,
    gpa: 3.1,
    status: "Active",
    parent: "Mark Pearson",
    risk: "low",
  },
  {
    id: "S-1047",
    name: "Lisa Foster",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 89,
    gpa: 3.5,
    status: "Active",
    parent: "Elliot Grant",
    risk: "low",
  },
  {
    id: "S-1048",
    name: "Isaac Clark",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 72,
    gpa: 2.7,
    status: "Active",
    parent: "Dean Harris",
    risk: "medium",
  },
  {
    id: "S-1049",
    name: "Chloe Marshall",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 95,
    gpa: 3.8,
    status: "Active",
    parent: "Lily Turner",
    risk: "low",
  },
  {
    id: "S-1050",
    name: "Shaun Clark",
    grade: "Grade 11",
    batch: "Commerce-B",
    attendance: 86,
    gpa: 3.3,
    status: "Active",
    parent: "Max Watson",
    risk: "low",
  },

  // Arts-A · Grade 12
  {
    id: "S-1051",
    name: "Grace Hughes",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 92,
    gpa: 3.6,
    status: "Active",
    parent: "Finley Rogers",
    risk: "low",
  },
  {
    id: "S-1052",
    name: "Aaron Slater",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 88,
    gpa: 3.4,
    status: "Active",
    parent: "Evie Bell",
    risk: "low",
  },
  {
    id: "S-1053",
    name: "Charlotte Holmes",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 94,
    gpa: 3.7,
    status: "Active",
    parent: "Graham Evans",
    risk: "low",
  },
  {
    id: "S-1054",
    name: "Maisie Hutchinson",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 83,
    gpa: 3.2,
    status: "Active",
    parent: "Bradley Kelly",
    risk: "low",
  },
  {
    id: "S-1055",
    name: "Hugo Hunt",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 76,
    gpa: 2.9,
    status: "Active",
    parent: "Richard Taylor",
    risk: "medium",
  },
  {
    id: "S-1056",
    name: "Hayley King",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 91,
    gpa: 3.5,
    status: "Active",
    parent: "Alfie Wood",
    risk: "low",
  },
  {
    id: "S-1057",
    name: "Lucy Wallace",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 85,
    gpa: 3.3,
    status: "Active",
    parent: "Rebecca Wilson",
    risk: "low",
  },
  {
    id: "S-1058",
    name: "Toby Doyle",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 79,
    gpa: 3.0,
    status: "Active",
    parent: "Rosie Berry",
    risk: "medium",
  },
  {
    id: "S-1059",
    name: "Joanne Richardson",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 96,
    gpa: 3.9,
    status: "Active",
    parent: "Daniel King",
    risk: "low",
  },
  {
    id: "S-1060",
    name: "Laura Jackson",
    grade: "Grade 12",
    batch: "Arts-A",
    attendance: 89,
    gpa: 3.5,
    status: "Active",
    parent: "Philip Mitchell",
    risk: "low",
  },

  /* ── Cross-tenant directory students ──────────────────────────────────────
   * These two are enrolled at EduStar International (T-002), NOT at Royal Vista
   * College (T-006). They power the "enrol an existing 1StudentID student from
   * another tenant" demo: a Royal Vista admin can find them by email/reference
   * but cannot see their details until the student (adult) or guardian (minor)
   * approves. Emily (S-2001) is also the adult self-managed demo login. */
  {
    id: "S-2001",
    name: "Emily Taylor",
    grade: "Foundation Year",
    batch: "Foundation-A",
    attendance: 90,
    gpa: 3.6,
    status: "Active",
    parent: "—",
    risk: "low",
  },
  {
    id: "S-2002",
    name: "Harry Jones",
    grade: "Grade 9",
    batch: "Science-B",
    attendance: 85,
    gpa: 3.3,
    status: "Active",
    parent: "George Jones",
    risk: "low",
  },
];

/* Per-student institute enrolments. Students NOT listed here fall back to a
 * single-institute default (their batch is a class at Royal Vista College).
 *
 * The headline demo accounts (Oliver S-1001, Olivia S-1009) are the showcase
 * for the "one app · many institutes" pitch — kept rich and varied. A handful
 * of other students also span 2 institutes so the Students table doesn't look
 * single-tenant when an admin scrolls through it. */
export const studentEnrollments: Record<string, StudentEnrollment[]> = {
  /* Oliver — A/L student at a main school plus 3 separate tuition cohorts.
     This is THE shape of the demo: one parent login replaces 4 institute apps. */
  "S-1001": [
    {
      institutionId: "T-006",
      institution: "Royal Vista College",
      role: "Main school",
      classLabel: "Grade 12 · Science-A",
      legacyId: "RVC/2021/3084",
      legacySystem: "Moodle (migrated Feb 2026)",
      since: "2021",
      primary: true,
      nextSession: "Mon 8:00 AM · Chemistry Lab",
      contactTeacher: "Mrs. Erin Dawson",
    },
    {
      institutionId: "T-007",
      institution: "Apex Tuition Hub",
      role: "A/L Combined Maths",
      classLabel: "Saturday 7-10 AM cohort",
      legacyId: "ATH-MTH-24-0341",
      legacySystem: "In-house SIS (migrated Jan 2026)",
      since: "2024",
      nextSession: "Sat 7:00 AM · Integration paper review",
      contactTeacher: "Mr. David Freeman",
    },
    {
      institutionId: "T-001",
      institution: "Global Coaching Hub",
      role: "A/L Physics",
      classLabel: "Online live · Mon/Wed",
      legacyId: "GCH-22-PHY-117",
      legacySystem: "Custom CRM (migrated Dec 2025)",
      since: "2022",
      nextSession: "Today 4:00 PM · Quantum Mechanics",
      contactTeacher: "Dr. Charlie Brown",
    },
    {
      institutionId: "T-003",
      institution: "BrightPath Institute",
      role: "IELTS Prep",
      classLabel: "Evening batch · Tue/Thu",
      since: "2026",
      nextSession: "Tue 6:00 PM · Writing Task 2 workshop",
      contactTeacher: "Ms. Abigail Hardy",
    },
  ],

  /* Olivia — primary school + one weekend tuition. Different main school from
     her brother, which is exactly the parent pain-point we're solving. */
  "S-1009": [
    {
      institutionId: "T-008",
      institution: "LittleSparks Academy",
      role: "Main school",
      classLabel: "Grade 8 · Junior-A",
      legacyId: "LS/M/2019/0042",
      legacySystem: "Spreadsheet roster (migrated Mar 2026)",
      since: "2019",
      primary: true,
      nextSession: "Tomorrow 9:00 AM · English Literature",
      contactTeacher: "Ms. Holly Riley",
    },
    {
      institutionId: "T-007",
      institution: "Apex Tuition Hub",
      role: "Math Coaching",
      classLabel: "Sat 10-12 PM · Grade 8 group",
      since: "2025",
      nextSession: "Sat 10:00 AM · Algebra review",
      contactTeacher: "Mr. Simon Warren",
    },
  ],

  /* A few peers of Oliver who also cross institutes — keeps the table honest. */
  "S-1002": [
    {
      institutionId: "T-006",
      institution: "Royal Vista College",
      role: "Main school",
      classLabel: "Grade 12 · Science-A",
      legacyId: "RVC/2021/3055",
      legacySystem: "Moodle (migrated Feb 2026)",
      since: "2021",
      primary: true,
    },
    {
      institutionId: "T-001",
      institution: "Global Coaching Hub",
      role: "Chemistry tuition",
      classLabel: "Online · Tue/Thu",
      since: "2024",
    },
  ],
  "S-1005": [
    /* James — tuition-only, no main-school enrolment in 1StudentID. */
    {
      institutionId: "T-007",
      institution: "Apex Tuition Hub",
      role: "A/L Combined Maths",
      classLabel: "Weekend revision cohort",
      legacyId: "ATH-MTH-23-0156",
      legacySystem: "In-house SIS (migrated Jan 2026)",
      since: "2023",
      primary: true,
    },
    {
      institutionId: "T-001",
      institution: "Global Coaching Hub",
      role: "A/L Physics",
      classLabel: "Online · Wed",
      since: "2024",
    },
  ],
  "S-1023": [
    /* Millie — high achiever in an international olympiad cohort. */
    {
      institutionId: "T-006",
      institution: "Royal Vista College",
      role: "Main school",
      classLabel: "Grade 10 · Science-B",
      legacyId: "RVC/2023/4710",
      legacySystem: "Moodle (migrated Feb 2026)",
      since: "2023",
      primary: true,
    },
    {
      institutionId: "T-002",
      institution: "EduStar International",
      role: "Cambridge Olympiad",
      classLabel: "Online weekend cohort",
      since: "2025",
    },
  ],
  "S-1031": [
    {
      institutionId: "T-006",
      institution: "Royal Vista College",
      role: "Main school",
      classLabel: "Grade 12 · Commerce-A",
      legacyId: "RVC/2021/3210",
      legacySystem: "Moodle (migrated Feb 2026)",
      since: "2021",
      primary: true,
    },
    {
      institutionId: "T-003",
      institution: "BrightPath Institute",
      role: "IELTS Prep",
      classLabel: "Saturday batch",
      legacyId: "BPI-IELTS-24-088",
      legacySystem: "In-house SIS (migrated Dec 2025)",
      since: "2024",
    },
  ],
  "S-1042": [
    /* Arthur — at-risk; both institutes can see the same red flags here. */
    {
      institutionId: "T-006",
      institution: "Royal Vista College",
      role: "Main school",
      classLabel: "Grade 11 · Commerce-B",
      legacyId: "RVC/2022/4112",
      legacySystem: "Moodle (migrated Feb 2026)",
      since: "2022",
      primary: true,
    },
    {
      institutionId: "T-005",
      institution: "Lingua Vista",
      role: "French Beginner",
      classLabel: "Online evening",
      since: "2025",
    },
  ],

  /* Cross-tenant directory students — enrolled only at EduStar (T-002) until a
     different tenant enrols them with consent. Deliberately NOT at T-006. */
  "S-2001": [
    {
      institutionId: "T-002",
      institution: "EduStar International",
      role: "Main school",
      classLabel: "Foundation Year · Science",
      since: "2025",
      primary: true,
    },
  ],
  "S-2002": [
    {
      institutionId: "T-002",
      institution: "EduStar International",
      role: "Main school",
      classLabel: "Grade 9 · Science-B",
      since: "2024",
      primary: true,
    },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * Platform directory — the consent-gated lookup used for cross-tenant enrolment.
 *
 * Scenario: a student already on 1StudentID (at tenant A) wants to enrol at a new
 * tenant B. Because tenant B's admin cannot see students outside their own
 * tenant, they search this directory by the student's registered email or One
 * Edu reference number. The search returns only *availability* — never contact
 * details or academic history. When the admin requests enrolment, 1StudentID
 * notifies the student (if self-managed/adult) or their guardian (if a minor)
 * by email + SMS to approve (one-click magic link or OTP). Only after that
 * approval is the full profile unlocked for tenant B.
 * ──────────────────────────────────────────────────────────────────────── */
export interface DirectoryClass {
  id: string;
  label: string;
  fee: number; // USD
}

export interface DirectoryStudent {
  oneEduId: string;
  name: string;
  email: string; // registered account email (searchable)
  phone: string; // registered mobile (consent SMS target for adults)
  dob: string;
  selfManaged: boolean; // adult ⇒ student approves; minor ⇒ guardian approves
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  homeInstitution: string; // where they're currently enrolled
  grade: string;
  /** Classes the searching tenant currently has open for enrolment. */
  availableClasses: DirectoryClass[];
}

export const platformDirectory: DirectoryStudent[] = [
  {
    oneEduId: "S-2001",
    name: "Emily Taylor",
    email: "emily.taylor01@gmail.com",
    phone: "+447700900123",
    dob: "2007-02-20",
    selfManaged: true,
    homeInstitution: "EduStar International",
    grade: "Foundation Year",
    availableClasses: [
      { id: "RVC-AL-CHEM", label: "A/L Chemistry · Theory (Sat 8–11 AM)", fee: 95 },
      { id: "RVC-AL-PHY", label: "A/L Physics · Revision (Sun 2–5 PM)", fee: 90 },
    ],
  },
  {
    oneEduId: "S-2002",
    name: "Harry Jones",
    email: "harry.j09@gmail.com",
    phone: "+447700900456",
    dob: "2011-11-05",
    selfManaged: false,
    guardianName: "George Jones",
    guardianEmail: "george.jones@gmail.com",
    guardianPhone: "+447700900789",
    homeInstitution: "EduStar International",
    grade: "Grade 9",
    availableClasses: [
      { id: "RVC-G9-MATH", label: "Grade 9 Maths · Weekday (Mon/Wed 4–6 PM)", fee: 60 },
      { id: "RVC-G9-SCI", label: "Grade 9 Science · Lab (Fri 3–5 PM)", fee: 65 },
    ],
  },
];

/* Default main-school pool for students that aren't in the explicit map. We
 * distribute deterministically by ID modulo so each institute hosts a believable
 * slice of the roster — and so the institute-admin scope filter actually filters
 * something out, instead of putting everyone at one tenant. */
const DEFAULT_SECONDARY_SCHOOLS = [
  {
    institutionId: "T-006",
    institution: "Royal Vista College",
    legacyPrefix: "RVC",
    legacySystem: "Moodle (migrated Feb 2026)",
    since: "2021",
  },
  {
    institutionId: "T-001",
    institution: "Global Coaching Hub",
    legacyPrefix: "GCH",
    legacySystem: "Custom CRM (migrated Dec 2025)",
    since: "2022",
  },
  {
    institutionId: "T-002",
    institution: "EduStar International",
    legacyPrefix: "ESI",
    legacySystem: "PowerSchool (migrated Mar 2026)",
    since: "2022",
  },
] as const;

/** Resolve enrollments for a student. Falls back to a single-institute default
 *  spread across the pool so the demo roster looks like a real cross-tenant
 *  platform (and institute admins see only their slice). */
export function getEnrollments(student: {
  id: string;
  grade: string;
  batch: string;
}): StudentEnrollment[] {
  const explicit = studentEnrollments[student.id];
  if (explicit) return explicit;
  const idNum = parseInt(student.id.replace(/\D/g, ""), 10) || 0;
  // Grade 7/8 students belong at LittleSparks (primary). Everyone else goes
  // into the secondary-school pool.
  const isPrimary = /Grade [78]\b/.test(student.grade);
  const school = isPrimary
    ? {
        institutionId: "T-008",
        institution: "LittleSparks Academy",
        legacyPrefix: "LS",
        legacySystem: "Spreadsheet roster (migrated Mar 2026)",
        since: "2019",
      }
    : DEFAULT_SECONDARY_SCHOOLS[idNum % DEFAULT_SECONDARY_SCHOOLS.length];
  // Deterministic "migrated half" so the table shows a realistic mix of
  // legacy-ID-present (came from another LMS) vs natively-signed-up rows.
  const migrated = idNum % 2 === 0;
  return [
    {
      institutionId: school.institutionId,
      institution: school.institution,
      role: "Main school",
      classLabel: `${student.grade} · ${student.batch}`,
      legacyId: migrated ? `${school.legacyPrefix}/${school.since}/${3000 + idNum}` : undefined,
      legacySystem: migrated ? school.legacySystem : undefined,
      since: school.since,
      primary: true,
    },
  ];
}

export const courses = [
  {
    id: "C-PHY12",
    title: "Advanced Physics",
    code: "PHY-12",
    teacher: "Dr. Charlie Brown",
    students: 42,
    credits: 4,
    schedule: "Mon/Wed 4-6 PM",
    rating: 4.8,
    price: 120,
    category: "Science",
  },
  {
    id: "C-CHEM12",
    title: "Organic Chemistry",
    code: "CHEM-12",
    teacher: "Mrs. Erin Dawson",
    students: 38,
    credits: 4,
    schedule: "Tue/Thu 4-6 PM",
    rating: 4.7,
    price: 110,
    category: "Science",
  },
  {
    id: "C-MATH12",
    title: "Combined Mathematics",
    code: "MATH-12",
    teacher: "Mr. David Freeman",
    students: 56,
    credits: 5,
    schedule: "Mon-Fri 8-10 AM",
    rating: 4.9,
    price: 150,
    category: "Mathematics",
  },
  {
    id: "C-BIO12",
    title: "Biology — Cellular Systems",
    code: "BIO-12",
    teacher: "Dr. Daisy Fisher",
    students: 33,
    credits: 4,
    schedule: "Wed/Fri 3-5 PM",
    rating: 4.6,
    price: 115,
    category: "Science",
  },
  {
    id: "C-ENG12",
    title: "English Literature",
    code: "ENG-12",
    teacher: "Ms. Holly Riley",
    students: 28,
    credits: 3,
    schedule: "Tue 6-8 PM",
    rating: 4.5,
    price: 80,
    category: "Languages",
  },
  {
    id: "C-ICT12",
    title: "Information & Communication Tech",
    code: "ICT-12",
    teacher: "Mr. Paul Bradley",
    students: 47,
    credits: 4,
    schedule: "Sat 9-12 AM",
    rating: 4.7,
    price: 100,
    category: "Technology",
  },
  /* Multi-coach swimming club — opens the rich aquatic course experience
   * (pool map, sessions, several instructors per session). See swimCourses /
   * pools / poolSessions below. The "+3" hints that the club is led by a team
   * of coaches rather than a single teacher. */
  {
    id: "C-SWIM",
    title: "Royal Vista Aquatics",
    code: "SWIM",
    teacher: "Coach Ava Johnson +3",
    students: 64,
    credits: 0,
    schedule: "Mon–Sat · multiple sessions",
    rating: 4.9,
    price: 70,
    category: "Sports",
  },
  /* Further programmes the same club runs — distinct offerings (not overlapping
   * the flagship squad/learn-to-swim timetable) so the swim catalog feels real.
   * Each has its own swimCourses + poolSessions entries below. */
  {
    id: "C-SWIM-LTS",
    title: "Learn-to-Swim Academy",
    code: "SWIM-LTS",
    teacher: "Coach Poppy Wright +1",
    students: 38,
    credits: 0,
    schedule: "Tue/Thu/Sat · afternoons",
    rating: 4.8,
    price: 45,
    category: "Sports",
  },
  {
    id: "C-SWIM-MAS",
    title: "Adult & Masters Swimming",
    code: "SWIM-MAS",
    teacher: "Coach Ava Johnson +1",
    students: 22,
    credits: 0,
    schedule: "Tue/Thu/Sat · mornings",
    rating: 4.7,
    price: 55,
    category: "Sports",
  },
  {
    id: "C-SWIM-SAFE",
    title: "Water Safety & Lifeguarding",
    code: "SWIM-SAFE",
    teacher: "Coach Thomas Robinson +1",
    students: 14,
    credits: 0,
    schedule: "Wed/Sat",
    rating: 4.8,
    price: 90,
    category: "Sports",
  },
  {
    id: "C-SWIM-TRI",
    title: "Triathlon & Open-Water Squad",
    code: "SWIM-TRI",
    teacher: "Coach Ava Johnson +1",
    students: 12,
    credits: 0,
    schedule: "Tue/Sat · early",
    rating: 4.9,
    price: 80,
    category: "Sports",
  },
];

/* ── Class capacity planning (academic courses) ─────────────────────────────
 * Planned seat capacity per academic course, so an institute admin can see
 * class fill and spot under-filled (loss-making) or over-subscribed classes —
 * the academic counterpart to the swim club's per-session capacity planning
 * (swim programmes plan seats per pool session instead; see poolSessions).
 * A course not listed here falls back to a sensible headroom over its current
 * enrolment so newly created classes still get a believable target. */
export const COURSE_CAPACITY: Record<string, number> = {
  "C-PHY12": 50,
  "C-CHEM12": 50,
  "C-MATH12": 56,
  "C-BIO12": 60,
  "C-ENG12": 60,
  "C-ICT12": 50,
};

export function courseCapacity(id: string, enrolled: number): number {
  return COURSE_CAPACITY[id] ?? Math.max(enrolled + 6, Math.ceil((enrolled || 20) / 0.85));
}

/* An admin-set seat capacity for a class, overriding the planned default above.
 * Written from the class page's "Adjust seats" control; read by both the class
 * page and the institute admin's capacity-planning dashboard so they agree. */
export interface CapacityOverride {
  courseId: string;
  seats: number;
  by: string;
  at: string; // ISO
}

export const capacityOverrides: CapacityOverride[] = [];

/** Effective planned capacity for a course: an admin override if set, else the
 *  seeded/derived default. */
export function effectiveCapacity(
  id: string,
  enrolled: number,
  overrides: CapacityOverride[],
): number {
  return overrides.find((o) => o.courseId === id)?.seats ?? courseCapacity(id, enrolled);
}

export const attendanceToday = [
  {
    id: "S-1001",
    name: "Oliver Smith",
    time: "08:02 AM",
    method: "Facial Recognition",
    status: "Present",
  },
  { id: "S-1002", name: "Isabella Evans", time: "08:05 AM", method: "QR Scan", status: "Present" },
  { id: "S-1003", name: "William Walker", time: "—", method: "—", status: "Absent" },
  { id: "S-1004", name: "Sophie White", time: "07:58 AM", method: "RFID", status: "Present" },
  { id: "S-1005", name: "James Roberts", time: "08:42 AM", method: "GPS", status: "Late" },
  {
    id: "S-1006",
    name: "Alice Gibson",
    time: "08:01 AM",
    method: "QR Scan",
    status: "Present",
  },
  {
    id: "S-1009",
    name: "Olivia Smith",
    time: "07:55 AM",
    method: "Facial Recognition",
    status: "Present",
  },
];

export const assignments = [
  {
    id: "A-201",
    course: "Advanced Physics",
    title: "Quantum Mechanics Problem Set",
    due: "2026-06-02",
    status: "Pending",
    score: null,
  },
  {
    id: "A-202",
    course: "Combined Mathematics",
    title: "Calculus II — Integrals",
    due: "2026-05-30",
    status: "Submitted",
    score: 92,
  },
  {
    id: "A-203",
    course: "Organic Chemistry",
    title: "Lab Report: Alkenes",
    due: "2026-06-05",
    status: "Pending",
    score: null,
  },
  {
    id: "A-204",
    course: "English Literature",
    title: "Essay: Modernism in Poetry",
    due: "2026-05-28",
    status: "Graded",
    score: 88,
  },
  {
    id: "A-205",
    course: "ICT",
    title: "Database Design Project",
    due: "2026-06-10",
    status: "Pending",
    score: null,
  },
];

export const grades = [
  { course: "Advanced Physics", mid: 84, final: 89, grade: "A" },
  { course: "Combined Mathematics", mid: 92, final: 95, grade: "A+" },
  { course: "Organic Chemistry", mid: 78, final: 82, grade: "B+" },
  { course: "English Literature", mid: 86, final: 88, grade: "A" },
  { course: "ICT", mid: 90, final: 94, grade: "A+" },
];

/* Invoices are now tagged with the institute (institutionId/institutionName)
 * and the student (studentId) that the charge belongs to. This is what lets
 * the parent's per-institute view show the right dues under the right card,
 * and what lets an institute admin filter the finance page to just their own
 * receivables. The fields are optional so legacy code that creates an invoice
 * without them (e.g. the New Invoice form) still type-checks. */
export interface InvoiceRow {
  id: string;
  date: string;
  desc: string;
  amount: number;
  status: string;
  method: string;
  studentId?: string;
  institutionId?: string;
  institutionName?: string;
  /** Tags a charge to a specific programme (e.g. the swim club) so a
   *  programme admin can filter the finance page to just their receivables. */
  courseId?: string;
  /** Which guardian settled this invoice — lets separated co-parents each pay
   *  for different classes and see who paid what. */
  paidBy?: string;
  /** Human label of the class/programme this fee is for (co-parent view). */
  classLabel?: string;
}

export const invoices: InvoiceRow[] = [
  /* Oliver at Royal Vista College — main school. */
  {
    id: "INV-2026-0421",
    date: "2026-05-01",
    desc: "Term 2 main-school tuition",
    amount: 180,
    status: "Paid",
    method: "Visa •••• 4242",
    studentId: "S-1001",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    id: "INV-2026-0508",
    date: "2026-05-15",
    desc: "Chemistry lab fee",
    amount: 45,
    status: "Paid",
    method: "PayPal",
    studentId: "S-1001",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    id: "INV-2026-0615",
    date: "2026-06-01",
    desc: "Term 3 main-school tuition",
    amount: 180,
    status: "Due",
    method: "—",
    studentId: "S-1001",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  /* Oliver at Apex Tuition Hub — A/L Combined Maths. */
  {
    id: "INV-2026-0612",
    date: "2026-05-28",
    desc: "Combined Maths · May fees",
    amount: 90,
    status: "Paid",
    method: "PayHere",
    studentId: "S-1001",
    institutionId: "T-007",
    institutionName: "Apex Tuition Hub",
  },
  {
    id: "INV-2026-0701",
    date: "2026-06-05",
    desc: "Combined Maths · June fees",
    amount: 90,
    status: "Due",
    method: "—",
    studentId: "S-1001",
    institutionId: "T-007",
    institutionName: "Apex Tuition Hub",
  },
  /* Oliver at Global Coaching Hub — A/L Physics online. */
  {
    id: "INV-2026-0702",
    date: "2026-06-01",
    desc: "A/L Physics online · June fees",
    amount: 120,
    status: "Due",
    method: "—",
    studentId: "S-1001",
    institutionId: "T-001",
    institutionName: "Global Coaching Hub",
  },
  /* Oliver at BrightPath — IELTS prep upcoming. */
  {
    id: "INV-2026-0703",
    date: "2026-06-15",
    desc: "IELTS prep · enrolment fee",
    amount: 120,
    status: "Upcoming",
    method: "—",
    studentId: "S-1001",
    institutionId: "T-003",
    institutionName: "BrightPath Institute",
  },
  /* Olivia at LittleSparks Academy — main school. */
  {
    id: "INV-2026-0431",
    date: "2026-05-01",
    desc: "Term 2 tuition · Grade 8",
    amount: 200,
    status: "Paid",
    method: "Visa •••• 4242",
    studentId: "S-1009",
    institutionId: "T-008",
    institutionName: "LittleSparks Academy",
  },
  {
    id: "INV-2026-0631",
    date: "2026-06-10",
    desc: "Annual excursion fee",
    amount: 80,
    status: "Due",
    method: "—",
    studentId: "S-1009",
    institutionId: "T-008",
    institutionName: "LittleSparks Academy",
  },
  /* Olivia at Apex Tuition Hub — Math coaching. */
  {
    id: "INV-2026-0641",
    date: "2026-06-01",
    desc: "Math coaching · June fees",
    amount: 60,
    status: "Due",
    method: "—",
    studentId: "S-1009",
    institutionId: "T-007",
    institutionName: "Apex Tuition Hub",
  },
];

export interface DemoMessage {
  from: string;
  role: string;
  preview: string;
  time: string;
  unread: boolean;
  /* Swim-club threads carry this so swim accounts see only club conversations
   * (coach ⇄ parent about a swimmer, coach ⇄ club admin, club announcements). */
  context?: "swim";
}

export const messages: DemoMessage[] = [
  {
    from: "Dr. Charlie Brown",
    role: "Teacher",
    preview: "Reminder: Lab tomorrow at 3 PM.",
    time: "10:42 AM",
    unread: true,
  },
  {
    from: "Finance Office",
    role: "Admin",
    preview: "Your June invoice is now available.",
    time: "Yesterday",
    unread: true,
  },
  {
    from: "Mrs. Erin Dawson",
    role: "Teacher",
    preview: "Great work on your chemistry essay.",
    time: "2 days ago",
    unread: false,
  },
  {
    from: "Counselor Ella Cox",
    role: "Counselor",
    preview: "Let's schedule our monthly catch-up.",
    time: "3 days ago",
    unread: false,
  },
  /* ── Swim-club threads (context: "swim") ── */
  {
    from: "Coach Ava Johnson",
    role: "Head Swim Coach",
    preview: "Oliver's freestyle turns are looking sharp — moved him to lane 2 for sprint sets.",
    time: "1h ago",
    unread: true,
    context: "swim",
  },
  {
    from: "Jack Smith",
    role: "Parent",
    preview:
      "Olivia has a slight ear infection — she'll skip Saturday's Learn-to-Swim. Back next week.",
    time: "Yesterday",
    unread: true,
    context: "swim",
  },
  {
    from: "Jessica Davies",
    role: "Club Admin",
    preview: "Coach Poppy is out Saturday — can you cover Family Learn-to-Swim at 9 AM?",
    time: "Yesterday",
    unread: false,
    context: "swim",
  },
  {
    from: "Royal Vista Aquatics",
    role: "Announcement",
    preview:
      "Club gala time-trials next Friday 5 PM. Competitive Squad swimmers please confirm attendance.",
    time: "2 days ago",
    unread: false,
    context: "swim",
  },
  {
    from: "Coach Thomas Robinson",
    role: "Swim Coach",
    preview: "Butterfly clinic notes posted to the record book for Wednesday's group.",
    time: "3 days ago",
    unread: false,
    context: "swim",
  },
];

export const notifications = [
  { type: "grade", text: "Your Math II calculus assignment was graded: 92/100", time: "2h ago" },
  { type: "attendance", text: "Attendance recorded via facial recognition", time: "today 08:02" },
  { type: "billing", text: "June invoice of $510 is due in 5 days", time: "yesterday" },
  { type: "class", text: "Physics live class starts in 15 minutes", time: "10 min ago" },
];

export interface LeadRow {
  name: string;
  source: string;
  interest: string;
  stage: string;
  owner: string;
  value: number;
  /** Prospect contact details — needed to actually follow the lead up (call /
   *  email / WhatsApp). Optional for back-compat with older seeds. */
  phone?: string;
  email?: string;
  /** Tags a lead to a programme (e.g. the swim club) so a programme admin can
   *  filter the CRM to just their enquiries. */
  program?: "Swim";
}

export const leads: LeadRow[] = [
  {
    name: "Eleanor Newman",
    source: "Facebook Ad",
    interest: "A/L Science",
    stage: "Qualified",
    owner: "Marketing — Martin",
    value: 1200,
  },
  {
    name: "Michelle Palmer",
    source: "Google Search",
    interest: "O/L Math",
    stage: "Contacted",
    owner: "Marketing — Bethan",
    value: 600,
  },
  {
    name: "Owen Frost",
    source: "Referral",
    interest: "ICT Advanced",
    stage: "Demo Booked",
    owner: "Marketing — Martin",
    value: 900,
  },
  {
    name: "Noah Shaw",
    source: "Instagram",
    interest: "English",
    stage: "New",
    owner: "Unassigned",
    value: 320,
  },
  {
    name: "Malcolm White",
    source: "Web Form",
    interest: "Combined Maths",
    stage: "Closed Won",
    owner: "Marketing — Bethan",
    value: 1500,
  },
];

export const marketplaceCourses = [
  {
    id: "MP-1",
    title: "IELTS Mastery 2026",
    provider: "BrightPath Institute",
    rating: 4.9,
    students: 12483,
    price: 79,
    tag: "Bestseller",
    category: "Languages",
  },
  {
    id: "MP-2",
    title: "AP Calculus BC Crash Course",
    provider: "MathLab Pro",
    rating: 4.8,
    students: 7421,
    price: 99,
    tag: "New",
    category: "Mathematics",
  },
  {
    id: "MP-3",
    title: "Full-Stack Web Dev Bootcamp",
    provider: "CodeCraft Academy",
    rating: 4.9,
    students: 22301,
    price: 149,
    tag: "Bestseller",
    category: "Technology",
  },
  {
    id: "MP-4",
    title: "MCAT Biology Intensive",
    provider: "PreMed Global",
    rating: 4.7,
    students: 5612,
    price: 129,
    category: "Science",
  },
  {
    id: "MP-5",
    title: "Cambridge A/L Physics",
    provider: "Global Coaching Hub",
    rating: 4.8,
    students: 3120,
    price: 89,
    category: "Science",
  },
  {
    id: "MP-6",
    title: "Spoken French — Beginner",
    provider: "Lingua Vista",
    rating: 4.6,
    students: 9870,
    price: 49,
    tag: "Trending",
    category: "Languages",
  },
];

export const tenants = [
  {
    id: "T-001",
    name: "Global Coaching Hub",
    country: "Sri Lanka",
    students: 1842,
    plan: "Enterprise",
    status: "Active",
    mrr: 4900,
  },
  {
    id: "T-002",
    name: "EduStar International",
    country: "India",
    students: 3210,
    plan: "Enterprise",
    status: "Active",
    mrr: 7200,
  },
  {
    id: "T-003",
    name: "BrightPath Institute",
    country: "UAE",
    students: 642,
    plan: "Growth",
    status: "Active",
    mrr: 1450,
  },
  {
    id: "T-004",
    name: "MathLab Pro",
    country: "USA",
    students: 980,
    plan: "Growth",
    status: "Trial",
    mrr: 0,
  },
  {
    id: "T-005",
    name: "Lingua Vista",
    country: "France",
    students: 412,
    plan: "Starter",
    status: "Active",
    mrr: 320,
  },
  /* Local institutes used by the multi-enrolment demo (Oliver + Olivia). */
  {
    id: "T-006",
    name: "Royal Vista College",
    country: "Sri Lanka",
    students: 1840,
    plan: "Enterprise",
    status: "Active",
    mrr: 4200,
  },
  {
    id: "T-007",
    name: "Apex Tuition Hub",
    country: "Sri Lanka",
    students: 760,
    plan: "Growth",
    status: "Active",
    mrr: 1850,
  },
  {
    id: "T-008",
    name: "LittleSparks Academy",
    country: "Sri Lanka",
    students: 320,
    plan: "Growth",
    status: "Active",
    mrr: 980,
  },
];

/* Each platform user belongs to a tenant (institutionId). The global admin
 * (Isla) has no institutionId and sees everyone; institute admins see only
 * users tagged with their own institutionId. Cross-institute users like a
 * parent are tagged to the institute that originated the account so the
 * institute admin can still see the parent of one of their pupils. */
export interface PlatformUserRow {
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  mfa: boolean;
  institutionId?: string;
  institutionName?: string;
  /** Tags a user to a programme/team (e.g. the swim club) so a programme admin
   *  can filter Users & Roles to just their staff. */
  program?: "Swim";
}

export const platformUsers: PlatformUserRow[] = [
  /* Global admin — no institute affiliation. */
  {
    name: "Isla Williams",
    email: "priya@platform.io",
    role: "Super Admin",
    lastLogin: "10 min ago",
    mfa: true,
  },

  /* Royal Vista College (T-006) — staff Jacob manages directly. */
  {
    name: "Jacob Wilson",
    email: "principal@royalvista.com",
    role: "Institute Admin",
    lastLogin: "1 min ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    name: "Mrs. Erin Dawson",
    email: "lalani@royalvista.com",
    role: "Teacher",
    lastLogin: "12 min ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    name: "Counselor Ella Cox",
    email: "riya@royalvista.com",
    role: "Counselor",
    lastLogin: "3h ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    name: "Molly Reid",
    email: "finance@royalvista.com",
    role: "Finance Officer",
    lastLogin: "45 min ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    name: "Oliver Smith",
    email: "aarav@royalvista.com",
    role: "Student",
    lastLogin: "5 min ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    name: "Isabella Evans",
    email: "sara@royalvista.com",
    role: "Student",
    lastLogin: "1h ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    name: "Jack Smith",
    email: "jack.smith@gmail.com",
    role: "Parent",
    lastLogin: "1d ago",
    mfa: false,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },

  /* Global Coaching Hub (T-001). */
  {
    name: "Dr. Charlie Brown",
    email: "saman@gch.lk",
    role: "Teacher",
    lastLogin: "2h ago",
    mfa: true,
    institutionId: "T-001",
    institutionName: "Global Coaching Hub",
  },
  {
    name: "Martin Marketing",
    email: "rajiv@gch.lk",
    role: "Marketing Officer",
    lastLogin: "30 min ago",
    mfa: true,
    institutionId: "T-001",
    institutionName: "Global Coaching Hub",
  },

  /* Apex Tuition Hub (T-007). */
  {
    name: "Mr. David Freeman",
    email: "asanka@apextuition.lk",
    role: "Teacher",
    lastLogin: "4h ago",
    mfa: true,
    institutionId: "T-007",
    institutionName: "Apex Tuition Hub",
  },

  /* LittleSparks Academy (T-008). */
  {
    name: "Ms. Holly Riley",
    email: "chandrika@littlesparks.lk",
    role: "Teacher",
    lastLogin: "6h ago",
    mfa: true,
    institutionId: "T-008",
    institutionName: "LittleSparks Academy",
  },

  /* BrightPath Institute (T-003). */
  {
    name: "Ms. Abigail Hardy",
    email: "chathuri@brightpath.ae",
    role: "Teacher",
    lastLogin: "1d ago",
    mfa: true,
    institutionId: "T-003",
    institutionName: "BrightPath Institute",
  },
];

export const auditLog = [
  {
    time: "11:42 AM",
    actor: "priya@platform.io",
    action: "Updated tenant plan",
    target: "T-003 BrightPath",
    severity: "info",
  },
  {
    time: "10:15 AM",
    actor: "saman@gch.lk",
    action: "Published grades",
    target: "PHY-12 Mid Term",
    severity: "info",
  },
  {
    time: "09:01 AM",
    actor: "system",
    action: "Backup completed",
    target: "tenant-data-eu",
    severity: "success",
  },
  {
    time: "Yesterday",
    actor: "unknown",
    action: "Failed MFA attempt",
    target: "admin@demo.com",
    severity: "warning",
  },
  {
    time: "Yesterday",
    actor: "rajiv@gch.lk",
    action: "Exported lead list",
    target: "leads-q2.csv",
    severity: "info",
  },
];

export const aiInsights = [
  {
    title: "12 students predicted at risk of failing",
    desc: "Combined Maths cohort — pattern: attendance < 70% and weak quiz scores.",
    action: "Schedule counselor intervention",
    confidence: 0.87,
    severity: "high",
  },
  {
    title: "Course recommendation for Oliver Smith",
    desc: "Based on performance, suggest 'AP Calculus BC Crash Course' from marketplace.",
    action: "Send recommendation",
    confidence: 0.92,
    severity: "info",
  },
  {
    title: "Dropout risk: James Roberts",
    desc: "Behavioural + attendance + finance signals indicate elevated risk.",
    action: "Notify parent + counselor",
    confidence: 0.79,
    severity: "high",
  },
  {
    title: "Optimal exam date suggestion",
    desc: "Model predicts 14% higher pass rate if mid-term moved to June 18.",
    action: "Propose to academic board",
    confidence: 0.71,
    severity: "info",
  },
];

export const children = [
  {
    id: "S-1001",
    name: "Oliver Smith",
    grade: "Grade 12 — Science",
    attendance: 94,
    gpa: 3.8,
    nextClass: "A/L Physics (Global Coaching Hub) @ 4 PM",
    duesUSD: 510,
  },
  {
    id: "S-1009",
    name: "Olivia Smith",
    grade: "Grade 8",
    attendance: 97,
    gpa: 3.7,
    nextClass: "Math Coaching (Apex Tuition Hub) @ 10 AM Sat",
    duesUSD: 140,
  },
];

export const teacherClasses = [
  {
    id: "PHY-12",
    name: "Advanced Physics",
    batch: "Science-A",
    students: 42,
    nextSession: "Today 4:00 PM",
    room: "Lab 3 / Zoom",
  },
  {
    id: "PHY-11",
    name: "Physics Foundations",
    batch: "Science-B",
    students: 38,
    nextSession: "Tomorrow 10:00 AM",
    room: "Room 2B",
  },
  {
    id: "PHY-AL",
    name: "A/L Revision Cohort",
    batch: "Revision",
    students: 64,
    nextSession: "Sat 9:00 AM",
    room: "Hall + Zoom",
  },
];

export const attendanceTrend = [
  { week: "W1", rate: 92 },
  { week: "W2", rate: 89 },
  { week: "W3", rate: 94 },
  { week: "W4", rate: 88 },
  { week: "W5", rate: 91 },
  { week: "W6", rate: 95 },
  { week: "W7", rate: 93 },
  { week: "W8", rate: 90 },
];

export const revenueTrend = [
  { m: "Jan", v: 42 },
  { m: "Feb", v: 51 },
  { m: "Mar", v: 58 },
  { m: "Apr", v: 62 },
  { m: "May", v: 71 },
  { m: "Jun", v: 79 },
];

export type SrbType =
  | "homework"
  | "behavior"
  | "achievement"
  | "health"
  | "permission"
  | "communication"
  | "remark";

export interface SrbReply {
  id: string;
  authorName: string;
  authorRole: "teacher" | "parent" | "student" | "counselor" | "admin";
  text: string;
  at: string; // ISO
}

export interface SrbEntry {
  id: string;
  studentId: string;
  studentName: string;
  authorName: string;
  authorRole: "teacher" | "parent" | "student" | "counselor" | "admin";
  type: SrbType;
  title: string;
  body: string;
  date: string; // ISO timestamp
  pinned?: boolean;
  requiresAck?: boolean;
  ackBy?: string;
  ackAt?: string;
  replies?: SrbReply[];
  /* Institute this entry belongs to. Optional for back-compat, but the parent
   * UI uses it to file each entry under the right institute card (main school
   * notes don't bleed into tuition-class threads and vice versa). */
  institutionId?: string;
  institutionName?: string;
  /* Swim-club tagging. When an entry is posted from a swim session it carries
   * the club course id (so swim views can show swim-only records) and the
   * originating session. A coach may also attach a 1–5 performance rating for
   * the swimmer — surfaced in the club summary reports as "swimmers rated". */
  courseId?: string;
  sessionId?: string;
  rating?: number;
}

const today = new Date();
const d = (offsetDays: number, hour = 9, minute = 0): string => {
  const x = new Date(today);
  x.setDate(x.getDate() - offsetDays);
  x.setHours(hour, minute, 0, 0);
  return x.toISOString();
};

export const srbEntries: SrbEntry[] = [
  {
    id: "SRB-501",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    authorName: "Dr. Charlie Brown",
    authorRole: "teacher",
    type: "permission",
    title: "Field trip — Planetarium (Jun 14)",
    body: "We're visiting the Colombo Planetarium on Friday, 14 June, 8 AM – 1 PM. Please acknowledge before Wednesday. Bus departs from the main gate. Pack a snack and water bottle.",
    date: d(0, 8, 12),
    pinned: true,
    requiresAck: true,
    replies: [],
    institutionId: "T-001",
    institutionName: "Global Coaching Hub",
  },
  {
    id: "SRB-502",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    authorName: "Dr. Charlie Brown",
    authorRole: "teacher",
    type: "achievement",
    title: "Top score in physics quiz",
    body: "Oliver scored 49/50 on this week's Quantum Mechanics quiz — class average was 36/50. Excellent grasp of wave-particle duality. Keep it up!",
    date: d(1, 14, 30),
    replies: [
      {
        id: "r1",
        authorName: "Jack Smith",
        authorRole: "parent",
        text: "Thank you for letting us know! We'll celebrate at dinner tonight.",
        at: d(1, 18, 5),
      },
    ],
    ackBy: "Jack Smith",
    ackAt: d(1, 18, 0),
    institutionId: "T-001",
    institutionName: "Global Coaching Hub",
  },
  {
    id: "SRB-503",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    authorName: "Mrs. Erin Dawson",
    authorRole: "teacher",
    type: "homework",
    title: "Chemistry: Lab report due Friday",
    body: "Write up the alkene addition experiment we did today. 2–3 pages with hand-drawn mechanisms. Due Friday 8 AM.",
    date: d(2, 15, 0),
    ackBy: "Jack Smith",
    ackAt: d(2, 19, 22),
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    id: "SRB-504",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    authorName: "Counselor Ella Cox",
    authorRole: "counselor",
    type: "remark",
    title: "Counseling check-in — June",
    body: "Had our monthly chat. Oliver is feeling positive about A/Ls and has joined the chess club. No concerns at this time.",
    date: d(4, 11, 0),
    replies: [],
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    id: "SRB-505",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    authorName: "Jack Smith",
    authorRole: "parent",
    type: "communication",
    title: "Oliver will be 15 min late tomorrow",
    body: "We have a dental appointment in the morning. Oliver will join the second period. Apologies for the late notice.",
    date: d(3, 20, 30),
    replies: [
      {
        id: "r2",
        authorName: "Dr. Charlie Brown",
        authorRole: "teacher",
        text: "Noted, no problem. I'll share the morning's notes with him.",
        at: d(3, 21, 0),
      },
    ],
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    id: "SRB-506",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    authorName: "School Nurse",
    authorRole: "admin",
    type: "health",
    title: "Routine vision screening — passed",
    body: "Annual vision screening completed. Result: 20/20 both eyes. No further action.",
    date: d(7, 10, 15),
    institutionId: "T-006",
    institutionName: "Royal Vista College",
  },
  {
    id: "SRB-507",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    authorName: "Mr. David Freeman",
    authorRole: "teacher",
    type: "behavior",
    title: "Excellent group leadership",
    body: "Oliver led the maths problem-solving group today and helped two classmates understand integration. Strong collaborative behaviour.",
    date: d(5, 13, 45),
    ackBy: "Jack Smith",
    ackAt: d(5, 18, 22),
    institutionId: "T-007",
    institutionName: "Apex Tuition Hub",
  },
  {
    id: "SRB-508",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    authorName: "Ms. Abigail Hardy",
    authorRole: "teacher",
    type: "homework",
    title: "IELTS — Mock test scheduled Saturday",
    body: "Full timed mock test (Listening + Reading) on Saturday 6 PM. Bring HB pencils and headphones. We'll review band scores next Tue.",
    date: d(2, 11, 30),
    requiresAck: true,
    institutionId: "T-003",
    institutionName: "BrightPath Institute",
  },
  {
    id: "SRB-509",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    authorName: "Mr. David Freeman",
    authorRole: "teacher",
    type: "achievement",
    title: "Integration paper — 92/100",
    body: "Oliver's June practice paper on integration techniques scored 92/100 — second-highest in the Saturday cohort. Well done!",
    date: d(6, 10, 0),
    institutionId: "T-007",
    institutionName: "Apex Tuition Hub",
  },
  /* Olivia Smith — second child for the demo parent */
  {
    id: "SRB-510",
    studentId: "S-1009",
    studentName: "Olivia Smith",
    authorName: "Ms. Holly Riley",
    authorRole: "teacher",
    type: "homework",
    title: "English: Read chapters 4–6 by Monday",
    body: "Reading assignment from 'The Giver'. Be ready to discuss the role of Sameness in the community.",
    date: d(1, 16, 0),
    institutionId: "T-008",
    institutionName: "LittleSparks Academy",
  },
  {
    id: "SRB-511",
    studentId: "S-1009",
    studentName: "Olivia Smith",
    authorName: "Ms. Holly Riley",
    authorRole: "teacher",
    type: "achievement",
    title: "Story-writing competition: 2nd place",
    body: "Olivia's short story 'The Lantern Keeper' placed 2nd in the inter-school writing contest. A certificate will follow.",
    date: d(6, 9, 30),
    replies: [
      {
        id: "r3",
        authorName: "Jack Smith",
        authorRole: "parent",
        text: "🎉 So proud of her! Thank you for encouraging her.",
        at: d(6, 12, 12),
      },
    ],
    ackBy: "Jack Smith",
    ackAt: d(6, 12, 0),
    institutionId: "T-008",
    institutionName: "LittleSparks Academy",
  },
  {
    id: "SRB-512",
    studentId: "S-1009",
    studentName: "Olivia Smith",
    authorName: "Ms. Holly Riley",
    authorRole: "teacher",
    type: "behavior",
    title: "Disrupting class — June 5",
    body: "Olivia was chatting during the silent reading period and needed two reminders. Please have a brief conversation at home.",
    date: d(8, 11, 0),
    requiresAck: true,
    institutionId: "T-008",
    institutionName: "LittleSparks Academy",
  },
  {
    id: "SRB-513",
    studentId: "S-1009",
    studentName: "Olivia Smith",
    authorName: "Mr. Simon Warren",
    authorRole: "teacher",
    type: "homework",
    title: "Algebra practice sheet · Sat",
    body: "Please complete questions 1–12 on page 34 before Saturday's class. We'll review the harder word-problems together.",
    date: d(2, 14, 0),
    institutionId: "T-007",
    institutionName: "Apex Tuition Hub",
  },
  /* A couple of entries for at-risk James for the teacher demo */
  {
    id: "SRB-520",
    studentId: "S-1005",
    studentName: "James Roberts",
    authorName: "Dr. Charlie Brown",
    authorRole: "teacher",
    type: "remark",
    title: "Attendance concern — please call us",
    body: "James has missed 4 consecutive physics classes. Could we set up a parent-teacher call this week?",
    date: d(2, 17, 30),
    pinned: true,
    requiresAck: true,
    institutionId: "T-001",
    institutionName: "Global Coaching Hub",
  },
  {
    id: "SRB-521",
    studentId: "S-1005",
    studentName: "James Roberts",
    authorName: "Counselor Ella Cox",
    authorRole: "counselor",
    type: "communication",
    title: "Wellness check-in scheduled",
    body: "I've blocked 30 minutes on Thursday at 11 AM for a check-in with James. Parents are welcome to join.",
    date: d(3, 14, 0),
    institutionId: "T-007",
    institutionName: "Apex Tuition Hub",
  },

  /* ── Emily Taylor (S-2001) — adult, self-managed (18+) student ───────────
   * Her record book has no guardian in the loop: she authors her own
   * communications, acknowledges entries herself, and is billed self-service.
   * All entries sit at her home institute (EduStar International, T-002). They
   * also foreshadow the cross-tenant enrolment flow she approves herself. */
  {
    id: "SRB-540",
    studentId: "S-2001",
    studentName: "Emily Taylor",
    authorName: "Dr. Sienna Reed",
    authorRole: "teacher",
    type: "achievement",
    title: "Top of the Foundation cohort — Chemistry",
    body: "Emily scored 96/100 in the Foundation Chemistry mid-module — the highest in the cohort. Excellent lab technique and written analysis.",
    date: d(2, 14, 0),
    institutionId: "T-002",
    institutionName: "EduStar International",
  },
  {
    id: "SRB-541",
    studentId: "S-2001",
    studentName: "Emily Taylor",
    authorName: "Lab Office",
    authorRole: "admin",
    type: "permission",
    title: "Lab safety induction — please confirm",
    body: "Mandatory lab safety induction before this term's practicals. As a self-managed (18+) student you confirm your own attendance here — no guardian sign-off is required.",
    date: d(1, 9, 0),
    pinned: true,
    requiresAck: true,
    institutionId: "T-002",
    institutionName: "EduStar International",
  },
  {
    id: "SRB-542",
    studentId: "S-2001",
    studentName: "Emily Taylor",
    authorName: "Emily Taylor",
    authorRole: "student",
    type: "communication",
    title: "Will miss Friday's lab — medical appointment",
    body: "I have a medical appointment on Friday morning and will miss the 9 AM practical. I'll catch up on the worksheet over the weekend. (Managing this myself — no guardian on file.)",
    date: d(1, 8, 20),
    replies: [
      {
        id: "r-se1",
        authorName: "Dr. Sienna Reed",
        authorRole: "teacher",
        text: "Thanks for letting me know, Emily. I'll set the worksheet aside for you.",
        at: d(1, 10, 0),
      },
    ],
    institutionId: "T-002",
    institutionName: "EduStar International",
  },
  {
    id: "SRB-543",
    studentId: "S-2001",
    studentName: "Emily Taylor",
    authorName: "EduStar Finance",
    authorRole: "admin",
    type: "communication",
    title: "Self-service billing active",
    body: "Your account is set to self-managed billing. Invoices and reminders go directly to you, and you authorise your own course enrolments and payments.",
    date: d(5, 11, 0),
    institutionId: "T-002",
    institutionName: "EduStar International",
  },
  {
    id: "SRB-544",
    studentId: "S-2001",
    studentName: "Emily Taylor",
    authorName: "Ms. Hannah Coleman",
    authorRole: "counselor",
    type: "remark",
    title: "Pathway check-in — adding an external A/L class",
    body: "Discussed Emily's plan to add an A/L Chemistry class at another institute. She'll approve any cross-institute enrolment herself via 1StudentID (OTP / one-click). No concerns.",
    date: d(6, 13, 0),
    institutionId: "T-002",
    institutionName: "EduStar International",
  },
  /* Teacher ⇄ adult-student two-way thread used to demo cross-account SRB
   * chat: posted by the demo teacher login (Dr. Charlie Brown, teacher@demo.com)
   * on the adult, self-managed student Emily (adult@demo.com / S-2001). Both
   * accounts see — and can answer — the same thread, which persists across
   * logins until the demo is reset. */
  {
    id: "SRB-545",
    studentId: "S-2001",
    studentName: "Emily Taylor",
    authorName: "Dr. Charlie Brown",
    authorRole: "teacher",
    type: "communication",
    title: "A/L Physics revision — can you join Monday's live class?",
    body: "Hi Emily — you asked about adding A/L Physics revision. I run a live online class Mon/Wed 4 PM. Please confirm here if you'd like a seat and I'll share the joining link. (Reply right here — this thread stays in your record book.)",
    date: d(1, 16, 30),
    requiresAck: true,
    replies: [
      {
        id: "r-se2",
        authorName: "Emily Taylor",
        authorRole: "student",
        text: "Yes please, Monday works for me. I'll manage the enrolment and fee myself — please send the link. Thank you!",
        at: d(1, 17, 10),
      },
    ],
    institutionId: "T-001",
    institutionName: "Global Coaching Hub",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Teacher Appraisal (separately-purchasable add-on module)
 *
 * Parents — and adult, self-managed students — star-rate and comment on the
 * teachers/coaches who teach them. Each teacher also carries student-outcome
 * signals (avg GPA of their students, exam pass-rate, attendance) which are
 * blended with the submitted stars into a single appraisal score. The blended
 * score is shown to the teacher (self-reflection), admins (staffing decisions),
 * and parents/students (choosing teachers & courses). See computeAppraisal()
 * in src/lib/appraisal.ts for the weighting.
 * ──────────────────────────────────────────────────────────────────────── */
export interface Teacher {
  id: string;
  name: string;
  subject: string;
  institutionId: string;
  institutionName: string;
  photo: string;
  experienceYears: number;
  /** Student-outcome signals — the "performance" half of the appraisal. */
  avgStudentGpa: number; // 0–4
  passRate: number; // 0–100 (% of students passing)
  attendanceRate: number; // 0–100 (% class attendance)
}

export const teachers: Teacher[] = [
  {
    id: "TCH-01",
    name: "Dr. Charlie Brown",
    subject: "Physics",
    institutionId: "T-001",
    institutionName: "Global Coaching Hub",
    photo: portrait("men/45.jpg"),
    experienceYears: 12,
    avgStudentGpa: 3.6,
    passRate: 94,
    attendanceRate: 92,
  },
  {
    id: "TCH-02",
    name: "Mrs. Erin Dawson",
    subject: "Chemistry",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    photo: portrait("women/68.jpg"),
    experienceYears: 9,
    avgStudentGpa: 3.4,
    passRate: 90,
    attendanceRate: 89,
  },
  {
    id: "TCH-03",
    name: "Mr. David Freeman",
    subject: "Combined Maths",
    institutionId: "T-007",
    institutionName: "Apex Tuition Hub",
    photo: portrait("men/41.jpg"),
    experienceYears: 15,
    avgStudentGpa: 3.8,
    passRate: 96,
    attendanceRate: 95,
  },
  {
    id: "TCH-04",
    name: "Ms. Holly Riley",
    subject: "English Literature",
    institutionId: "T-008",
    institutionName: "LittleSparks Academy",
    photo: portrait("women/52.jpg"),
    experienceYears: 7,
    avgStudentGpa: 3.5,
    passRate: 91,
    attendanceRate: 93,
  },
  {
    id: "TCH-05",
    name: "Dr. Daisy Fisher",
    subject: "Biology",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    photo: portrait("women/65.jpg"),
    experienceYears: 11,
    avgStudentGpa: 3.3,
    passRate: 88,
    attendanceRate: 90,
  },
  {
    id: "TCH-06",
    name: "Ms. Abigail Hardy",
    subject: "IELTS / English",
    institutionId: "T-003",
    institutionName: "BrightPath Institute",
    photo: portrait("women/44.jpg"),
    experienceYears: 6,
    avgStudentGpa: 3.2,
    passRate: 86,
    attendanceRate: 88,
  },
  {
    id: "TCH-07",
    name: "Mr. Paul Bradley",
    subject: "ICT",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    photo: portrait("men/36.jpg"),
    experienceYears: 8,
    avgStudentGpa: 3.5,
    passRate: 92,
    attendanceRate: 87,
  },
  {
    id: "TCH-08",
    name: "Dr. Sienna Reed",
    subject: "Chemistry (Foundation)",
    institutionId: "T-002",
    institutionName: "EduStar International",
    photo: portrait("women/30.jpg"),
    experienceYears: 10,
    avgStudentGpa: 3.7,
    passRate: 93,
    attendanceRate: 91,
  },
  /* Swim Academy coaches (Royal Vista Aquatics, T-006). Ava is also the
   * coach demo login. Performance signals here read as squad outcomes. */
  {
    id: "TCH-09",
    name: "Coach Ava Johnson",
    subject: "Swimming · Head Coach",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    photo: portrait("women/63.jpg"),
    experienceYears: 14,
    avgStudentGpa: 3.7,
    passRate: 95,
    attendanceRate: 94,
  },
  {
    id: "TCH-10",
    name: "Coach Thomas Robinson",
    subject: "Swimming · Squad",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    photo: portrait("men/26.jpg"),
    experienceYears: 8,
    avgStudentGpa: 3.5,
    passRate: 92,
    attendanceRate: 90,
  },
  {
    id: "TCH-11",
    name: "Coach Poppy Wright",
    subject: "Swimming · Learn-to-Swim",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    photo: portrait("women/48.jpg"),
    experienceYears: 6,
    avgStudentGpa: 3.6,
    passRate: 93,
    attendanceRate: 92,
  },
  {
    id: "TCH-12",
    name: "Coach Oscar Thompson",
    subject: "Swimming · Stroke & Dive",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    photo: portrait("men/64.jpg"),
    experienceYears: 11,
    avgStudentGpa: 3.4,
    passRate: 90,
    attendanceRate: 88,
  },
];

export const teacherByName: Record<string, Teacher> = Object.fromEntries(
  teachers.map((t) => [t.name, t]),
);

export interface TeacherRating {
  id: string;
  teacherId: string;
  teacherName: string;
  authorName: string;
  authorRole: "parent" | "student";
  stars: number; // 1–5
  comment: string;
  at: string; // ISO
  /** For a parent rating: the child whose class informed the review. */
  childName?: string;
  /** A parent may submit anonymously — the coach then can't see who wrote it or
   *  the child, but the club admin still can (for accountability). */
  anonymous?: boolean;
}

export const teacherRatings: TeacherRating[] = [
  {
    id: "TR-001",
    teacherId: "TCH-01",
    teacherName: "Dr. Charlie Brown",
    authorName: "Jack Smith",
    authorRole: "parent",
    stars: 5,
    comment:
      "Oliver's physics has transformed this year. Dr. Silva explains hard concepts clearly and always replies to our record-book notes quickly.",
    at: d(3, 19, 0),
    childName: "Oliver Smith",
  },
  {
    id: "TR-002",
    teacherId: "TCH-01",
    teacherName: "Dr. Charlie Brown",
    authorName: "Nicholas Murphy",
    authorRole: "parent",
    stars: 4,
    comment:
      "Very knowledgeable and patient. Would love a little more written feedback on practice papers.",
    at: d(8, 11, 0),
    childName: "James Roberts",
  },
  {
    id: "TR-003",
    teacherId: "TCH-01",
    teacherName: "Dr. Charlie Brown",
    authorName: "Emily Taylor",
    authorRole: "student",
    stars: 5,
    comment:
      "Joined his online revision as a self-managed student — fantastic pace and the recordings are a lifesaver.",
    at: d(2, 9, 30),
  },
  {
    id: "TR-004",
    teacherId: "TCH-03",
    teacherName: "Mr. David Freeman",
    authorName: "Jack Smith",
    authorRole: "parent",
    stars: 5,
    comment:
      "Best maths coach we've had. Oliver scored 92 on the integration paper after just one term.",
    at: d(5, 18, 0),
    childName: "Oliver Smith",
  },
  {
    id: "TR-005",
    teacherId: "TCH-03",
    teacherName: "Mr. David Freeman",
    authorName: "Neil Vaughan",
    authorRole: "parent",
    stars: 5,
    comment: "Exceptional. Clear weekly targets and the Saturday cohort keeps the kids motivated.",
    at: d(12, 10, 0),
    childName: "Dylan Sharp",
  },
  {
    id: "TR-006",
    teacherId: "TCH-04",
    teacherName: "Ms. Holly Riley",
    authorName: "Jack Smith",
    authorRole: "parent",
    stars: 5,
    comment:
      "Olivia's writing placed 2nd in the inter-school contest under Ms. Soysa's guidance. Wonderful encouragement.",
    at: d(6, 12, 30),
    childName: "Olivia Smith",
  },
  {
    id: "TR-007",
    teacherId: "TCH-02",
    teacherName: "Mrs. Erin Dawson",
    authorName: "Jack Smith",
    authorRole: "parent",
    stars: 4,
    comment: "Organised and thorough chemistry teaching. Lab reports feedback is detailed.",
    at: d(4, 20, 0),
    childName: "Oliver Smith",
  },
  {
    id: "TR-008",
    teacherId: "TCH-02",
    teacherName: "Mrs. Erin Dawson",
    authorName: "Connor Booth",
    authorRole: "parent",
    stars: 4,
    comment: "Good teacher, my daughter enjoys the practicals.",
    at: d(10, 9, 0),
    childName: "Isabella Evans",
  },
  {
    id: "TR-009",
    teacherId: "TCH-06",
    teacherName: "Ms. Abigail Hardy",
    authorName: "Jack Smith",
    authorRole: "parent",
    stars: 4,
    comment: "IELTS prep is well structured. Mock tests every week are very useful.",
    at: d(7, 16, 0),
    childName: "Oliver Smith",
  },
  {
    id: "TR-010",
    teacherId: "TCH-08",
    teacherName: "Dr. Sienna Reed",
    authorName: "Emily Taylor",
    authorRole: "student",
    stars: 5,
    comment:
      "Top of the Foundation cohort thanks to her clear lab teaching. Highly recommend for Chemistry.",
    at: d(3, 14, 0),
  },
  {
    id: "TR-011",
    teacherId: "TCH-05",
    teacherName: "Dr. Daisy Fisher",
    authorName: "Mia Jackson",
    authorRole: "parent",
    stars: 4,
    comment: "Sophie loves biology now. Cell systems were made so approachable.",
    at: d(9, 11, 0),
    childName: "Sophie White",
  },
  /* ── Swim Academy coach ratings (parents rating coaches) ── */
  {
    id: "TR-101",
    teacherId: "TCH-09",
    teacherName: "Coach Ava Johnson",
    authorName: "Jack Smith",
    authorRole: "parent",
    stars: 5,
    comment:
      "Oliver's freestyle has come on hugely under Coach Ava. She pushes the squad hard but the kids adore her, and her record-book notes after every session are brilliant.",
    at: d(4, 19, 0),
    childName: "Oliver Smith",
  },
  {
    id: "TR-102",
    teacherId: "TCH-09",
    teacherName: "Coach Ava Johnson",
    authorName: "Scott Hill",
    authorRole: "parent",
    stars: 5,
    comment: "Henry dropped two seconds off her 100m this term. Fantastic squad coaching.",
    at: d(12, 18, 30),
    childName: "Henry Green",
  },
  {
    id: "TR-103",
    teacherId: "TCH-11",
    teacherName: "Coach Poppy Wright",
    authorName: "Jack Smith",
    authorRole: "parent",
    stars: 5,
    comment:
      "Olivia was terrified of water and now swims 10m on her own. Coach Poppy is so patient and gentle with the little ones.",
    at: d(1, 19, 30),
    childName: "Olivia Smith",
  },
  {
    id: "TR-104",
    teacherId: "TCH-11",
    teacherName: "Coach Poppy Wright",
    authorName: "Mia Jackson",
    authorRole: "parent",
    stars: 4,
    comment: "Lovely with beginners. Sophie looks forward to Learn-to-Swim every week.",
    at: d(10, 10, 0),
    childName: "Sophie White",
  },
  {
    id: "TR-105",
    teacherId: "TCH-10",
    teacherName: "Coach Thomas Robinson",
    authorName: "Logan Baker",
    authorRole: "parent",
    stars: 4,
    comment: "Great technical eye — Michael's butterfly timing has really improved.",
    at: d(7, 17, 0),
    childName: "Michael Johnson",
  },
  {
    id: "TR-106",
    teacherId: "TCH-12",
    teacherName: "Coach Oscar Thompson",
    authorName: "Nigel Wright",
    authorRole: "parent",
    stars: 4,
    comment: "Diving basics taught safely and confidently. Florence feels secure on the board.",
    at: d(15, 16, 0),
    childName: "Florence Stevens",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Teacher Training / CPD (separate module)
 *
 * Teachers, coaches and trainers enrol in professional-development courses and
 * participate AS STUDENTS — they progress through lessons, track completion and
 * earn certificates. Kept deliberately separate from the student-facing LMS.
 * Demonstrated with the existing teacher account (Dr. Charlie Brown), who has one
 * course already in progress so the screen looks lived-in.
 * ──────────────────────────────────────────────────────────────────────── */
export interface TrainingLesson {
  id: string;
  title: string;
  minutes: number;
}

export interface TrainingCourse {
  id: string;
  title: string;
  provider: string;
  category: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  hours: number;
  rating: number;
  enrolledCount: number;
  certificate: boolean;
  blurb: string;
  lessons: TrainingLesson[];
  /* Discipline-specific CPD. Swim coaches see aquatics education instead of the
   * generic classroom-teaching catalogue. */
  discipline?: "Swimming";
}

const lessons = (titles: Array<[string, number]>): TrainingLesson[] =>
  titles.map(([title, minutes], i) => ({ id: `L${i + 1}`, title, minutes }));

export const trainingCourses: TrainingCourse[] = [
  {
    id: "TRN-CM01",
    title: "Classroom Management Essentials",
    provider: "1StudentID Academy",
    category: "Pedagogy",
    level: "Foundation",
    hours: 4,
    rating: 4.8,
    enrolledCount: 1284,
    certificate: true,
    blurb:
      "Practical routines for engagement, behaviour and a calm, focused classroom — online or in person.",
    lessons: lessons([
      ["Setting expectations from day one", 18],
      ["De-escalation & positive reinforcement", 22],
      ["Managing the hybrid / online room", 20],
      ["Building classroom routines that stick", 16],
      ["Assessment of the management plan", 14],
    ]),
  },
  {
    id: "TRN-AFL",
    title: "Assessment for Learning",
    provider: "Cambridge PD",
    category: "Assessment",
    level: "Intermediate",
    hours: 6,
    rating: 4.9,
    enrolledCount: 962,
    certificate: true,
    blurb: "Use formative assessment, feedback and rubrics to move every learner forward.",
    lessons: lessons([
      ["Formative vs summative — when to use what", 20],
      ["Writing effective rubrics", 24],
      ["Feedback that changes outcomes", 22],
      ["Questioning techniques", 18],
      ["Data-informed reteaching", 26],
    ]),
  },
  {
    id: "TRN-EDT",
    title: "EdTech Tools for Modern Teaching",
    provider: "1StudentID Academy",
    category: "Technology",
    level: "Foundation",
    hours: 3,
    rating: 4.6,
    enrolledCount: 1731,
    certificate: true,
    blurb: "Run engaging live classes, build interactive content and automate the busywork.",
    lessons: lessons([
      ["Live classes & recordings done right", 16],
      ["Interactive content & quizzes", 18],
      ["Automating grading & attendance", 20],
      ["Accessibility in digital learning", 15],
    ]),
  },
  {
    id: "TRN-INC",
    title: "Inclusive Education & Differentiation",
    provider: "UNESCO Learning",
    category: "Inclusion",
    level: "Intermediate",
    hours: 5,
    rating: 4.7,
    enrolledCount: 644,
    certificate: true,
    blurb: "Design lessons that reach diverse learners, including SEN and multilingual classrooms.",
    lessons: lessons([
      ["Universal Design for Learning", 22],
      ["Differentiating tasks & outcomes", 20],
      ["Supporting SEN learners", 24],
      ["Multilingual classroom strategies", 18],
      ["Inclusive assessment", 16],
    ]),
  },
  {
    id: "TRN-SAFE",
    title: "Child Safeguarding & Wellbeing",
    provider: "1StudentID Academy",
    category: "Compliance",
    level: "Foundation",
    hours: 2,
    rating: 4.9,
    enrolledCount: 2410,
    certificate: true,
    blurb: "Mandatory safeguarding fundamentals: recognising, responding and reporting concerns.",
    lessons: lessons([
      ["Your duty of care", 14],
      ["Recognising signs of harm", 18],
      ["Responding & reporting correctly", 16],
      ["Online safety & digital conduct", 12],
    ]),
  },
  {
    id: "TRN-LEAD",
    title: "From Teacher to Mentor: Coaching Skills",
    provider: "Cambridge PD",
    category: "Leadership",
    level: "Advanced",
    hours: 6,
    rating: 4.8,
    enrolledCount: 388,
    certificate: true,
    blurb: "Coach and mentor peers, run observations and lead professional learning communities.",
    lessons: lessons([
      ["The coaching mindset", 20],
      ["Lesson observation & feedback", 24],
      ["Running a PLC", 22],
      ["Mentoring early-career teachers", 20],
      ["Leading change in your department", 26],
    ]),
  },
  /* ── Aquatics CPD — the swim coach's "Coach Education" catalogue ── */
  {
    id: "TRN-LIFE",
    title: "Water Safety & Lifeguarding",
    provider: "Royal Life Saving",
    category: "Aquatics",
    level: "Foundation",
    hours: 8,
    rating: 4.9,
    enrolledCount: 512,
    certificate: true,
    discipline: "Swimming",
    blurb:
      "Poolside rescue, CPR and emergency response for swim coaches — the mandatory safety foundation for on-deck staff.",
    lessons: lessons([
      ["Duty of care & pool supervision", 18],
      ["Recognising a distressed swimmer", 20],
      ["Reach, throw & rescue techniques", 24],
      ["CPR & first aid for aquatic incidents", 26],
      ["Emergency action plans", 16],
    ]),
  },
  {
    id: "TRN-LTS",
    title: "Teaching Learn-to-Swim",
    provider: "Swim Coaching Academy",
    category: "Aquatics",
    level: "Foundation",
    hours: 6,
    rating: 4.8,
    enrolledCount: 734,
    certificate: true,
    discipline: "Swimming",
    blurb:
      "Structure beginner lessons that build water confidence, floating and kicking for young and nervous swimmers.",
    lessons: lessons([
      ["Water familiarisation & confidence", 18],
      ["Buoyancy, floating & gliding", 20],
      ["Introducing the kick & arm action", 22],
      ["Class management in shallow water", 16],
      ["Assessing beginner progression", 14],
    ]),
  },
  {
    id: "TRN-STRK",
    title: "Stroke Correction & Technique",
    provider: "Swim Coaching Academy",
    category: "Aquatics",
    level: "Intermediate",
    hours: 7,
    rating: 4.9,
    enrolledCount: 421,
    certificate: true,
    discipline: "Swimming",
    blurb:
      "Diagnose and fix faults across all four strokes using drills, video feedback and progressive corrections.",
    lessons: lessons([
      ["Freestyle & backstroke mechanics", 24],
      ["Breaststroke timing & pullouts", 22],
      ["Butterfly undulation & timing", 22],
      ["Using drills to correct faults", 20],
      ["Video analysis & feedback", 18],
    ]),
  },
  {
    id: "TRN-SQUAD",
    title: "Competitive Squad Coaching & Periodisation",
    provider: "World Aquatics Development",
    category: "Aquatics",
    level: "Advanced",
    hours: 10,
    rating: 4.7,
    enrolledCount: 268,
    certificate: true,
    discipline: "Swimming",
    blurb:
      "Plan training seasons, energy systems and race preparation for competitive squads targeting meets and galas.",
    lessons: lessons([
      ["Season planning & periodisation", 26],
      ["Energy systems & training zones", 24],
      ["Building aerobic & sprint sets", 22],
      ["Taper & race preparation", 20],
      ["Pace, splits & performance tracking", 24],
    ]),
  },
  {
    id: "TRN-AQSAFE",
    title: "Safeguarding in Aquatics",
    provider: "Royal Life Saving",
    category: "Aquatics",
    level: "Foundation",
    hours: 3,
    rating: 4.9,
    enrolledCount: 903,
    certificate: true,
    discipline: "Swimming",
    blurb:
      "Child protection for the pool environment: change-room protocols, appropriate contact and incident reporting.",
    lessons: lessons([
      ["Safe recruitment & codes of conduct", 14],
      ["Change-room & poolside protocols", 16],
      ["Appropriate physical support in water", 14],
      ["Recognising & reporting concerns", 16],
    ]),
  },
  {
    id: "TRN-MEET",
    title: "Swim Meet Officiating",
    provider: "World Aquatics Development",
    category: "Aquatics",
    level: "Intermediate",
    hours: 4,
    rating: 4.6,
    enrolledCount: 187,
    certificate: true,
    discipline: "Swimming",
    blurb:
      "Rules, timing and stroke judging to run fair club galas and time-trials with confidence.",
    lessons: lessons([
      ["Roles on the officiating team", 14],
      ["Stroke & turn judging", 20],
      ["Timing systems & recording", 16],
      ["Managing a club gala", 18],
    ]),
  },
];

export const trainingCourseById: Record<string, TrainingCourse> = Object.fromEntries(
  trainingCourses.map((c) => [c.id, c]),
);

export interface TrainingEnrollment {
  id: string;
  courseId: string;
  teacherName: string;
  enrolledAt: string; // ISO
  completedLessonIds: string[];
  status: "enrolled" | "in-progress" | "completed";
  certificateIssuedAt?: string; // ISO, set when 100% complete
}

export const trainingEnrollments: TrainingEnrollment[] = [
  /* The demo teacher is mid-way through Assessment for Learning … */
  {
    id: "TRE-001",
    courseId: "TRN-AFL",
    teacherName: "Dr. Charlie Brown",
    enrolledAt: d(9, 9, 0),
    completedLessonIds: ["L1", "L2", "L3"],
    status: "in-progress",
  },
  /* … and has already certified in Child Safeguarding. */
  {
    id: "TRE-002",
    courseId: "TRN-SAFE",
    teacherName: "Dr. Charlie Brown",
    enrolledAt: d(20, 10, 0),
    completedLessonIds: ["L1", "L2", "L3", "L4"],
    status: "completed",
    certificateIssuedAt: d(15, 14, 0),
  },
  /* Coach Ava — certified lifeguard, mid-way through stroke technique CPD. */
  {
    id: "TRE-003",
    courseId: "TRN-LIFE",
    teacherName: "Coach Ava Johnson",
    enrolledAt: d(40, 9, 0),
    completedLessonIds: ["L1", "L2", "L3", "L4", "L5"],
    status: "completed",
    certificateIssuedAt: d(28, 15, 0),
  },
  {
    id: "TRE-004",
    courseId: "TRN-STRK",
    teacherName: "Coach Ava Johnson",
    enrolledAt: d(12, 9, 0),
    completedLessonIds: ["L1", "L2"],
    status: "in-progress",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Courses with MANY instructors + venue/sessions — the Swimming Academy demo.
 *
 * A class/course at an institution may be led by one OR several coaches. A
 * swimming club is the clearest example: a large pool is divided into zones and
 * lanes so SEVERAL sessions run at once, each with its own coach(es) and group
 * of swimmers who need close attention. We model the pool, its zones/lanes, the
 * club (a multi-coach course), and its weekly sessions. Admins/coaches get a
 * holistic pool-layout view of the day; a session opens to a full page where
 * coaches mark attendance + post record-book notes and swimmers/parents see
 * only their own details.
 * ──────────────────────────────────────────────────────────────────────── */
export interface PoolZone {
  id: string;
  label: string;
  /** Lane span this zone covers in the pool (1-indexed, inclusive). */
  laneFrom: number;
  laneTo: number;
  depth: string; // e.g. "1.0–1.2 m"
}

export interface Pool {
  id: string;
  name: string;
  institutionId: string;
  institutionName: string;
  lanes: number;
  lengthM: number;
  zones: PoolZone[];
}

export const pools: Pool[] = [
  {
    id: "POOL-OLY",
    name: "Olympic Pool",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    lanes: 8,
    lengthM: 50,
    zones: [
      { id: "z-lap", label: "Lap Lanes", laneFrom: 1, laneTo: 4, depth: "1.8–2.0 m" },
      {
        id: "z-learn",
        label: "Learn-to-Swim (Shallow)",
        laneFrom: 5,
        laneTo: 6,
        depth: "0.9–1.2 m",
      },
      { id: "z-dive", label: "Deep / Diving", laneFrom: 7, laneTo: 8, depth: "3.0–5.0 m" },
    ],
  },
  {
    id: "POOL-TRN",
    name: "Training Pool",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    lanes: 4,
    lengthM: 25,
    zones: [{ id: "z-trn", label: "Training Pool", laneFrom: 1, laneTo: 4, depth: "1.2–1.4 m" }],
  },
];

export const poolById: Record<string, Pool> = Object.fromEntries(pools.map((p) => [p.id, p]));

export interface SwimCourse {
  id: string;
  name: string;
  institutionId: string;
  institutionName: string;
  poolIds: string[];
  coachNames: string[];
  levels: string[];
  blurb: string;
}

export const swimCourses: SwimCourse[] = [
  {
    id: "C-SWIM",
    name: "Royal Vista Aquatics",
    institutionId: "T-006",
    institutionName: "Royal Vista Aquatics",
    poolIds: ["POOL-OLY", "POOL-TRN"],
    coachNames: [
      "Coach Ava Johnson",
      "Coach Thomas Robinson",
      "Coach Poppy Wright",
      "Coach Oscar Thompson",
    ],
    levels: ["Learn-to-Swim", "Stroke Development", "Competitive Squad", "Diving"],
    blurb:
      "A multi-coach aquatics programme. The Olympic pool is split into zones so several groups train at once — each with its own coach and small swimmer group for close attention.",
  },
  {
    id: "C-SWIM-LTS",
    name: "Learn-to-Swim Academy",
    institutionId: "T-006",
    institutionName: "Royal Vista Aquatics",
    poolIds: ["POOL-TRN", "POOL-OLY"],
    coachNames: ["Coach Poppy Wright", "Coach Thomas Robinson"],
    levels: ["Water Confidence", "Beginner", "Improver"],
    blurb:
      "Structured beginner pathway for children — from first splashes to confident front-crawl. Small groups in the shallow zone and training pool with a stage-by-stage badge scheme.",
  },
  {
    id: "C-SWIM-MAS",
    name: "Adult & Masters Swimming",
    institutionId: "T-006",
    institutionName: "Royal Vista Aquatics",
    poolIds: ["POOL-OLY"],
    coachNames: ["Coach Ava Johnson", "Coach Oscar Thompson"],
    levels: ["Masters Fitness", "Stroke Refinement"],
    blurb:
      "Early-morning fitness and technique swimming for adults — from returning swimmers to competitive Masters. Coached lane sets with pace guidance and stroke correction.",
  },
  {
    id: "C-SWIM-SAFE",
    name: "Water Safety & Lifeguarding",
    institutionId: "T-006",
    institutionName: "Royal Vista Aquatics",
    poolIds: ["POOL-TRN"],
    coachNames: ["Coach Thomas Robinson", "Coach Poppy Wright"],
    levels: ["Water Safety", "Lifeguard Award"],
    blurb:
      "Personal survival and rescue skills leading to a recognised lifeguard award. Reach-and-throw rescues, timed tows and CPR awareness for teens and adults.",
  },
  {
    id: "C-SWIM-TRI",
    name: "Triathlon & Open-Water Squad",
    institutionId: "T-006",
    institutionName: "Royal Vista Aquatics",
    poolIds: ["POOL-OLY"],
    coachNames: ["Coach Ava Johnson", "Coach Oscar Thompson"],
    levels: ["Open-Water", "Triathlon Prep"],
    blurb:
      "Endurance and open-water preparation for triathletes — continuous swims, sighting drills and race-pace sets aimed at lake and sea events.",
  },
];

export const swimCourseById: Record<string, SwimCourse> = Object.fromEntries(
  swimCourses.map((c) => [c.id, c]),
);

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface PoolSession {
  id: string;
  courseId: string;
  title: string;
  level: string;
  day: Weekday;
  start: string; // "16:00"
  end: string; // "17:00"
  poolId: string;
  zoneId: string;
  laneFrom: number;
  laneTo: number;
  coachNames: string[];
  swimmerIds: string[];
  capacity: number;
  focus: string;
}

/* Several Monday sessions run CONCURRENTLY in the Olympic pool (different lane
 * zones) so the holistic pool view shows simultaneous occupancy. Oliver (S-1001,
 * the student demo) and Olivia (S-1009, the parent's 2nd child) are swimmers so
 * the student/parent demos resolve to real sessions. */
export const poolSessions: PoolSession[] = [
  // ── Monday 16:00 — three concurrent groups across the Olympic pool ──
  {
    id: "PS-01",
    courseId: "C-SWIM",
    title: "Competitive Squad — Sprint",
    level: "Competitive Squad",
    day: "Mon",
    start: "16:00",
    end: "17:00",
    poolId: "POOL-OLY",
    zoneId: "z-lap",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Ava Johnson", "Coach Thomas Robinson"],
    swimmerIds: ["S-1001", "S-1002", "S-1005", "S-1010", "S-1011", "S-1012"],
    capacity: 12,
    focus: "Freestyle sprint sets · race starts",
  },
  {
    id: "PS-02",
    courseId: "C-SWIM",
    title: "Learn-to-Swim · Dolphins",
    level: "Learn-to-Swim",
    day: "Mon",
    start: "16:00",
    end: "17:00",
    poolId: "POOL-OLY",
    zoneId: "z-learn",
    laneFrom: 5,
    laneTo: 6,
    coachNames: ["Coach Poppy Wright"],
    swimmerIds: ["S-1009", "S-1006", "S-1020", "S-1004"],
    capacity: 8,
    focus: "Water confidence · floating & kicking",
  },
  {
    id: "PS-03",
    courseId: "C-SWIM",
    title: "Diving Basics",
    level: "Diving",
    day: "Mon",
    start: "16:00",
    end: "17:00",
    poolId: "POOL-OLY",
    zoneId: "z-dive",
    laneFrom: 7,
    laneTo: 8,
    coachNames: ["Coach Oscar Thompson"],
    swimmerIds: ["S-1023", "S-1027", "S-1015"],
    capacity: 6,
    focus: "Standing dives · platform entry technique",
  },
  // ── Monday 17:00 — two concurrent groups ──
  {
    id: "PS-04",
    courseId: "C-SWIM",
    title: "Competitive Squad — Distance",
    level: "Competitive Squad",
    day: "Mon",
    start: "17:00",
    end: "18:00",
    poolId: "POOL-OLY",
    zoneId: "z-lap",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Ava Johnson", "Coach Oscar Thompson"],
    swimmerIds: ["S-1018", "S-1012", "S-1011", "S-1015", "S-1001"],
    capacity: 12,
    focus: "Aerobic distance · pacing & turns",
  },
  {
    id: "PS-05",
    courseId: "C-SWIM",
    title: "Learn-to-Swim · Turtles",
    level: "Learn-to-Swim",
    day: "Mon",
    start: "17:00",
    end: "18:00",
    poolId: "POOL-OLY",
    zoneId: "z-learn",
    laneFrom: 5,
    laneTo: 6,
    coachNames: ["Coach Poppy Wright", "Coach Thomas Robinson"],
    swimmerIds: ["S-1006", "S-1020"],
    capacity: 8,
    focus: "Submersion & breath control",
  },
  // ── Wednesday ──
  {
    id: "PS-06",
    courseId: "C-SWIM",
    title: "Stroke Clinic — Butterfly",
    level: "Stroke Development",
    day: "Wed",
    start: "16:00",
    end: "17:00",
    poolId: "POOL-OLY",
    zoneId: "z-lap",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Thomas Robinson"],
    swimmerIds: ["S-1001", "S-1002", "S-1010", "S-1015", "S-1018"],
    capacity: 10,
    focus: "Butterfly timing & undulation",
  },
  {
    id: "PS-07",
    courseId: "C-SWIM",
    title: "Learn-to-Swim · Dolphins",
    level: "Learn-to-Swim",
    day: "Wed",
    start: "16:00",
    end: "17:00",
    poolId: "POOL-TRN",
    zoneId: "z-trn",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Poppy Wright"],
    swimmerIds: ["S-1009", "S-1006", "S-1004", "S-1020"],
    capacity: 10,
    focus: "Front-crawl arm action",
  },
  // ── Friday ──
  {
    id: "PS-08",
    courseId: "C-SWIM",
    title: "Competitive Squad — Race Prep",
    level: "Competitive Squad",
    day: "Fri",
    start: "17:00",
    end: "18:30",
    poolId: "POOL-OLY",
    zoneId: "z-lap",
    laneFrom: 1,
    laneTo: 6,
    coachNames: ["Coach Ava Johnson", "Coach Thomas Robinson", "Coach Oscar Thompson"],
    swimmerIds: ["S-1001", "S-1011", "S-1012", "S-1015", "S-1018", "S-1010", "S-1002"],
    capacity: 18,
    focus: "Mock meet · timed heats",
  },
  // ── Saturday — two concurrent groups ──
  {
    id: "PS-09",
    courseId: "C-SWIM",
    title: "Family Learn-to-Swim",
    level: "Learn-to-Swim",
    day: "Sat",
    start: "09:00",
    end: "10:00",
    poolId: "POOL-OLY",
    zoneId: "z-learn",
    laneFrom: 5,
    laneTo: 6,
    coachNames: ["Coach Poppy Wright", "Coach Ava Johnson"],
    swimmerIds: ["S-1009", "S-1006", "S-1004", "S-1020", "S-1027"],
    capacity: 10,
    focus: "Parent & child water familiarisation",
  },
  {
    id: "PS-10",
    courseId: "C-SWIM",
    title: "Diving · Springboard",
    level: "Diving",
    day: "Sat",
    start: "09:00",
    end: "10:00",
    poolId: "POOL-OLY",
    zoneId: "z-dive",
    laneFrom: 7,
    laneTo: 8,
    coachNames: ["Coach Oscar Thompson"],
    swimmerIds: ["S-1023", "S-1027"],
    capacity: 6,
    focus: "1 m springboard approach & hurdle",
  },

  // ── Learn-to-Swim Academy (C-SWIM-LTS) ──
  {
    id: "LTS-01",
    courseId: "C-SWIM-LTS",
    title: "Water Confidence · Starfish",
    level: "Water Confidence",
    day: "Tue",
    start: "16:00",
    end: "16:45",
    poolId: "POOL-TRN",
    zoneId: "z-trn",
    laneFrom: 1,
    laneTo: 2,
    coachNames: ["Coach Poppy Wright"],
    swimmerIds: ["S-1006", "S-1020", "S-1004"],
    capacity: 8,
    focus: "Entry, floating & blowing bubbles",
  },
  {
    id: "LTS-02",
    courseId: "C-SWIM-LTS",
    title: "Beginner · Guppies",
    level: "Beginner",
    day: "Thu",
    start: "16:00",
    end: "16:45",
    poolId: "POOL-TRN",
    zoneId: "z-trn",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Poppy Wright", "Coach Thomas Robinson"],
    swimmerIds: ["S-1009", "S-1006", "S-1020"],
    capacity: 10,
    focus: "Kicking with a board · face in water",
  },
  {
    id: "LTS-03",
    courseId: "C-SWIM-LTS",
    title: "Improver · Sharks",
    level: "Improver",
    day: "Sat",
    start: "11:00",
    end: "11:45",
    poolId: "POOL-OLY",
    zoneId: "z-learn",
    laneFrom: 5,
    laneTo: 6,
    coachNames: ["Coach Thomas Robinson"],
    swimmerIds: ["S-1004", "S-1009", "S-1020", "S-1006"],
    capacity: 10,
    focus: "Front-crawl over 10 m · breathing",
  },

  // ── Adult & Masters Swimming (C-SWIM-MAS) ──
  {
    id: "MAS-01",
    courseId: "C-SWIM-MAS",
    title: "Masters Fitness · Dawn Squad",
    level: "Masters Fitness",
    day: "Tue",
    start: "06:30",
    end: "07:30",
    poolId: "POOL-OLY",
    zoneId: "z-lap",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Ava Johnson"],
    swimmerIds: ["S-1011", "S-1012", "S-1018", "S-1005"],
    capacity: 16,
    focus: "Aerobic base · pace-clock sets",
  },
  {
    id: "MAS-02",
    courseId: "C-SWIM-MAS",
    title: "Stroke Refinement · Adults",
    level: "Stroke Refinement",
    day: "Thu",
    start: "06:30",
    end: "07:30",
    poolId: "POOL-OLY",
    zoneId: "z-lap",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Oscar Thompson"],
    swimmerIds: ["S-1010", "S-1011", "S-1018"],
    capacity: 16,
    focus: "Catch & body position drills",
  },
  {
    id: "MAS-03",
    courseId: "C-SWIM-MAS",
    title: "Masters Long-Course",
    level: "Masters Fitness",
    day: "Sat",
    start: "07:00",
    end: "08:00",
    poolId: "POOL-OLY",
    zoneId: "z-lap",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Ava Johnson", "Coach Oscar Thompson"],
    swimmerIds: ["S-1005", "S-1011", "S-1012", "S-1018"],
    capacity: 20,
    focus: "Long-course endurance · negative splits",
  },

  // ── Water Safety & Lifeguarding (C-SWIM-SAFE) ──
  {
    id: "WS-01",
    courseId: "C-SWIM-SAFE",
    title: "Personal Survival · Rescue Skills",
    level: "Water Safety",
    day: "Wed",
    start: "18:00",
    end: "19:30",
    poolId: "POOL-TRN",
    zoneId: "z-trn",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Thomas Robinson"],
    swimmerIds: ["S-1015", "S-1018", "S-1010", "S-1002"],
    capacity: 10,
    focus: "Reach & throw rescues · HELP position",
  },
  {
    id: "WS-02",
    courseId: "C-SWIM-SAFE",
    title: "Lifeguard Award · Assessment",
    level: "Lifeguard Award",
    day: "Sat",
    start: "13:00",
    end: "15:00",
    poolId: "POOL-TRN",
    zoneId: "z-trn",
    laneFrom: 1,
    laneTo: 4,
    coachNames: ["Coach Thomas Robinson", "Coach Poppy Wright"],
    swimmerIds: ["S-1015", "S-1018", "S-1002"],
    capacity: 10,
    focus: "Timed tow · CPR awareness · spinal roll",
  },

  // ── Triathlon & Open-Water Squad (C-SWIM-TRI) ──
  {
    id: "TRI-01",
    courseId: "C-SWIM-TRI",
    title: "Open-Water Skills",
    level: "Open-Water",
    day: "Tue",
    start: "17:30",
    end: "19:00",
    poolId: "POOL-OLY",
    zoneId: "z-lap",
    laneFrom: 1,
    laneTo: 6,
    coachNames: ["Coach Ava Johnson"],
    swimmerIds: ["S-1001", "S-1011", "S-1012", "S-1018"],
    capacity: 14,
    focus: "Sighting · drafting · deep-water starts",
  },
  {
    id: "TRI-02",
    courseId: "C-SWIM-TRI",
    title: "Triathlon Prep · Endurance",
    level: "Triathlon Prep",
    day: "Sat",
    start: "06:30",
    end: "08:00",
    poolId: "POOL-OLY",
    zoneId: "z-lap",
    laneFrom: 1,
    laneTo: 6,
    coachNames: ["Coach Ava Johnson", "Coach Oscar Thompson"],
    swimmerIds: ["S-1001", "S-1011", "S-1015", "S-1018"],
    capacity: 14,
    focus: "Continuous swim · race-pace brick sets",
  },
];

export const sessionById: Record<string, PoolSession> = Object.fromEntries(
  poolSessions.map((s) => [s.id, s]),
);

export function sessionsByCourse(courseId: string): PoolSession[] {
  return poolSessions.filter((s) => s.courseId === courseId);
}

/** The primary swim course (used for coach redirect + children surfacing). */
export const SWIM_COURSE_ID = "C-SWIM";

/* Any account whose whole experience is the swim club — the coach (teacher) OR
 * the club admin. Both carry meta.discipline === "Swimming"; this single flag
 * switches menus, dashboard and page scoping into the single-purpose swim-club
 * product. Typed loosely so callers can pass a DemoUser | null. */
export function isSwimUser(user: { role?: Role; meta?: Record<string, string> } | null): boolean {
  return user?.meta?.discipline === "Swimming";
}

/** The swim-club admin (whole-club view + coach/session management). */
export function isSwimAdmin(user: { role?: Role; meta?: Record<string, string> } | null): boolean {
  return isSwimUser(user) && user?.role === "admin";
}

const swimCoachNameSet = new Set(swimCourses.flatMap((c) => c.coachNames));

/** True if a person (by display name) coaches any swim session. */
export function isSwimCoach(name: string): boolean {
  return swimCoachNameSet.has(name);
}

/** Sessions a coach leads (by display name). */
export function sessionsForCoach(name: string): PoolSession[] {
  return poolSessions.filter((s) => s.coachNames.includes(name));
}

/** Sessions a swimmer is enrolled in (by 1StudentID). */
export function sessionsForSwimmer(studentId: string): PoolSession[] {
  return poolSessions.filter((s) => s.swimmerIds.includes(studentId));
}

/** Distinct ordered weekdays that have at least one session for a course. */
export const SESSION_DAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface SessionAttendance {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  status: "Present" | "Late" | "Absent";
  at: string; // ISO
  by: string; // coach who marked
}

/* A couple of pre-marked rows on Monday's sprint squad so a coach opening the
 * session sees existing attendance (and the holistic view shows live counts). */
export const sessionAttendance: SessionAttendance[] = [
  {
    id: "SA-001",
    sessionId: "PS-01",
    studentId: "S-1001",
    studentName: "Oliver Smith",
    status: "Present",
    at: d(0, 16, 3),
    by: "Coach Ava Johnson",
  },
  {
    id: "SA-002",
    sessionId: "PS-01",
    studentId: "S-1002",
    studentName: "Isabella Evans",
    status: "Present",
    at: d(0, 16, 4),
    by: "Coach Ava Johnson",
  },
  {
    id: "SA-003",
    sessionId: "PS-01",
    studentId: "S-1005",
    studentName: "James Roberts",
    status: "Late",
    at: d(0, 16, 12),
    by: "Coach Thomas Robinson",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Swim-club history & operations data
 *
 * The club summary reports (daily / weekly / monthly / yearly) need a realistic
 * body of history to aggregate. Rather than hand-author thousands of rows, we
 * expand the recurring weekly timetable (`poolSessions`) into per-date
 * attendance for the last ~13 weeks with a deterministic (seeded) status mix,
 * then layer on hand-authored coach absences, incidents and record-book notes.
 * ──────────────────────────────────────────────────────────────────────── */

const studentNameById: Record<string, string> = Object.fromEntries(
  students.map((s) => [s.id, s.name]),
);
const swimmerName = (id: string) => studentNameById[id] ?? id;

const WEEKDAY_INDEX: Record<Weekday, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Stable 0–1 hash so generated history is identical on every load. */
function seeded(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Date (midnight) of the most recent occurrence of `day` on or before today. */
function lastOccurrenceOf(day: Weekday): Date {
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const diff = (base.getDay() - WEEKDAY_INDEX[day] + 7) % 7;
  base.setDate(base.getDate() - diff);
  return base;
}

const HISTORY_WEEKS = 13;

/** Build attendance history for every recurring session across the last N weeks. */
function buildSessionAttendanceHistory(): SessionAttendance[] {
  const rows: SessionAttendance[] = [];
  const now = today.getTime();
  for (const s of poolSessions) {
    const [sh, sm] = s.start.split(":").map(Number);
    const lastOcc = lastOccurrenceOf(s.day);
    const coach = s.coachNames[0] ?? "Coach";
    for (let wk = 0; wk < HISTORY_WEEKS; wk++) {
      const date = new Date(lastOcc);
      date.setDate(lastOcc.getDate() - wk * 7);
      date.setHours(sh, sm + 4, 0, 0);
      if (date.getTime() > now) continue; // never generate future sessions
      const dayKey = date.toISOString().slice(0, 10);
      s.swimmerIds.forEach((id, idx) => {
        const r = seeded(`${s.id}|${id}|${dayKey}`);
        const status: SessionAttendance["status"] =
          r < 0.82 ? "Present" : r < 0.91 ? "Late" : "Absent";
        rows.push({
          id: `SAH-${s.id}-${wk}-${idx}`,
          sessionId: s.id,
          studentId: id,
          studentName: swimmerName(id),
          status,
          at: date.toISOString(),
          by: coach,
        });
      });
    }
  }
  return rows;
}

/* Merge hand-authored "today" rows with generated history, de-duped by
 * session + swimmer + calendar day (hand-authored wins so the live marking
 * demo on PS-01 stays intact). */
const _handAuthoredKeys = new Set(
  sessionAttendance.map((a) => `${a.sessionId}|${a.studentId}|${a.at.slice(0, 10)}`),
);

export const sessionAttendanceHistory: SessionAttendance[] = [
  ...sessionAttendance,
  ...buildSessionAttendanceHistory().filter(
    (a) => !_handAuthoredKeys.has(`${a.sessionId}|${a.studentId}|${a.at.slice(0, 10)}`),
  ),
];

/* ── Coach attendance / cover ───────────────────────────────────────────────
 * We record only ABSENCES (with the substitute who covered). "Coaches present"
 * is derived by the report: scheduled coach-slots minus absences. The admin's
 * "manage coaches" tool appends new rows of the same shape at runtime. */
export interface CoachAttendance {
  id: string;
  sessionId: string;
  date: string; // ISO
  coachName: string;
  status: "Present" | "Absent";
  reason?: string;
  replacedByName?: string;
  by: string; // who recorded it (admin)
  at: string; // ISO recorded time
}

export const coachAttendance: CoachAttendance[] = [
  {
    id: "CA-001",
    sessionId: "PS-09",
    date: d(2, 9, 0),
    coachName: "Coach Poppy Wright",
    status: "Absent",
    reason: "Sick leave",
    replacedByName: "Coach Ava Johnson",
    by: "Jessica Davies",
    at: d(3, 18, 0),
  },
  {
    id: "CA-002",
    sessionId: "PS-06",
    date: d(9, 16, 0),
    coachName: "Coach Thomas Robinson",
    status: "Absent",
    reason: "Coaching clinic (external)",
    replacedByName: "Coach Ava Johnson",
    by: "Jessica Davies",
    at: d(10, 12, 0),
  },
  {
    id: "CA-003",
    sessionId: "PS-02",
    date: d(16, 16, 0),
    coachName: "Coach Poppy Wright",
    status: "Absent",
    reason: "Family emergency",
    replacedByName: "Coach Thomas Robinson",
    by: "Jessica Davies",
    at: d(16, 8, 30),
  },
  {
    id: "CA-004",
    sessionId: "PS-08",
    date: d(23, 17, 0),
    coachName: "Coach Oscar Thompson",
    status: "Absent",
    reason: "Injury (recovered)",
    replacedByName: "Coach Thomas Robinson",
    by: "Jessica Davies",
    at: d(24, 9, 0),
  },
  {
    id: "CA-005",
    sessionId: "PS-10",
    date: d(37, 9, 0),
    coachName: "Coach Oscar Thompson",
    status: "Absent",
    reason: "Annual leave",
    replacedByName: "Coach Ava Johnson",
    by: "Jessica Davies",
    at: d(40, 14, 0),
  },
  {
    id: "CA-006",
    sessionId: "PS-07",
    date: d(51, 16, 0),
    coachName: "Coach Poppy Wright",
    status: "Absent",
    reason: "Sick leave",
    replacedByName: "Coach Thomas Robinson",
    by: "Jessica Davies",
    at: d(52, 10, 0),
  },
  {
    id: "CA-007",
    sessionId: "PS-04",
    date: d(65, 17, 0),
    coachName: "Coach Ava Johnson",
    status: "Absent",
    reason: "Officiating regional gala",
    replacedByName: "Coach Thomas Robinson",
    by: "Jessica Davies",
    at: d(67, 11, 0),
  },
];

/* ── Live coach-roster overrides ────────────────────────────────────────────
 * When the admin covers an absent coach on an upcoming session, the new roster
 * is stored here (keyed by session). Empty by default → the club falls back to
 * the static `session.coachNames`. */
export interface SessionRoster {
  sessionId: string;
  coachNames: string[];
  updatedBy: string;
  updatedAt: string; // ISO
}

export const sessionRosters: SessionRoster[] = [];

/* ── Temporary coach cover ────────────────────────────────────────────────────
 * A swim admin can drop a coach into a session temporarily — e.g. to cover an
 * absence. Like a swimmer temp move, a temporary cover auto-reverts 12h after it
 * was made (unless removed sooner). "permanent" cover stays until changed;
 * "remove" takes a coach off. These layer on top of the baseline / roster
 * override computed by effectiveCoachNames. */
export type CoachMoveKind = "temp" | "permanent" | "remove";

export interface CoachMove {
  id: string;
  coachName: string;
  sessionId: string;
  fromSessionId?: string; // origin session, when moving cover from another class
  kind: CoachMoveKind;
  reason?: string;
  by: string;
  at: string; // ISO
  expiresAt?: string; // ISO — temp only (at + TEMP_COACH_MOVE_HOURS)
  reverted?: boolean;
}

/** How long a temporary coach cover stays in effect before auto-reverting. */
export const TEMP_COACH_MOVE_HOURS = 12;

export function isCoachMoveActive(m: CoachMove, now = Date.now()): boolean {
  if (m.reverted) return false;
  if (m.kind === "temp") return !!m.expiresAt && now < Date.parse(m.expiresAt);
  return true;
}

/** Temp coach covers currently in effect (for "temporarily covering" banners). */
export function activeTempCoachMoves(moves: CoachMove[], now = Date.now()): CoachMove[] {
  return moves.filter((m) => m.kind === "temp" && isCoachMoveActive(m, now));
}

export const coachMoves: CoachMove[] = [];

/** Effective coach roster for a session: baseline (or admin roster override),
 * with any active temporary / permanent coach covers layered on top. */
export function effectiveCoachNames(
  sessionId: string,
  rosters: SessionRoster[],
  moves: CoachMove[] = [],
  now = Date.now(),
): string[] {
  const override = rosters.find((r) => r.sessionId === sessionId);
  const base = override ? override.coachNames : (sessionById[sessionId]?.coachNames ?? []);
  const set = new Set(base);
  const ordered = moves.slice().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  for (const m of ordered) {
    if (m.sessionId !== sessionId || !isCoachMoveActive(m, now)) continue;
    if (m.kind === "remove") set.delete(m.coachName);
    else set.add(m.coachName);
  }
  return Array.from(set);
}

/* ── Incidents ──────────────────────────────────────────────────────────────
 * Poolside incidents logged by coaches during sessions — surfaced in the club
 * summary reports and (for coaches) their own session reports. */
export type IncidentType = "Safety" | "Behaviour" | "Health" | "Equipment";
export type IncidentSeverity = "Low" | "Medium" | "High";

export interface Incident {
  id: string;
  courseId: string;
  sessionId?: string;
  studentId?: string;
  studentName?: string;
  coachName: string;
  type: IncidentType;
  severity: IncidentSeverity;
  title: string;
  body: string;
  status: "Open" | "Resolved";
  at: string; // ISO
}

export const incidents: Incident[] = [
  {
    id: "INC-001",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-02",
    studentId: "S-1006",
    studentName: swimmerName("S-1006"),
    coachName: "Coach Poppy Wright",
    type: "Health",
    severity: "Low",
    title: "Swallowed water — coughing fit",
    body: "Alice swallowed water during kicking drills, brief coughing fit. Rested poolside 5 min, recovered fully and rejoined. Parent notified at pickup.",
    status: "Resolved",
    at: d(1, 16, 25),
  },
  {
    id: "INC-002",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-01",
    studentId: "S-1005",
    studentName: swimmerName("S-1005"),
    coachName: "Coach Ava Johnson",
    type: "Behaviour",
    severity: "Low",
    title: "Running on pool deck",
    body: "James was running on the deck between sets. Reminded of the no-running rule and moved to the front of the lane line. No further issues.",
    status: "Resolved",
    at: d(2, 16, 40),
  },
  {
    id: "INC-003",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-03",
    coachName: "Coach Oscar Thompson",
    type: "Equipment",
    severity: "Medium",
    title: "Loose starting-block grip",
    body: "Lane 8 starting block grip pad was loose. Block taken out of use for the session, maintenance ticket raised. Diving group used lane 7 only.",
    status: "Open",
    at: d(0, 16, 10),
  },
  {
    id: "INC-004",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-08",
    studentId: "S-1018",
    studentName: swimmerName("S-1018"),
    coachName: "Coach Ava Johnson",
    type: "Safety",
    severity: "Medium",
    title: "Near lane collision",
    body: "Two swimmers converged at the wall during a fast set. No contact. Reinforced keep-right lane etiquette and staggered the send-offs.",
    status: "Resolved",
    at: d(4, 17, 50),
  },
  {
    id: "INC-005",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-05",
    studentId: "S-1020",
    studentName: swimmerName("S-1020"),
    coachName: "Coach Poppy Wright",
    type: "Health",
    severity: "Low",
    title: "Mild ear discomfort",
    body: "Imogen reported mild ear discomfort after submersion drills. Sat out remainder, advised parent to monitor. Cleared to return next session.",
    status: "Resolved",
    at: d(11, 17, 30),
  },
  {
    id: "INC-006",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-06",
    coachName: "Coach Thomas Robinson",
    type: "Equipment",
    severity: "Low",
    title: "Lane rope tension",
    body: "Lane 3 rope had slackened. Re-tensioned before the set. No impact to the session.",
    status: "Resolved",
    at: d(9, 16, 20),
  },
  {
    id: "INC-007",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-04",
    studentId: "S-1012",
    studentName: swimmerName("S-1012"),
    coachName: "Coach Ava Johnson",
    type: "Safety",
    severity: "High",
    title: "Swimmer fatigue in deep water",
    body: "Henry showed fatigue mid-lane in the distance set. Lifeguard assisted to the wall with a reach pole. Fully recovered, no water inhaled. Reviewed set intensity and rest intervals with the group.",
    status: "Resolved",
    at: d(18, 17, 20),
  },
  {
    id: "INC-008",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-09",
    studentId: "S-1004",
    studentName: swimmerName("S-1004"),
    coachName: "Coach Poppy Wright",
    type: "Behaviour",
    severity: "Low",
    title: "Reluctant to submerge",
    body: "Sophie was anxious about face-in-water. Used step-by-step bubbles progression and a kickboard. Ended the session smiling — logged for continuity.",
    status: "Resolved",
    at: d(25, 9, 30),
  },
  {
    id: "INC-009",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-01",
    coachName: "Coach Ava Johnson",
    type: "Equipment",
    severity: "Medium",
    title: "Pace clock fault",
    body: "Poolside pace clock froze during sprint sets. Switched to stopwatch timing. Clock reset at the break. Facilities notified.",
    status: "Open",
    at: d(0, 16, 35),
  },
  {
    id: "INC-010",
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-08",
    studentId: "S-1011",
    studentName: swimmerName("S-1011"),
    coachName: "Coach Ava Johnson",
    type: "Health",
    severity: "Low",
    title: "Minor cramp",
    body: "Michael had a calf cramp during the mock meet. Stretched out poolside, hydrated, returned for the cool-down. Advised pre-session hydration.",
    status: "Resolved",
    at: d(46, 17, 40),
  },
];

/* ── Swim record-book notes ─────────────────────────────────────────────────
 * Coach-authored notes tagged to the club course (courseId C-SWIM) and, where
 * relevant, a 1–5 swimmer performance rating. Includes Oliver (S-1001) and
 * Olivia (S-1009) so the parent/student demos see a swim record book. These are
 * concatenated onto `srbEntries` by the store seed. */
export const swimSrbEntries: SrbEntry[] = [
  {
    id: "SRB-SW01",
    studentId: "S-1001",
    studentName: swimmerName("S-1001"),
    authorName: "Coach Ava Johnson",
    authorRole: "teacher",
    type: "achievement",
    title: "Freestyle sprint — new PB",
    body: "Oliver took 0.8s off his 50m freestyle in today's time-trial. Excellent underwater streamline off the wall. Moving him up a lane for sprint sets.",
    date: d(0, 17, 10),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-01",
    rating: 5,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [],
  },
  {
    id: "SRB-SW02",
    studentId: "S-1001",
    studentName: swimmerName("S-1001"),
    authorName: "Coach Thomas Robinson",
    authorRole: "teacher",
    type: "remark",
    title: "Butterfly timing",
    body: "Undulation is improving but arm recovery is still dropping late. Assigned single-arm fly drills for next week.",
    date: d(5, 17, 5),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-06",
    rating: 4,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [],
  },
  {
    id: "SRB-SW03",
    studentId: "S-1009",
    studentName: swimmerName("S-1009"),
    authorName: "Coach Poppy Wright",
    authorRole: "teacher",
    type: "achievement",
    title: "First unaided 10m!",
    body: "Olivia swam 10m front crawl unaided today — a big milestone. Confidence has grown so much. Well done!",
    date: d(1, 10, 15),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-07",
    rating: 5,
    requiresAck: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [
      {
        id: "rsw1",
        authorName: "Jack Smith",
        authorRole: "parent",
        text: "Wonderful news — she was so proud telling us at dinner. Thank you Coach Poppy!",
        at: d(1, 19, 0),
      },
    ],
  },
  {
    id: "SRB-SW04",
    studentId: "S-1009",
    studentName: swimmerName("S-1009"),
    authorName: "Coach Poppy Wright",
    authorRole: "teacher",
    type: "communication",
    title: "Bring a swim cap next week",
    body: "Olivia's hair is getting in her eyes during drills. A silicone swim cap will help a lot — the club shop has them.",
    date: d(6, 10, 30),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-07",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [],
  },
  {
    id: "SRB-SW05",
    studentId: "S-1002",
    studentName: swimmerName("S-1002"),
    authorName: "Coach Ava Johnson",
    authorRole: "teacher",
    type: "achievement",
    title: "Strong tumble turns",
    body: "Isabella's tumble turns are the cleanest in the squad this week — great push-off depth. Keep it up.",
    date: d(2, 17, 0),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-01",
    rating: 5,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [],
  },
  {
    id: "SRB-SW06",
    studentId: "S-1010",
    studentName: swimmerName("S-1010"),
    authorName: "Coach Ava Johnson",
    authorRole: "teacher",
    type: "remark",
    title: "Pacing on distance sets",
    body: "Florence went out too fast on the 400 and faded. We worked on negative-split pacing — much better on the second attempt.",
    date: d(7, 17, 15),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-04",
    rating: 3,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [],
  },
  {
    id: "SRB-SW07",
    studentId: "S-1023",
    studentName: swimmerName("S-1023"),
    authorName: "Coach Oscar Thompson",
    authorRole: "teacher",
    type: "achievement",
    title: "Clean standing dive",
    body: "Consistent, controlled standing dives today with good entry line. Ready to progress to the 1m springboard approach.",
    date: d(3, 16, 40),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-03",
    rating: 4,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [],
  },
  {
    id: "SRB-SW08",
    studentId: "S-1006",
    studentName: swimmerName("S-1006"),
    authorName: "Coach Poppy Wright",
    authorRole: "teacher",
    type: "behavior",
    title: "Great listening today",
    body: "Alice followed every instruction carefully and helped a nervous classmate. A real team player.",
    date: d(4, 16, 50),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-02",
    rating: 4,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [],
  },
  {
    id: "SRB-SW09",
    studentId: "S-1011",
    studentName: swimmerName("S-1011"),
    authorName: "Coach Ava Johnson",
    authorRole: "teacher",
    type: "achievement",
    title: "Race-prep mock meet",
    body: "Michael executed his race plan well in the mock meet — controlled start, strong finish. Small work needed on the final turn.",
    date: d(4, 18, 0),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-08",
    rating: 4,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [],
  },
  {
    id: "SRB-SW10",
    studentId: "S-1015",
    studentName: swimmerName("S-1015"),
    authorName: "Coach Thomas Robinson",
    authorRole: "teacher",
    type: "remark",
    title: "Butterfly endurance",
    body: "Karen can now hold fly technique for 50m without breakdown — big improvement from last month.",
    date: d(8, 17, 10),
    courseId: SWIM_COURSE_ID,
    sessionId: "PS-06",
    rating: 4,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    replies: [],
  },
];

/* Swim-club notification feed — shown to swim accounts instead of the generic
 * school notifications (exam grades, facial-recognition attendance, …). */
export const swimNotifications = [
  {
    type: "class",
    text: "Competitive Squad — Sprint starts in 15 minutes (Olympic pool)",
    time: "10 min ago",
  },
  {
    type: "attendance",
    text: "Attendance saved for Monday's Learn-to-Swim · Dolphins (7/8 present)",
    time: "today 16:12",
  },
  {
    type: "incident",
    text: "New incident logged: loose starting-block grip (Lane 8)",
    time: "today 16:10",
  },
  {
    type: "class",
    text: "Coach cover: Coach Ava is covering Family Learn-to-Swim on Saturday",
    time: "yesterday",
  },
  { type: "billing", text: "Term 3 squad fees are due for 4 swimmers", time: "2 days ago" },
];

/* ── Messaging: persisted, two-way conversations ────────────────────────────
 * A chat message belongs to a conversation between two people. The pair is
 * stored canonically (a/b sorted) so a thread resolves the same regardless of
 * who opened it — the counterpart, and any reply, is visible to BOTH accounts
 * (persisted in the store, like record-book replies). `context: "swim"` marks
 * club conversations so swim accounts only see their club threads. */
/** An image or document shared in a chat. Persisted inline as a data: URI so the
 *  demo works with no upload backend (kept small — the composer caps file size). */
export interface ChatAttachment {
  kind: "image" | "file";
  name: string;
  dataUrl: string; // data: URI
  size: number; // bytes
  mime?: string;
}

export interface ChatMessage {
  id: string;
  a: string; // participant name (canonical — sorts first)
  b: string; // participant name (canonical — sorts second)
  fromName: string;
  fromRole: string;
  text: string;
  at: string; // ISO
  context?: "swim";
  /** When set, this is a post in the group chat with this id (a/b hold the
   *  groupId so it never collides with a 1-to-1 thread). */
  groupId?: string;
  attachment?: ChatAttachment;
}

/** Canonical conversation key for a pair of participant names. */
export function chatPair(x: string, y: string): [string, string] {
  return x.localeCompare(y) <= 0 ? [x, y] : [y, x];
}

const chatMsg = (
  id: string,
  from: string,
  fromRole: string,
  to: string,
  text: string,
  at: string,
  context?: "swim",
): ChatMessage => {
  const [a, b] = chatPair(from, to);
  return { id, a, b, fromName: from, fromRole, text, at, context };
};

/** A post in a group chat. `a`/`b` both carry the groupId so the message never
 *  resolves as a 1-to-1 thread; membership is decided by the group's roster. */
const groupMsg = (
  id: string,
  groupId: string,
  from: string,
  fromRole: string,
  text: string,
  at: string,
): ChatMessage => ({
  id,
  a: groupId,
  b: groupId,
  fromName: from,
  fromRole,
  text,
  at,
  groupId,
  context: "swim",
});

export const chatSeed: ChatMessage[] = [
  // Coach Ava ⇄ Jack Smith (parent of Oliver) — swim
  chatMsg(
    "CH-001",
    "Coach Ava Johnson",
    "Head Swim Coach",
    "Jack Smith",
    "Hi Jack — Oliver's freestyle turns are looking sharp. I've moved him to lane 2 for sprint sets. He's ready for the club gala time-trials on Friday.",
    d(1, 17, 20),
    "swim",
  ),
  chatMsg(
    "CH-002",
    "Jack Smith",
    "Parent",
    "Coach Ava Johnson",
    "That's wonderful, thank you Coach! He's been practising his starts at home. We'll make sure he's there Friday.",
    d(1, 19, 5),
    "swim",
  ),
  chatMsg(
    "CH-003",
    "Coach Ava Johnson",
    "Head Swim Coach",
    "Jack Smith",
    "Perfect. Please bring his club cap and a water bottle. Warm-up is 4:45 sharp.",
    d(0, 9, 15),
    "swim",
  ),
  // Club admin Jessica ⇄ Coach Ava — swim
  chatMsg(
    "CH-010",
    "Jessica Davies",
    "Club Admin",
    "Coach Ava Johnson",
    "Coach Poppy is out sick this Saturday — could you cover Family Learn-to-Swim at 9 AM?",
    d(2, 14, 0),
    "swim",
  ),
  chatMsg(
    "CH-011",
    "Coach Ava Johnson",
    "Head Swim Coach",
    "Jessica Davies",
    "Yes, happy to cover. I'll prep a parent-and-child water-familiarisation plan.",
    d(2, 15, 30),
    "swim",
  ),
  // Generic (non-swim) threads so other demo accounts still have an inbox.
  chatMsg(
    "CH-020",
    "Dr. Charlie Brown",
    "Teacher",
    "Jack Smith",
    "Reminder: physics lab is tomorrow at 3 PM. Oliver did excellent work on the last quiz.",
    d(1, 10, 42),
  ),
  chatMsg(
    "CH-021",
    "Dr. Charlie Brown",
    "Teacher",
    "Oliver Smith",
    "Great work on your chemistry essay — see my notes in your record book.",
    d(2, 12, 0),
  ),
  chatMsg(
    "CH-022",
    "Isla Williams",
    "Platform Admin",
    "Dr. Charlie Brown",
    "Q3 tenant onboarding is on track — two new institutes go live next week. Great job on the migration.",
    d(1, 9, 0),
  ),
  chatMsg(
    "CH-023",
    "Jacob Wilson",
    "Institute Admin",
    "Jack Smith",
    "Thank you for your feedback at the parent forum — we've extended library hours as requested.",
    d(3, 15, 30),
  ),
  chatMsg(
    "CH-024",
    "Dr. Charlie Brown",
    "Teacher",
    "Emily Taylor",
    "Your seat in the Mon/Wed A/L Physics revision is confirmed — joining link is in your record book.",
    d(2, 16, 0),
  ),
  // ── Group chat: Sprint Squad (GRP-01, session PS-01) — admin-created broadcast
  //    group so coaches + families coordinate the Monday sprint session at once. ──
  groupMsg(
    "CH-G01",
    "GRP-01",
    "Jessica Davies",
    "Club Manager",
    "Welcome to the Sprint Squad group 🏊 I'll post session updates, gala times and kit reminders here so we're all on the same page.",
    d(3, 9, 0),
  ),
  groupMsg(
    "CH-G02",
    "GRP-01",
    "Coach Ava Johnson",
    "Head Swim Coach",
    "Reminder: Friday's time-trials warm-up is 4:45 sharp ⏰ Please bring club caps and a full water bottle. Great effort from the squad this week! 💪",
    d(2, 17, 30),
  ),
  groupMsg(
    "CH-G03",
    "GRP-01",
    "Jack Smith",
    "Parent",
    "Thanks Coach — Oliver will be there. 👍",
    d(2, 18, 10),
  ),
  groupMsg(
    "CH-G04",
    "GRP-01",
    "Amelia Smith",
    "Parent",
    "Noted, thank you! Will drop him at 4:30. 🙏",
    d(2, 18, 25),
  ),
];

/* Swim-club fee invoices (courseId C-SWIM) — squad & learn-to-swim term fees.
 * Concatenated onto `invoices` by the store seed; the swim admin's finance page
 * filters to these so it never shows the wider college's tuition receivables. */
export const swimInvoices: InvoiceRow[] = [
  {
    id: "INV-SW-1001",
    date: "2026-06-01",
    desc: "Competitive Squad — Term 3 fees (Oliver Smith)",
    amount: 120,
    status: "Paid",
    method: "Visa •••• 4242",
    studentId: "S-1001",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    courseId: SWIM_COURSE_ID,
    classLabel: "Competitive Squad",
    paidBy: "Jack Smith",
  },
  {
    id: "INV-SW-1002",
    date: "2026-06-01",
    desc: "Learn-to-Swim — Term 3 fees (Olivia Smith)",
    amount: 80,
    status: "Due",
    method: "—",
    studentId: "S-1009",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    courseId: SWIM_COURSE_ID,
    classLabel: "Learn-to-Swim",
  },
  // Second class per child so separated co-parents can split who pays what.
  {
    id: "INV-SW-1010",
    date: "2026-06-05",
    desc: "Triathlon & Open-Water — Term 3 fees (Oliver Smith)",
    amount: 80,
    status: "Due",
    method: "—",
    studentId: "S-1001",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    courseId: SWIM_COURSE_ID,
    classLabel: "Triathlon & Open-Water",
  },
  {
    id: "INV-SW-1011",
    date: "2026-06-05",
    desc: "Duckling 4 award assessment (Olivia Smith)",
    amount: 15,
    status: "Paid",
    method: "PayHere",
    studentId: "S-1009",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    courseId: SWIM_COURSE_ID,
    classLabel: "Duckling 4",
    paidBy: "Amelia Smith",
  },
  {
    id: "INV-SW-1003",
    date: "2026-06-01",
    desc: "Competitive Squad — Term 3 fees (Henry Green)",
    amount: 120,
    status: "Paid",
    method: "PayHere",
    studentId: "S-1012",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    courseId: SWIM_COURSE_ID,
  },
  {
    id: "INV-SW-1004",
    date: "2026-06-10",
    desc: "Gala entry & timing fee (Competitive Squad)",
    amount: 25,
    status: "Due",
    method: "—",
    studentId: "S-1011",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    courseId: SWIM_COURSE_ID,
  },
  {
    id: "INV-SW-1005",
    date: "2026-05-15",
    desc: "Learn-to-Swim — Term 3 fees (Sophie White)",
    amount: 80,
    status: "Paid",
    method: "PayPal",
    studentId: "S-1004",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    courseId: SWIM_COURSE_ID,
  },
  {
    id: "INV-SW-1006",
    date: "2026-06-05",
    desc: "Diving programme — Term 3 fees (Florence Stevens)",
    amount: 95,
    status: "Upcoming",
    method: "—",
    studentId: "S-1010",
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    courseId: SWIM_COURSE_ID,
  },
];

/* Swim-club CRM enquiries (program: "Swim") — prospective swimmers/parents.
 * The swim admin's Marketing & CRM filters to these. Concatenated onto `leads`. */
export const swimLeads: LeadRow[] = [
  {
    name: "Isabelle Powell",
    source: "Facebook Ad",
    interest: "Learn-to-Swim (age 6)",
    stage: "Qualified",
    owner: "Aquatics — Jessica",
    value: 240,
    phone: "+44 7700 214 669",
    email: "isabelle.powell@gmail.com",
    program: "Swim",
  },
  {
    name: "Lee Edwards",
    source: "Referral",
    interest: "Competitive Squad tryout",
    stage: "Demo Booked",
    owner: "Aquatics — Coach Ava",
    value: 480,
    phone: "+44 7700 508 332",
    email: "lee.edwards@outlook.com",
    program: "Swim",
  },
  {
    name: "Edward Chapman",
    source: "Instagram",
    interest: "Adult beginner classes",
    stage: "Contacted",
    owner: "Aquatics — Jessica",
    value: 320,
    phone: "+44 7700 331 904",
    email: "edward.chapman@gmail.com",
    program: "Swim",
  },
  {
    name: "Louis Webb",
    source: "Web Form",
    interest: "Diving programme",
    stage: "New",
    owner: "Unassigned",
    value: 380,
    phone: "+44 7700 662 118",
    email: "louis.webb@gmail.com",
    program: "Swim",
  },
  {
    name: "Danielle Bell",
    source: "Walk-in",
    interest: "Parent & child water class",
    stage: "Qualified",
    owner: "Aquatics — Coach Poppy",
    value: 200,
    phone: "+44 7700 940 227",
    email: "danielle.b@yahoo.com",
    program: "Swim",
  },
  {
    name: "Alexander Harris",
    source: "Google Search",
    interest: "Stroke-correction clinic",
    stage: "Closed Won",
    owner: "Aquatics — Coach Thomas",
    value: 300,
    phone: "+44 7700 776 554",
    email: "alexander.harris@gmail.com",
    program: "Swim",
  },
];

/* Swim-club staff (program: "Swim", T-006) — coaches, club admin, lifeguard and
 * front desk. The swim admin's Users & Roles filters to these. Concatenated
 * onto `platformUsers`. */
export const swimStaff: PlatformUserRow[] = [
  {
    name: "Jessica Davies",
    email: "clubadmin@demo.com",
    role: "Club Admin",
    lastLogin: "just now",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    program: "Swim",
  },
  {
    name: "Coach Ava Johnson",
    email: "coach@demo.com",
    role: "Head Swim Coach",
    lastLogin: "12 min ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    program: "Swim",
  },
  {
    name: "Coach Thomas Robinson",
    email: "dilan@royalvista.com",
    role: "Swim Coach",
    lastLogin: "2 hours ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    program: "Swim",
  },
  {
    name: "Coach Poppy Wright",
    email: "aisha@royalvista.com",
    role: "Swim Coach",
    lastLogin: "yesterday",
    mfa: false,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    program: "Swim",
  },
  {
    name: "Coach Oscar Thompson",
    email: "tomas@royalvista.com",
    role: "Swim Coach",
    lastLogin: "3 days ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    program: "Swim",
  },
  {
    name: "Keith Wood",
    email: "lifeguard@royalvista.com",
    role: "Lifeguard",
    lastLogin: "1 hour ago",
    mfa: false,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    program: "Swim",
  },
  {
    name: "Harriet Osborne",
    email: "reception@royalvista.com",
    role: "Front Desk",
    lastLogin: "30 min ago",
    mfa: true,
    institutionId: "T-006",
    institutionName: "Royal Vista College",
    program: "Swim",
  },
];

/* ════════════════════════════════════════════════════════════════════════════
 * Swim-club — extended demo scenarios
 *
 * Additional operational data added for the swim-club walkthrough: temporary /
 * permanent class moves & registrations, level assessments ("qualify for next
 * level"), competitive race times & PBs, payment mandates (Direct Debit / Card
 * / Cash), CPD assignments, lead outreach logs and wellbeing check-ins. Every
 * item is a NEW store collection layered on top of the seed timetable — the
 * baseline `poolSessions` roster is never mutated. See store.ts (add by key,
 * never bump STORAGE_KEY).
 * ════════════════════════════════════════════════════════════════════════════ */

/* A future-dated ISO helper (mirror of `d`, but forward in time). */
const dPlus = (days: number, hour = 9, minute = 0): string => {
  const x = new Date(today);
  x.setDate(x.getDate() + days);
  x.setHours(hour, minute, 0, 0);
  return x.toISOString();
};

/* ── Swimmer roster moves: registration/enrolment + temporary / permanent ────
 *  - "enroll"    : add a swimmer to a session (new registration or assignment).
 *  - "temp"      : move a swimmer to another session for the day; auto-reverts
 *                  12h after `at` (expiresAt) unless moved back sooner.
 *  - "permanent" : move a swimmer permanently between sessions.
 * The effective roster is computed from the baseline + active moves. */
export type SwimmerMoveKind = "enroll" | "temp" | "permanent" | "unenroll";

export interface SwimmerMove {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string; // target session the swimmer now trains in
  fromSessionId?: string; // origin session (temp / permanent moves)
  kind: SwimmerMoveKind;
  reason?: string;
  by: string;
  at: string; // ISO
  expiresAt?: string; // ISO — temp moves only (at + TEMP_MOVE_HOURS)
  reverted?: boolean;
}

/** How long a temporary class move stays in effect before auto-reverting. */
export const TEMP_MOVE_HOURS = 12;

/** Is a move currently in effect? Temp moves lapse after their 12h window. */
export function isMoveActive(m: SwimmerMove, now = Date.now()): boolean {
  if (m.reverted) return false;
  if (m.kind === "temp") return !!m.expiresAt && now < Date.parse(m.expiresAt);
  return true;
}

/** Effective swimmer IDs for a session, applying enrol / temp / permanent /
 * unenroll moves. Moves are applied oldest-first so the most recent change wins
 * when a swimmer is removed then re-added to the same session (or vice-versa). */
export function effectiveSwimmerIds(
  session: PoolSession,
  moves: SwimmerMove[],
  now = Date.now(),
): string[] {
  const ids = new Set(session.swimmerIds);
  const ordered = moves.slice().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  for (const m of ordered) {
    if (!isMoveActive(m, now)) continue;
    if (m.fromSessionId === session.id) ids.delete(m.studentId); // moved / removed out
    if (m.sessionId === session.id) ids.add(m.studentId); // moved / enrolled in
  }
  return Array.from(ids);
}

/** Temp moves currently in effect (for "temporarily here — move back" banners). */
export function activeTempMoves(moves: SwimmerMove[], now = Date.now()): SwimmerMove[] {
  return moves.filter((m) => m.kind === "temp" && isMoveActive(m, now));
}

export const swimmerMoves: SwimmerMove[] = [
  // A recent registration: William was enrolled into a Learn-to-Swim group.
  {
    id: "MOV-1001",
    studentId: "S-1003",
    studentName: swimmerName("S-1003"),
    sessionId: "PS-07",
    kind: "enroll",
    reason: "New registration — Learn-to-Swim (Dolphins)",
    by: "Jessica Davies",
    at: d(8, 10, 15),
  },
];

/* ── Level assessments: "qualify for next level" ─────────────────────────────
 * Learn-to-Swim → Stroke Development → Competitive Squad is the linear ladder.
 * Diving is a separate strand (no linear progression). A coach assesses a
 * swimmer against the criteria to LEAVE their current level; meeting them all
 * yields a "Qualified" recommendation the club can action. */
export const SWIM_LEVEL_LADDER = [
  "Learn-to-Swim",
  "Stroke Development",
  "Competitive Squad",
] as const;

export function nextSwimLevel(level: string): string | null {
  const i = (SWIM_LEVEL_LADDER as readonly string[]).indexOf(level);
  if (i < 0 || i >= SWIM_LEVEL_LADDER.length - 1) return null;
  return SWIM_LEVEL_LADDER[i + 1];
}

/** The most advanced ladder level a swimmer currently trains at (Diving aside). */
export function swimmerCurrentLevel(studentId: string): string {
  const levels = sessionsForSwimmer(studentId).map((s) => s.level);
  for (let i = SWIM_LEVEL_LADDER.length - 1; i >= 0; i--) {
    if (levels.includes(SWIM_LEVEL_LADDER[i])) return SWIM_LEVEL_LADDER[i];
  }
  return levels[0] ?? "Learn-to-Swim";
}

/** Criteria a swimmer must meet to progress FROM a given level. */
export const LEVEL_CRITERIA: Record<string, string[]> = {
  "Learn-to-Swim": [
    "Submerge and recover breath with confidence",
    "Float on front and back unaided",
    "Swim 10 m front crawl with rhythmic breathing",
    "Push and glide from the wall",
  ],
  "Stroke Development": [
    "Swim 25 m front crawl with bilateral breathing",
    "Legal backstroke and breaststroke technique",
    "Tumble turn on freestyle",
    "Complete a 100 m individual medley",
  ],
  "Competitive Squad": [
    "Meet a club qualifying time for an age-group event",
    "Legal starts, turns and finishes across all four strokes",
    "Complete a 400 m aerobic set on a coach-set interval",
    "Attend 80%+ of squad sessions this term",
  ],
};

export type LevelOutcome = "Qualified" | "Not yet";

export interface LevelAssessment {
  id: string;
  studentId: string;
  studentName: string;
  coachName: string;
  fromLevel: string;
  toLevel: string;
  metCriteria: string[]; // subset of LEVEL_CRITERIA[fromLevel] that were met
  outcome: LevelOutcome;
  note?: string;
  at: string;
}

export const levelAssessments: LevelAssessment[] = [
  {
    id: "LA-1001",
    studentId: "S-1009",
    studentName: swimmerName("S-1009"),
    coachName: "Coach Poppy Wright",
    fromLevel: "Learn-to-Swim",
    toLevel: "Stroke Development",
    metCriteria: LEVEL_CRITERIA["Learn-to-Swim"],
    outcome: "Qualified",
    note: "Olivia is confident on front and back and swims 10 m unaided with lovely rhythmic breathing. Ready to move up to Stroke Development.",
    at: d(3, 17, 10),
  },
  {
    id: "LA-1002",
    studentId: "S-1006",
    studentName: swimmerName("S-1006"),
    coachName: "Coach Poppy Wright",
    fromLevel: "Learn-to-Swim",
    toLevel: "Stroke Development",
    metCriteria: LEVEL_CRITERIA["Learn-to-Swim"].slice(0, 2),
    outcome: "Not yet",
    note: "Great floating and confidence. Still working on 10 m crawl with breathing — reassess in 3 weeks.",
    at: d(5, 17, 20),
  },
  {
    id: "LA-1003",
    studentId: "S-1002",
    studentName: swimmerName("S-1002"),
    coachName: "Coach Thomas Robinson",
    fromLevel: "Stroke Development",
    toLevel: "Competitive Squad",
    metCriteria: LEVEL_CRITERIA["Stroke Development"],
    outcome: "Qualified",
    note: "Isabella has a clean tumble turn and completed a 100 m IM legally. Recommending a squad tryout.",
    at: d(9, 17, 0),
  },
];

/* ── Competitive squad: race times & personal bests ──────────────────────────
 * Timed swims from club time-trials and meets. The competitive-squad view
 * derives each swimmer's personal best per event and highlights new PBs and
 * term-on-term improvement. */
export const SWIM_EVENTS = [
  "50m Freestyle",
  "100m Freestyle",
  "50m Backstroke",
  "50m Breaststroke",
  "50m Butterfly",
  "100m IM",
] as const;
export type SwimEvent = (typeof SWIM_EVENTS)[number];

export interface RaceTime {
  id: string;
  studentId: string;
  studentName: string;
  event: SwimEvent;
  seconds: number;
  date: string; // ISO
  meet: string;
  coachName: string;
}

/** "31.42" for sub-minute swims, "1:04.40" otherwise. */
export function formatSwimTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return m > 0 ? `${m}:${s.toFixed(2).padStart(5, "0")}` : s.toFixed(2);
}

/** Personal best (lowest time) per `studentId|event`. */
export function personalBests(times: RaceTime[]): Map<string, RaceTime> {
  const best = new Map<string, RaceTime>();
  for (const t of times) {
    const key = `${t.studentId}|${t.event}`;
    const cur = best.get(key);
    if (!cur || t.seconds < cur.seconds) best.set(key, t);
  }
  return best;
}

const rt = (
  id: string,
  studentId: string,
  event: SwimEvent,
  seconds: number,
  dayAgo: number,
  meet: string,
  coachName = "Coach Ava Johnson",
): RaceTime => ({
  id,
  studentId,
  studentName: swimmerName(studentId),
  event,
  seconds,
  date: d(dayAgo, 17, 0),
  meet,
  coachName,
});

const MEET_AUTUMN = "Autumn Club Time-Trial";
const MEET_REGIONAL = "Regional Age-Group Meet";
const MEET_GALA = "Club Gala Time-Trial";

export const raceTimes: RaceTime[] = [
  // Oliver Smith (S-1001) — the student-demo swimmer, steady improvement.
  rt("RT-1001", "S-1001", "50m Freestyle", 32.1, 56, MEET_AUTUMN),
  rt("RT-1002", "S-1001", "50m Freestyle", 31.3, 28, MEET_REGIONAL),
  rt("RT-1003", "S-1001", "50m Freestyle", 30.5, 6, MEET_GALA),
  rt("RT-1004", "S-1001", "100m Freestyle", 71.2, 56, MEET_AUTUMN),
  rt("RT-1005", "S-1001", "100m Freestyle", 69.8, 6, MEET_GALA),
  rt("RT-1006", "S-1001", "50m Butterfly", 36.9, 28, MEET_REGIONAL, "Coach Thomas Robinson"),
  rt("RT-1007", "S-1001", "50m Butterfly", 35.8, 6, MEET_GALA, "Coach Thomas Robinson"),
  rt("RT-1008", "S-1001", "100m IM", 82.5, 6, MEET_GALA),
  // Henry Green (S-1012) — the squad's quickest; big 100m drop.
  rt("RT-1010", "S-1012", "50m Freestyle", 29.8, 56, MEET_AUTUMN),
  rt("RT-1011", "S-1012", "50m Freestyle", 29.1, 6, MEET_GALA),
  rt("RT-1012", "S-1012", "100m Freestyle", 66.5, 56, MEET_AUTUMN),
  rt("RT-1013", "S-1012", "100m Freestyle", 64.4, 6, MEET_GALA),
  rt("RT-1014", "S-1012", "100m IM", 76.2, 6, MEET_GALA),
  // Isabella Evans (S-1002)
  rt("RT-1020", "S-1002", "50m Freestyle", 33.4, 56, MEET_AUTUMN),
  rt("RT-1021", "S-1002", "50m Freestyle", 32.9, 6, MEET_GALA),
  rt("RT-1022", "S-1002", "50m Backstroke", 38.1, 6, MEET_GALA),
  // Michael Johnson (S-1011)
  rt("RT-1030", "S-1011", "50m Freestyle", 31.9, 28, MEET_REGIONAL),
  rt("RT-1031", "S-1011", "50m Freestyle", 31.4, 6, MEET_GALA),
  rt("RT-1032", "S-1011", "50m Breaststroke", 41.2, 6, MEET_GALA, "Coach Oscar Thompson"),
  // Karen Barnes (S-1015)
  rt("RT-1040", "S-1015", "50m Butterfly", 37.5, 28, MEET_REGIONAL, "Coach Thomas Robinson"),
  rt("RT-1041", "S-1015", "50m Butterfly", 36.4, 6, MEET_GALA, "Coach Thomas Robinson"),
  rt("RT-1042", "S-1015", "50m Freestyle", 33.8, 6, MEET_GALA),
  // Florence Stevens (S-1010) & Claire Moore (S-1018)
  rt("RT-1050", "S-1010", "50m Freestyle", 32.6, 6, MEET_GALA),
  rt("RT-1051", "S-1010", "100m Freestyle", 72.1, 6, MEET_GALA),
  rt("RT-1052", "S-1018", "50m Freestyle", 34.2, 6, MEET_GALA),
  rt("RT-1053", "S-1018", "100m IM", 88.3, 6, MEET_GALA),
];

/* ── Finance: preferred payment methods / direct-debit mandates ──────────────
 * Each family's standing payment arrangement — Direct Debit, Card, Cash or Bank
 * Transfer — with mandate status so the club can see who's set up, pending or
 * failed (dunning). */
export const SWIM_PAYMENT_METHODS = ["Direct Debit", "Card", "Cash", "Bank Transfer"] as const;
export type SwimPaymentMethod = (typeof SWIM_PAYMENT_METHODS)[number];

export interface PaymentMandate {
  id: string;
  studentId: string;
  studentName: string;
  payerName: string;
  method: SwimPaymentMethod;
  reference: string;
  status: "Active" | "Pending" | "Failed";
  since: string;
}

export const paymentMandates: PaymentMandate[] = [
  {
    id: "PM-1001",
    studentId: "S-1001",
    studentName: swimmerName("S-1001"),
    payerName: "Jack Smith",
    method: "Direct Debit",
    reference: "DD •••• 8842",
    status: "Active",
    since: d(210, 9, 0),
  },
  {
    id: "PM-1002",
    studentId: "S-1009",
    studentName: swimmerName("S-1009"),
    payerName: "Jack Smith",
    method: "Direct Debit",
    reference: "DD •••• 8842",
    status: "Active",
    since: d(210, 9, 0),
  },
  {
    id: "PM-1003",
    studentId: "S-1002",
    studentName: swimmerName("S-1002"),
    payerName: "Craig Fletcher",
    method: "Card",
    reference: "Visa •••• 4242",
    status: "Active",
    since: d(120, 9, 0),
  },
  {
    id: "PM-1004",
    studentId: "S-1012",
    studentName: swimmerName("S-1012"),
    payerName: "Lily Barker",
    method: "Direct Debit",
    reference: "DD •••• 5190",
    status: "Active",
    since: d(150, 9, 0),
  },
  {
    id: "PM-1005",
    studentId: "S-1006",
    studentName: swimmerName("S-1006"),
    payerName: "Grace Osborne",
    method: "Cash",
    reference: "Cash — front desk",
    status: "Active",
    since: d(60, 9, 0),
  },
  {
    id: "PM-1006",
    studentId: "S-1015",
    studentName: swimmerName("S-1015"),
    payerName: "Chloe Barnes",
    method: "Direct Debit",
    reference: "DD •••• 3310",
    status: "Failed",
    since: d(95, 9, 0),
  },
  {
    id: "PM-1007",
    studentId: "S-1004",
    studentName: swimmerName("S-1004"),
    payerName: "Abigail Reid",
    method: "Direct Debit",
    reference: "Mandate pending signature",
    status: "Pending",
    since: d(4, 9, 0),
  },
  {
    id: "PM-1008",
    studentId: "S-1011",
    studentName: swimmerName("S-1011"),
    payerName: "Nicholas Hardy",
    method: "Card",
    reference: "Mastercard •••• 7781",
    status: "Active",
    since: d(80, 9, 0),
  },
];

/* ── CPD: courses recommended / assigned to a coach by the club manager ────── */
export interface CpdAssignment {
  id: string;
  courseId: string;
  courseTitle: string;
  coachName: string;
  assignedBy: string;
  status: "Assigned" | "In Progress" | "Completed";
  due?: string; // ISO
  note?: string;
  at: string;
}

export const cpdAssignments: CpdAssignment[] = [
  {
    id: "CPD-1001",
    courseId: "TRN-SQUAD",
    courseTitle: "Competitive Squad Coaching & Periodisation",
    coachName: "Coach Thomas Robinson",
    assignedBy: "Jessica Davies",
    status: "In Progress",
    due: dPlus(21, 17, 0),
    note: "Ahead of taking the distance squad next term.",
    at: d(10, 9, 30),
  },
  {
    id: "CPD-1002",
    courseId: "TRN-AQSAFE",
    courseTitle: "Safeguarding in Aquatics",
    coachName: "Coach Ava Johnson",
    assignedBy: "Jessica Davies",
    status: "Assigned",
    due: dPlus(30, 17, 0),
    note: "Annual safeguarding refresher — required for all coaches.",
    at: d(2, 9, 30),
  },
  {
    id: "CPD-1003",
    courseId: "TRN-AQSAFE",
    courseTitle: "Safeguarding in Aquatics",
    coachName: "Coach Poppy Wright",
    assignedBy: "Jessica Davies",
    status: "Completed",
    at: d(40, 9, 30),
  },
  {
    id: "CPD-1004",
    courseId: "TRN-STRK",
    courseTitle: "Stroke Correction & Technique",
    coachName: "Coach Oscar Thompson",
    assignedBy: "Jessica Davies",
    status: "Assigned",
    due: dPlus(45, 17, 0),
    at: d(1, 9, 30),
  },
];

/* ── Marketing: outreach logged against a lead ───────────────────────────── */
export type OutreachChannel = "Call" | "Email" | "WhatsApp" | "SMS" | "Meeting";

export interface LeadContact {
  id: string;
  leadName: string;
  channel: OutreachChannel;
  note: string;
  by: string;
  at: string;
}

export const leadContacts: LeadContact[] = [
  {
    id: "LC-1001",
    leadName: "Lee Edwards",
    channel: "Call",
    note: "Spoke to dad — keen on the squad. Booked a Saturday tryout with Coach Ava.",
    by: "Jessica Davies",
    at: d(4, 11, 0),
  },
  {
    id: "LC-1002",
    leadName: "Lee Edwards",
    channel: "WhatsApp",
    note: "Sent tryout confirmation, kit list and directions to the Olympic pool.",
    by: "Jessica Davies",
    at: d(4, 11, 20),
  },
  {
    id: "LC-1003",
    leadName: "Edward Chapman",
    channel: "Email",
    note: "Emailed adult-beginner timetable and first-session offer.",
    by: "Jessica Davies",
    at: d(6, 9, 45),
  },
  {
    id: "LC-1004",
    leadName: "Edward Chapman",
    channel: "Call",
    note: "Follow-up call — considering Tuesday evenings. Will confirm next week.",
    by: "Jessica Davies",
    at: d(2, 16, 10),
  },
  {
    id: "LC-1005",
    leadName: "Alexander Harris",
    channel: "Meeting",
    note: "Pool-side meeting after a trial clinic — signed up for the term.",
    by: "Coach Thomas Robinson",
    at: d(12, 18, 0),
  },
];

/* ── Safety & wellbeing check-ins ────────────────────────────────────────────
 * Lightweight RAG wellbeing notes coaches log alongside safety incidents; the
 * club report surfaces amber/red flags for pastoral follow-up. */
export type WellbeingFlag = "Green" | "Amber" | "Red";

export interface WellbeingCheck {
  id: string;
  studentId: string;
  studentName: string;
  coachName: string;
  flag: WellbeingFlag;
  note: string;
  at: string;
}

export const wellbeingChecks: WellbeingCheck[] = [
  {
    id: "WB-1001",
    studentId: "S-1001",
    studentName: swimmerName("S-1001"),
    coachName: "Coach Ava Johnson",
    flag: "Green",
    note: "Bright, motivated and leading warm-ups. Thriving in the sprint group.",
    at: d(1, 17, 5),
  },
  {
    id: "WB-1002",
    studentId: "S-1020",
    studentName: swimmerName("S-1020"),
    coachName: "Coach Poppy Wright",
    flag: "Amber",
    note: "Quieter than usual and tired after school. Kept the set light; will check in with parents.",
    at: d(2, 17, 15),
  },
  {
    id: "WB-1003",
    studentId: "S-1015",
    studentName: swimmerName("S-1015"),
    coachName: "Coach Thomas Robinson",
    flag: "Amber",
    note: "Mentioned shoulder soreness — reduced butterfly volume and added mobility work.",
    at: d(3, 16, 40),
  },
  {
    id: "WB-1004",
    studentId: "S-1006",
    studentName: swimmerName("S-1006"),
    coachName: "Coach Poppy Wright",
    flag: "Green",
    note: "Growing in confidence — happy to put face in the water without prompting.",
    at: d(4, 16, 30),
  },
];

/* ── Off-boarding: a person leaves a tenant, but their history is kept ────────
 * GDPR-friendly leaver flow. A tenant admin *deactivates* a swimmer or coach for
 * their institute instead of deleting them — all past attendance, record-book
 * notes, invoices and messages are retained, but the relationship is marked
 * ended so recurring billing (Direct Debit / card) and automated / recurring
 * messaging (fee reminders, session nudges) stop. The person's platform account
 * and their records at other tenants are untouched. Reactivation just removes
 * the leaver record. Nothing is seeded — every off-boarding is created live in
 * the demo. */
export type OffboardPersonType = "swimmer" | "coach";

export interface Offboarding {
  id: string;
  personId: string; // swimmer 1StudentID (S-xxxx) or coach display name
  personName: string;
  personType: OffboardPersonType;
  tenantId: string; // institutionId the person is leaving
  tenantName: string;
  reason: string;
  note?: string;
  stopPayments: boolean; // cancel recurring billing / mandates
  stopMessaging: boolean; // stop automated & recurring messaging
  effectiveAt: string; // ISO date the relationship ends
  by: string; // admin who off-boarded
  at: string; // ISO recorded
}

export const OFFBOARD_REASONS = [
  "Left the club",
  "Moved away / relocated",
  "Season ended — not renewing",
  "Transferred to another club",
  "Financial / affordability",
  "Medical",
  "End of contract",
  "Other",
] as const;

export const offboardings: Offboarding[] = [];

/** Whether a person (swimmer id or coach name) has been off-boarded at a tenant. */
export function isOffboarded(personId: string, list: Offboarding[], tenantId?: string): boolean {
  return list.some((o) => o.personId === personId && (tenantId ? o.tenantId === tenantId : true));
}

/** The active off-boarding record for a person, if any. */
export function offboardingFor(
  personId: string,
  list: Offboarding[],
  tenantId?: string,
): Offboarding | undefined {
  return list.find((o) => o.personId === personId && (tenantId ? o.tenantId === tenantId : true));
}

/* ────────────────────────────────────────────────────────────────────────────
 * Swim awards — a Swim England-style graded pathway (the "courses").
 *
 * Each award (e.g. "Duckling 4") is a short checklist of activities a swimmer
 * must demonstrate — exactly the criteria printed on the back of the physical
 * certificate. In a session the coach ticks each activity off for the swimmer;
 * when every activity is complete the swimmer earns the certificate and their
 * parents are notified. Awards chain into a pathway (Duckling 1-4 → Learn to
 * Swim Stage 1-2 …). The catalog is store-backed so the club admin can add new
 * award-courses; progress is tracked per swimmer per award.
 * ──────────────────────────────────────────────────────────────────────── */
export type AwardStrand = "Duckling" | "Learn to Swim" | "Award";
export type AwardTone = "amber" | "sky" | "violet" | "emerald" | "rose";

export interface SwimAward {
  id: string;
  name: string; // "Duckling 4"
  strand: AwardStrand;
  stage: number; // ordinal within the strand
  tone: AwardTone;
  activities: string[]; // the criteria on the back of the certificate
  readyFor?: string; // what the swimmer is ready for next (cert front)
  awardedText?: string; // the celebratory "WOW!" line on the cert front
  blurb?: string;
}

export const swimAwards: SwimAward[] = [
  {
    id: "DUCK-1",
    name: "Duckling 1",
    strand: "Duckling",
    stage: 1,
    tone: "amber",
    activities: [
      "Enter the water safely.",
      "Blow bubbles on the surface of the water.",
      "Move through the water with support.",
      "Splash and play in the water with confidence.",
      "Exit the water safely.",
    ],
    readyFor: "Duckling 2",
    awardedText: "You're becoming confident in the water!",
    blurb: "First splashes — water confidence for our youngest swimmers.",
  },
  {
    id: "DUCK-2",
    name: "Duckling 2",
    strand: "Duckling",
    stage: 2,
    tone: "amber",
    activities: [
      "Walk through the water with confidence.",
      "Blow bubbles under the water.",
      "Move along the poolside holding the rail.",
      "Float on the back with support.",
      "Push from the wall and glide with support.",
    ],
    readyFor: "Duckling 3",
    awardedText: "You can float and glide with support — great work!",
  },
  {
    id: "DUCK-3",
    name: "Duckling 3",
    strand: "Duckling",
    stage: 3,
    tone: "amber",
    activities: [
      "Jump into shallow water with support.",
      "Submerge to blow bubbles under the water.",
      "Float on the front and back using a woggle.",
      "Push and glide on the front with support.",
      "Travel 5 metres with support.",
    ],
    readyFor: "Duckling 4",
    awardedText: "You're travelling through the water — nearly there!",
  },
  {
    id: "DUCK-4",
    name: "Duckling 4",
    strand: "Duckling",
    stage: 4,
    tone: "amber",
    // Exact Swim England Duckling 4 criteria (back of the certificate).
    activities: [
      "Jump into the water unaided, but supervised.",
      "Perform a mushroom or star float.",
      "Rotate 360 degrees either using a log roll or an upright position.",
      "Push and glide achieving a streamlined position on the front or back.",
      "Submerge completely.",
      "Travel 10 metres on the front or back, without adult support.",
      "Jump into the water, turn around, swim back to the point of entry and hold on to the side or rail.",
      "Climb out of the water with adult support if required.",
    ],
    readyFor: "Learn to Swim Stage 1",
    awardedText: "You can do a push and glide. You're now ready for Learn to Swim Stage 1.",
    blurb: "The final pre-school Duckling award before Learn to Swim.",
  },
  {
    id: "LTS-1",
    name: "Learn to Swim Stage 1",
    strand: "Learn to Swim",
    stage: 1,
    tone: "sky",
    activities: [
      "Enter and exit the water safely, unaided.",
      "Blow bubbles a minimum of three times rhythmically.",
      "Move through the water without support.",
      "Perform a star float on the front and on the back.",
      "Push and glide on the front and on the back.",
      "Regain a standing position from the front and from the back.",
    ],
    readyFor: "Learn to Swim Stage 2",
    awardedText: "You can move through the water unaided — well done!",
  },
  {
    id: "LTS-2",
    name: "Learn to Swim Stage 2",
    strand: "Learn to Swim",
    stage: 2,
    tone: "sky",
    activities: [
      "Jump in from poolside safely.",
      "Submerge to pick up an object from the pool floor.",
      "Swim 5 metres on the front and on the back.",
      "Perform a tuck float (mushroom) and hold for five seconds.",
      "Push and glide with a streamlined position.",
      "Travel 10 metres, showing a correct kicking action.",
    ],
    readyFor: "Learn to Swim Stage 3",
    awardedText: "You can swim 10 metres — a real swimmer now!",
  },
];

export const awardById: Record<string, SwimAward> = Object.fromEntries(
  swimAwards.map((a) => [a.id, a]),
);

/** Progress of one swimmer against one award: which activity indices are done,
 * plus certification once all are complete. */
export interface AwardProgress {
  id: string;
  studentId: string;
  studentName: string;
  awardId: string;
  done: number[]; // completed activity indices
  startedAt: string;
  updatedAt: string;
  updatedBy: string;
  certifiedAt?: string;
  certifiedBy?: string;
  notified?: boolean; // parents notified of the certificate
}

export const awardProgress: AwardProgress[] = [
  // Oliver has already earned Learn to Swim Stage 1 (a certificate parents can view).
  {
    id: "AP-2001",
    studentId: "S-1001",
    studentName: swimmerName("S-1001"),
    awardId: "LTS-1",
    done: [0, 1, 2, 3, 4, 5],
    startedAt: d(70, 16, 0),
    updatedAt: d(35, 16, 45),
    updatedBy: "Coach Ava Johnson",
    certifiedAt: d(35, 16, 45),
    certifiedBy: "Coach Ava Johnson",
    notified: true,
  },
  // …and is partway through Stage 2.
  {
    id: "AP-2002",
    studentId: "S-1001",
    studentName: swimmerName("S-1001"),
    awardId: "LTS-2",
    done: [0, 1, 2],
    startedAt: d(28, 16, 0),
    updatedAt: d(6, 16, 40),
    updatedBy: "Coach Ava Johnson",
  },
  // Olivia is working through Duckling 4 in the Dolphins group.
  {
    id: "AP-2003",
    studentId: "S-1009",
    studentName: swimmerName("S-1009"),
    awardId: "DUCK-4",
    done: [0, 1, 2, 3, 4],
    startedAt: d(24, 16, 0),
    updatedAt: d(4, 16, 30),
    updatedBy: "Coach Poppy Wright",
  },
];

/** All award-progress rows for a swimmer (newest activity first). */
export function awardProgressFor(studentId: string, rows: AwardProgress[]): AwardProgress[] {
  return rows
    .filter((r) => r.studentId === studentId)
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

/** True once every activity in the award has been ticked off. */
export function isAwardComplete(award: SwimAward, progress: AwardProgress): boolean {
  return award.activities.every((_, i) => progress.done.includes(i));
}

/* ── Guardians / co-parents ──────────────────────────────────────────────────
 * A swimmer can be linked to more than one guardian — e.g. separated parents who
 * both stay involved. Each linked guardian can view the child and pay for
 * classes independently. Seeded so the demo parent (Jack) plus a co-parent
 * (Amelia) both look after Oliver & Olivia. Used for completion notifications and
 * the co-parent access/payment model. */
export const swimmerGuardians: Record<string, string[]> = {
  "S-1001": ["Jack Smith", "Amelia Smith"],
  "S-1009": ["Jack Smith", "Amelia Smith"],
};

export function guardiansForSwimmer(id: string): string[] {
  return swimmerGuardians[id] ?? [];
}

/* ── Group chats (admin-created, session/course scoped) ──────────────────────
 * The club admin can spin up a broadcast group for a specific session or course
 * that automatically includes everyone connected to it — the coaches, and each
 * enrolled swimmer's guardians (adult swimmers themselves). Families and coaches
 * then coordinate that session in one place (gala times, kit lists, closures)
 * instead of a dozen 1-to-1 threads. Only an admin creates or edits the roster;
 * any member can post. Posts live in the `chat` collection tagged with groupId. */
export interface ChatGroup {
  id: string;
  name: string;
  sessionId?: string;
  courseId?: string;
  members: string[]; // display names
  createdBy: string;
  createdAt: string; // ISO
  context?: "swim";
}

/** Everyone connected to a pool session: its coaches, plus each enrolled
 *  swimmer's guardians — or, for an adult/self-managed swimmer, the swimmer in
 *  person. Used to auto-populate a session group's membership. */
export function membersForSession(sessionId: string): string[] {
  const s = poolSessions.find((p) => p.id === sessionId);
  if (!s) return [];
  const names = new Set<string>(s.coachNames);
  for (const sid of s.swimmerIds) {
    const guardians = guardiansForSwimmer(sid);
    if (guardians.length) guardians.forEach((g) => names.add(g));
    else names.add(swimmerName(sid)); // adult / self-managed swimmer
  }
  return Array.from(names);
}

/** Distinct swim-coach display names across every swim session. */
export const swimCoachNames: string[] = Array.from(swimCoachNameSet);

/** A contactable person for the "new chat" search. */
export interface ChatContact {
  name: string;
  role: string;
}

/** The people a swim account can start a 1-to-1 chat with: every coach, the
 *  club manager, and the swim families (guardians). */
export function swimContactDirectory(): ChatContact[] {
  const map = new Map<string, string>();
  swimCoachNames.forEach((n) => map.set(n, "Swim coach"));
  map.set("Jessica Davies", "Club Manager");
  for (const g of Object.values(swimmerGuardians).flat()) map.set(g, "Parent / guardian");
  return Array.from(map, ([name, role]) => ({ name, role }));
}

export const chatGroups: ChatGroup[] = [
  {
    id: "GRP-01",
    name: "Competitive Squad — Sprint · Mon",
    sessionId: "PS-01",
    courseId: SWIM_COURSE_ID,
    members: membersForSession("PS-01"),
    createdBy: "Jessica Davies",
    createdAt: d(3, 8, 55),
    context: "swim",
  },
];

/* ── Club coach grading (management appraisal) ────────────────────────────────
 * Separate from the family star-rating, the club admin grades each coach at a
 * medal level with a private comment. This reflects the club's own view of how
 * well the coach develops swimmers — which can differ from parent sentiment.
 * By default it's visible only to the admin and the coach themselves; the admin
 * can toggle it public so parents/other coaches see the medal too. */
export type CoachGradeLevel = "Bronze" | "Silver" | "Gold" | "Platinum";

export const COACH_GRADE_LEVELS: CoachGradeLevel[] = ["Bronze", "Silver", "Gold", "Platinum"];

export interface CoachGrade {
  id: string;
  teacherId: string;
  coachName: string;
  level: CoachGradeLevel;
  comment: string;
  by: string; // admin who set the grade
  at: string; // ISO
}

export const coachGrades: CoachGrade[] = [
  {
    id: "CG-1001",
    teacherId: "TCH-09",
    coachName: "Coach Ava Johnson",
    level: "Gold",
    comment:
      "Excellent squad development and race results this term. Strong technical coaching; would like to see more consistent record-book notes to families to reach Platinum.",
    by: "Jessica Davies",
    at: d(20, 10, 0),
  },
];

/** The latest grade for a coach, if any. */
export function coachGradeFor(teacherId: string, grades: CoachGrade[]): CoachGrade | undefined {
  return grades
    .filter((g) => g.teacherId === teacherId)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
}

/* ── Club settings (small key toggles) ───────────────────────────────────────
 * A single-row settings record for club-wide toggles the admin controls. */
export interface ClubSettings {
  id: string;
  /** When true, coach medal grades are visible to parents & other coaches too;
   *  when false (default) only the admin and the graded coach can see them. */
  coachGradingVisible: boolean;
}

export const clubSettings: ClubSettings[] = [{ id: "settings", coachGradingVisible: false }];
