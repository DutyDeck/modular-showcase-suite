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
 * person's face stable regardless of whether the call site seeds by One Edu ID
 * or by name.
 */

const p = (path: string) => `https://randomuser.me/api/portraits/${path}`;

/** Honorifics / role words that precede a real first name. */
const PREFIXES: Record<string, "male" | "female" | "" > = {
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
  "sara", "nethmi", "hiruni", "tashi", "imesha", "tushari", "niluka", "sachini",
  "kavya", "meera", "hashini", "anjali", "dilini", "pooja", "yashodhara",
  "sanduni", "madushika", "ishini", "nimesha", "sithara", "tharushi", "devni",
  "anushka", "diluni", "maleesha", "saritha", "mihina", "tashmi", "rikitha",
  "senuli", "nadia", "riya", "lalani", "chathuri", "chandrika", "priyanka",
  "priya", "dilani", "anoma", "kumari", "vihanga",
]);

/** First names in the demo dataset known to be male. */
const MALE_NAMES = new Set([
  "aarav", "mihir", "tharindu", "kavindu", "lasitha", "pasindu", "sandeepa",
  "bhanuka", "nuwan", "roshan", "arjun", "dhanuka", "prabath", "chamath",
  "yasiru", "raveen", "asela", "charith", "janith", "rohan", "tharaka",
  "dilshan", "kasun", "praveen", "ashan", "sahan", "kithmin", "heshan",
  "lakshan", "rehan", "saman", "asanka", "nimal", "ananda", "kumara", "ravi",
  "sunil", "mahesh", "suresh", "rajiv", "dineth",
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
  "Aarav Perera": p("men/32.jpg"),
  "Nimal Perera": p("men/65.jpg"),
  "Dr. Saman Silva": p("men/45.jpg"),
  "Priya Kumar": p("women/44.jpg"),
  "Ananda Wijesinghe": p("men/52.jpg"),
  "Senuli Fernando": p("women/29.jpg"),
  // Other people visible across multiple views
  "Tashi Perera": p("women/33.jpg"),
  "Rehan Gupta": p("men/36.jpg"),
  "Sara Wijesinghe": p("women/55.jpg"),
};

export function photoOverride(name: string): string | undefined {
  return PHOTO_OVERRIDES[name];
}
