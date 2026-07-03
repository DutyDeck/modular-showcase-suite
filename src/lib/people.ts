/**
 * Single source of truth for how a *person* is portrayed across the app:
 * their gender (so a male name never gets a female face) and, for the
 * demo-critical people, an explicit portrait so the SAME face shows up
 * everywhere — login, profile, header, roster, parent portal, SRB, and the
 * cross-tenant search card.
 *
 * The Avatar component consults these helpers whenever it has to derive a
 * portrait (i.e. when no explicit `src` is passed). Because Avatar always
 * knows the person's display name, a name-keyed override is enough to keep a
 * person's face stable regardless of whether the call site seeds by 1StudentID
 * or by name.
 */

const p = (path: string) => `https://randomuser.me/api/portraits/${path}`;

/** Honorifics / role words that precede a real first name. */
const PREFIXES: Record<string, "male" | "female" | ""> = {
  mr: "male",
  "mr.": "male",
  sir: "male",
  mrs: "female",
  "mrs.": "female",
  ms: "female",
  "ms.": "female",
  miss: "female",
  madam: "female",
  mdm: "female",
  // gender-neutral titles/roles — strip but don't decide gender
  dr: "",
  "dr.": "",
  prof: "",
  "prof.": "",
  mx: "",
  counselor: "",
  coach: "",
  nurse: "",
};

/** First names in the demo dataset known to be female. */
const FEMALE_NAMES = new Set([
  "abigail",
  "alice",
  "amelia",
  "amy",
  "ava",
  "bethan",
  "bethany",
  "charlotte",
  "chloe",
  "claire",
  "daisy",
  "danielle",
  "eleanor",
  "ella",
  "elsie",
  "emily",
  "emma",
  "erin",
  "evie",
  "florence",
  "freya",
  "gemma",
  "georgia",
  "grace",
  "hannah",
  "harriet",
  "hayley",
  "helen",
  "holly",
  "imogen",
  "isabella",
  "isabelle",
  "isla",
  "jessica",
  "joanne",
  "julie",
  "karen",
  "katie",
  "laura",
  "lily",
  "lisa",
  "lucy",
  "maisie",
  "megan",
  "mia",
  "michelle",
  "millie",
  "molly",
  "nicola",
  "olivia",
  "phoebe",
  "poppy",
  "rachel",
  "rebecca",
  "rosie",
  "ruby",
  "sarah",
  "scarlett",
  "sienna",
  "sophia",
  "sophie",
  "victoria",
]);

/** First names in the demo dataset known to be male. */
const MALE_NAMES = new Set([
  "aaron",
  "adam",
  "aiden",
  "alan",
  "alexander",
  "alfie",
  "andrew",
  "anthony",
  "archie",
  "arthur",
  "barry",
  "benjamin",
  "bradley",
  "callum",
  "cameron",
  "carl",
  "charlie",
  "christopher",
  "colin",
  "connor",
  "craig",
  "daniel",
  "david",
  "dean",
  "derek",
  "dylan",
  "edward",
  "elliot",
  "ethan",
  "finley",
  "freddie",
  "gareth",
  "gary",
  "george",
  "graham",
  "harrison",
  "harry",
  "henry",
  "hugo",
  "ian",
  "isaac",
  "jack",
  "jacob",
  "james",
  "jamie",
  "jonathan",
  "joseph",
  "joshua",
  "keith",
  "kevin",
  "lee",
  "leo",
  "liam",
  "logan",
  "louis",
  "lucas",
  "malcolm",
  "marcus",
  "mark",
  "martin",
  "mason",
  "max",
  "michael",
  "nathan",
  "neil",
  "nicholas",
  "nigel",
  "noah",
  "oliver",
  "oscar",
  "owen",
  "paul",
  "peter",
  "philip",
  "reuben",
  "richard",
  "robert",
  "roger",
  "ross",
  "ryan",
  "samuel",
  "scott",
  "sebastian",
  "shaun",
  "simon",
  "stanley",
  "stephen",
  "theo",
  "thomas",
  "timothy",
  "toby",
  "trevor",
  "wayne",
  "william",
]);

function tokens(name: string): string[] {
  return name
    .replace(/\([^)]*\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Best-effort gender for a display name. Honorifics win (Mr/Mrs/Ms); otherwise
 * the first real first-name token is matched against the curated sets. Unknown
 * names default to "male" (the residual demo names that aren't classified are
 * predominantly organisational labels and male names).
 */
export function genderFor(name: string): "male" | "female" {
  const parts = tokens(name);
  let i = 0;
  // Strip a leading honorific/role word, capturing any gender it implies.
  while (i < parts.length) {
    const key = parts[i].toLowerCase();
    if (key in PREFIXES) {
      const g = PREFIXES[key];
      if (g) return g;
      i++;
    } else break;
  }
  const first = (parts[i] ?? parts[0] ?? "").toLowerCase();
  if (FEMALE_NAMES.has(first)) return "female";
  if (MALE_NAMES.has(first)) return "male";
  return "male";
}

/**
 * Explicit portraits for people who appear in more than one place, keyed by
 * exact display name. The six demo-account URLs MUST match the `photo` fields
 * in mockData so login/profile/header (which pass `src` directly) line up with
 * everywhere else (which derives the portrait from the name).
 */
export const PHOTO_OVERRIDES: Record<string, string> = {
  // Demo accounts
  "Oliver Smith": p("men/32.jpg"),
  "Jack Smith": p("men/65.jpg"),
  "Dr. Charlie Brown": p("men/45.jpg"),
  "Isla Williams": p("women/44.jpg"),
  "Jacob Wilson": p("men/52.jpg"),
  "Emily Taylor": p("women/29.jpg"),
  // Other people visible across multiple views
  "Olivia Smith": p("women/33.jpg"),
  "Harry Jones": p("men/36.jpg"),
  "Isabella Evans": p("women/55.jpg"),
  // Swim Academy staff — keep faces identical in messaging, rosters, sessions,
  // the coaching page and appraisals (must match their mockData `photo`).
  "Coach Ava Johnson": p("women/63.jpg"),
  "Jessica Davies": p("women/68.jpg"),
  "Coach Thomas Robinson": p("men/26.jpg"),
  "Coach Poppy Wright": p("women/48.jpg"),
  "Coach Oscar Thompson": p("men/64.jpg"),
};

export function photoOverride(name: string): string | undefined {
  return PHOTO_OVERRIDES[name];
}
