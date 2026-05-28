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
}

const portrait = (path: string) => `https://randomuser.me/api/portraits/${path}`;

export const demoUsers: DemoUser[] = [
  { id: "u1", email: "student@demo.com", password: "demo", name: "Aarav Perera", role: "student", photo: portrait("men/32.jpg"), institution: "Global Coaching Hub", tagline: "Grade 12 · Science stream · GPA 3.8", meta: { grade: "Grade 12", batch: "Science-A" } },
  { id: "u2", email: "parent@demo.com", password: "demo", name: "Nimal Perera", role: "parent", photo: portrait("men/65.jpg"), institution: "Global Coaching Hub", tagline: "Parent of 2 · Engaged guardian", meta: { children: "2" } },
  { id: "u3", email: "teacher@demo.com", password: "demo", name: "Dr. Saman Silva", role: "teacher", photo: portrait("men/45.jpg"), institution: "Global Coaching Hub", tagline: "Physics faculty · 12 yrs experience", meta: { subject: "Physics" } },
  { id: "u4", email: "admin@demo.com", password: "demo", name: "Priya Kumar", role: "admin", photo: portrait("women/44.jpg"), institution: "Platform HQ", tagline: "Platform admin · 248 tenants", meta: { tenants: "248" } },
];

export const students = [
  { id: "S-1001", name: "Aarav Perera", grade: "Grade 12", batch: "Science-A", attendance: 94, gpa: 3.8, status: "Active", parent: "Nimal Perera", risk: "low" },
  { id: "S-1002", name: "Sara Wijesinghe", grade: "Grade 12", batch: "Science-A", attendance: 88, gpa: 3.5, status: "Active", parent: "Kumara Wijesinghe", risk: "low" },
  { id: "S-1003", name: "Mihir Jayasuriya", grade: "Grade 11", batch: "Commerce-B", attendance: 72, gpa: 2.7, status: "Active", parent: "Ravi Jayasuriya", risk: "medium" },
  { id: "S-1004", name: "Nethmi Fernando", grade: "Grade 12", batch: "Arts-A", attendance: 96, gpa: 3.9, status: "Active", parent: "Anjali Fernando", risk: "low" },
  { id: "S-1005", name: "Tharindu Bandara", grade: "Grade 10", batch: "Science-B", attendance: 61, gpa: 2.2, status: "At Risk", parent: "Sunil Bandara", risk: "high" },
  { id: "S-1006", name: "Hiruni Senanayake", grade: "Grade 11", batch: "Science-A", attendance: 91, gpa: 3.6, status: "Active", parent: "Dilani Senanayake", risk: "low" },
  { id: "S-1007", name: "Kavindu Rathnayake", grade: "Grade 12", batch: "Commerce-A", attendance: 84, gpa: 3.2, status: "Active", parent: "Mahesh Rathnayake", risk: "low" },
  { id: "S-1008", name: "Lasitha De Silva", grade: "Grade 10", batch: "Science-A", attendance: 79, gpa: 3.0, status: "Active", parent: "Suresh De Silva", risk: "medium" },
  // ---- Extended roster (realistic class sizes — 10-14 students per batch) ----
  // Science-A · Grade 12
  { id: "S-1010", name: "Imesha Karunaratne", grade: "Grade 12", batch: "Science-A", attendance: 92, gpa: 3.7, status: "Active", parent: "Pradeep Karunaratne", risk: "low" },
  { id: "S-1011", name: "Pasindu Wickramasinghe", grade: "Grade 12", batch: "Science-A", attendance: 87, gpa: 3.4, status: "Active", parent: "Chamara Wickramasinghe", risk: "low" },
  { id: "S-1012", name: "Sandeepa Liyanage", grade: "Grade 12", batch: "Science-A", attendance: 95, gpa: 3.8, status: "Active", parent: "Ruwan Liyanage", risk: "low" },
  { id: "S-1013", name: "Bhanuka Dissanayake", grade: "Grade 12", batch: "Science-A", attendance: 81, gpa: 3.1, status: "Active", parent: "Janaka Dissanayake", risk: "medium" },
  { id: "S-1014", name: "Nuwan Senarathne", grade: "Grade 12", batch: "Science-A", attendance: 89, gpa: 3.5, status: "Active", parent: "Sampath Senarathne", risk: "low" },
  { id: "S-1015", name: "Tushari Munasinghe", grade: "Grade 12", batch: "Science-A", attendance: 93, gpa: 3.7, status: "Active", parent: "Bandula Munasinghe", risk: "low" },
  { id: "S-1016", name: "Roshan Karunaratne", grade: "Grade 12", batch: "Science-A", attendance: 76, gpa: 2.9, status: "Active", parent: "Lakmal Karunaratne", risk: "medium" },
  { id: "S-1017", name: "Niluka Hettiarachchi", grade: "Grade 12", batch: "Science-A", attendance: 90, gpa: 3.6, status: "Active", parent: "Rohan Hettiarachchi", risk: "low" },
  { id: "S-1018", name: "Sachini Goonewardene", grade: "Grade 12", batch: "Science-A", attendance: 97, gpa: 3.9, status: "Active", parent: "Nisha Goonewardene", risk: "low" },
  { id: "S-1019", name: "Arjun Mehta", grade: "Grade 12", batch: "Science-A", attendance: 84, gpa: 3.3, status: "Active", parent: "Vikram Mehta", risk: "low" },

  // Science-B · Grade 10
  { id: "S-1020", name: "Kavya Subramaniam", grade: "Grade 10", batch: "Science-B", attendance: 88, gpa: 3.4, status: "Active", parent: "Karthik Subramaniam", risk: "low" },
  { id: "S-1021", name: "Dhanuka Rajapakse", grade: "Grade 10", batch: "Science-B", attendance: 73, gpa: 2.8, status: "Active", parent: "Sunethra Rajapakse", risk: "medium" },
  { id: "S-1022", name: "Prabath Kumarasinghe", grade: "Grade 10", batch: "Science-B", attendance: 91, gpa: 3.6, status: "Active", parent: "Tilak Kumarasinghe", risk: "low" },
  { id: "S-1023", name: "Meera Iyer", grade: "Grade 10", batch: "Science-B", attendance: 94, gpa: 3.8, status: "Active", parent: "Suresh Iyer", risk: "low" },
  { id: "S-1024", name: "Chamath Abeysekera", grade: "Grade 10", batch: "Science-B", attendance: 68, gpa: 2.5, status: "At Risk", parent: "Wijaya Abeysekera", risk: "high" },
  { id: "S-1025", name: "Hashini Wijesundara", grade: "Grade 10", batch: "Science-B", attendance: 89, gpa: 3.5, status: "Active", parent: "Lalith Wijesundara", risk: "low" },
  { id: "S-1026", name: "Tharindu Ekanayake", grade: "Grade 10", batch: "Science-B", attendance: 82, gpa: 3.2, status: "Active", parent: "Indra Ekanayake", risk: "low" },
  { id: "S-1027", name: "Vihanga Samaratunga", grade: "Grade 10", batch: "Science-B", attendance: 96, gpa: 3.9, status: "Active", parent: "Manel Samaratunga", risk: "low" },
  { id: "S-1028", name: "Yasiru Ratnaweera", grade: "Grade 10", batch: "Science-B", attendance: 78, gpa: 3.0, status: "Active", parent: "Damayanthi Ratnaweera", risk: "medium" },
  { id: "S-1029", name: "Anjali Patel", grade: "Grade 10", batch: "Science-B", attendance: 86, gpa: 3.4, status: "Active", parent: "Rakesh Patel", risk: "low" },
  { id: "S-1030", name: "Raveen Wijewardena", grade: "Grade 10", batch: "Science-B", attendance: 71, gpa: 2.7, status: "Active", parent: "Chandana Wijewardena", risk: "medium" },

  // Commerce-A · Grade 12
  { id: "S-1031", name: "Dilini Amarasinghe", grade: "Grade 12", batch: "Commerce-A", attendance: 92, gpa: 3.6, status: "Active", parent: "Senaka Amarasinghe", risk: "low" },
  { id: "S-1032", name: "Asela Wickramaratne", grade: "Grade 12", batch: "Commerce-A", attendance: 85, gpa: 3.3, status: "Active", parent: "Ananda Wickramaratne", risk: "low" },
  { id: "S-1033", name: "Pooja Krishnan", grade: "Grade 12", batch: "Commerce-A", attendance: 94, gpa: 3.7, status: "Active", parent: "Ravi Krishnan", risk: "low" },
  { id: "S-1034", name: "Charith Nanayakkara", grade: "Grade 12", batch: "Commerce-A", attendance: 79, gpa: 3.0, status: "Active", parent: "Sumith Nanayakkara", risk: "medium" },
  { id: "S-1035", name: "Yashodhara Pieris", grade: "Grade 12", batch: "Commerce-A", attendance: 88, gpa: 3.4, status: "Active", parent: "Asanga Pieris", risk: "low" },
  { id: "S-1036", name: "Janith Gunatilake", grade: "Grade 12", batch: "Commerce-A", attendance: 75, gpa: 2.8, status: "Active", parent: "Wasantha Gunatilake", risk: "medium" },
  { id: "S-1037", name: "Sanduni Marasinghe", grade: "Grade 12", batch: "Commerce-A", attendance: 96, gpa: 3.8, status: "Active", parent: "Niranjan Marasinghe", risk: "low" },
  { id: "S-1038", name: "Rohan Sharma", grade: "Grade 12", batch: "Commerce-A", attendance: 83, gpa: 3.2, status: "Active", parent: "Vinod Sharma", risk: "low" },
  { id: "S-1039", name: "Madushika Jayasekera", grade: "Grade 12", batch: "Commerce-A", attendance: 91, gpa: 3.5, status: "Active", parent: "Chandika Jayasekera", risk: "low" },
  { id: "S-1040", name: "Tharaka Wickrematunge", grade: "Grade 12", batch: "Commerce-A", attendance: 87, gpa: 3.4, status: "Active", parent: "Roshani Wickrematunge", risk: "low" },

  // Commerce-B · Grade 11
  { id: "S-1041", name: "Ishini Gomes", grade: "Grade 11", batch: "Commerce-B", attendance: 90, gpa: 3.5, status: "Active", parent: "Felix Gomes", risk: "low" },
  { id: "S-1042", name: "Dilshan Karunatilake", grade: "Grade 11", batch: "Commerce-B", attendance: 67, gpa: 2.4, status: "At Risk", parent: "Saroja Karunatilake", risk: "high" },
  { id: "S-1043", name: "Nimesha Bandaranayake", grade: "Grade 11", batch: "Commerce-B", attendance: 84, gpa: 3.2, status: "Active", parent: "Indika Bandaranayake", risk: "low" },
  { id: "S-1044", name: "Kasun Rajakaruna", grade: "Grade 11", batch: "Commerce-B", attendance: 78, gpa: 3.0, status: "Active", parent: "Champika Rajakaruna", risk: "medium" },
  { id: "S-1045", name: "Sithara Embuldeniya", grade: "Grade 11", batch: "Commerce-B", attendance: 93, gpa: 3.7, status: "Active", parent: "Anura Embuldeniya", risk: "low" },
  { id: "S-1046", name: "Praveen Rajan", grade: "Grade 11", batch: "Commerce-B", attendance: 81, gpa: 3.1, status: "Active", parent: "Mohan Rajan", risk: "low" },
  { id: "S-1047", name: "Tharushi Kahawita", grade: "Grade 11", batch: "Commerce-B", attendance: 89, gpa: 3.5, status: "Active", parent: "Lalantha Kahawita", risk: "low" },
  { id: "S-1048", name: "Ashan Premaratne", grade: "Grade 11", batch: "Commerce-B", attendance: 72, gpa: 2.7, status: "Active", parent: "Saman Premaratne", risk: "medium" },
  { id: "S-1049", name: "Devni Wickramanayake", grade: "Grade 11", batch: "Commerce-B", attendance: 95, gpa: 3.8, status: "Active", parent: "Anoma Wickramanayake", risk: "low" },
  { id: "S-1050", name: "Sahan Liyanagamage", grade: "Grade 11", batch: "Commerce-B", attendance: 86, gpa: 3.3, status: "Active", parent: "Buddhika Liyanagamage", risk: "low" },

  // Arts-A · Grade 12
  { id: "S-1051", name: "Anushka Wijegunaratne", grade: "Grade 12", batch: "Arts-A", attendance: 92, gpa: 3.6, status: "Active", parent: "Chinthaka Wijegunaratne", risk: "low" },
  { id: "S-1052", name: "Kithmin Perera", grade: "Grade 12", batch: "Arts-A", attendance: 88, gpa: 3.4, status: "Active", parent: "Chamari Perera", risk: "low" },
  { id: "S-1053", name: "Diluni Sirisena", grade: "Grade 12", batch: "Arts-A", attendance: 94, gpa: 3.7, status: "Active", parent: "Rajitha Sirisena", risk: "low" },
  { id: "S-1054", name: "Maleesha Jayatissa", grade: "Grade 12", batch: "Arts-A", attendance: 83, gpa: 3.2, status: "Active", parent: "Upali Jayatissa", risk: "low" },
  { id: "S-1055", name: "Heshan Wickramage", grade: "Grade 12", batch: "Arts-A", attendance: 76, gpa: 2.9, status: "Active", parent: "Niranjan Wickramage", risk: "medium" },
  { id: "S-1056", name: "Saritha Devraj", grade: "Grade 12", batch: "Arts-A", attendance: 91, gpa: 3.5, status: "Active", parent: "Anil Devraj", risk: "low" },
  { id: "S-1057", name: "Mihina Senarath", grade: "Grade 12", batch: "Arts-A", attendance: 85, gpa: 3.3, status: "Active", parent: "Padmini Senarath", risk: "low" },
  { id: "S-1058", name: "Lakshan Edirisuriya", grade: "Grade 12", batch: "Arts-A", attendance: 79, gpa: 3.0, status: "Active", parent: "Kanchana Edirisuriya", risk: "medium" },
  { id: "S-1059", name: "Tashmi Welikala", grade: "Grade 12", batch: "Arts-A", attendance: 96, gpa: 3.9, status: "Active", parent: "Buddhi Welikala", risk: "low" },
  { id: "S-1060", name: "Rikitha Vidanapathirana", grade: "Grade 12", batch: "Arts-A", attendance: 89, gpa: 3.5, status: "Active", parent: "Sirimal Vidanapathirana", risk: "low" },
];

export const courses = [
  { id: "C-PHY12", title: "Advanced Physics", code: "PHY-12", teacher: "Dr. Saman Silva", students: 42, credits: 4, schedule: "Mon/Wed 4-6 PM", rating: 4.8, price: 120, category: "Science" },
  { id: "C-CHEM12", title: "Organic Chemistry", code: "CHEM-12", teacher: "Mrs. Lalani Perera", students: 38, credits: 4, schedule: "Tue/Thu 4-6 PM", rating: 4.7, price: 110, category: "Science" },
  { id: "C-MATH12", title: "Combined Mathematics", code: "MATH-12", teacher: "Mr. Asanka Gunasekara", students: 56, credits: 5, schedule: "Mon-Fri 8-10 AM", rating: 4.9, price: 150, category: "Mathematics" },
  { id: "C-BIO12", title: "Biology — Cellular Systems", code: "BIO-12", teacher: "Dr. Ramya Jayaweera", students: 33, credits: 4, schedule: "Wed/Fri 3-5 PM", rating: 4.6, price: 115, category: "Science" },
  { id: "C-ENG12", title: "English Literature", code: "ENG-12", teacher: "Ms. Chandrika Soysa", students: 28, credits: 3, schedule: "Tue 6-8 PM", rating: 4.5, price: 80, category: "Languages" },
  { id: "C-ICT12", title: "Information & Communication Tech", code: "ICT-12", teacher: "Mr. Dineth Wickrama", students: 47, credits: 4, schedule: "Sat 9-12 AM", rating: 4.7, price: 100, category: "Technology" },
];

export const attendanceToday = [
  { id: "S-1001", name: "Aarav Perera", time: "08:02 AM", method: "Facial Recognition", status: "Present" },
  { id: "S-1002", name: "Sara Wijesinghe", time: "08:05 AM", method: "QR Scan", status: "Present" },
  { id: "S-1003", name: "Mihir Jayasuriya", time: "—", method: "—", status: "Absent" },
  { id: "S-1004", name: "Nethmi Fernando", time: "07:58 AM", method: "RFID", status: "Present" },
  { id: "S-1005", name: "Tharindu Bandara", time: "08:42 AM", method: "GPS", status: "Late" },
  { id: "S-1006", name: "Hiruni Senanayake", time: "08:01 AM", method: "QR Scan", status: "Present" },
];

export const assignments = [
  { id: "A-201", course: "Advanced Physics", title: "Quantum Mechanics Problem Set", due: "2026-06-02", status: "Pending", score: null },
  { id: "A-202", course: "Combined Mathematics", title: "Calculus II — Integrals", due: "2026-05-30", status: "Submitted", score: 92 },
  { id: "A-203", course: "Organic Chemistry", title: "Lab Report: Alkenes", due: "2026-06-05", status: "Pending", score: null },
  { id: "A-204", course: "English Literature", title: "Essay: Modernism in Poetry", due: "2026-05-28", status: "Graded", score: 88 },
  { id: "A-205", course: "ICT", title: "Database Design Project", due: "2026-06-10", status: "Pending", score: null },
];

export const grades = [
  { course: "Advanced Physics", mid: 84, final: 89, grade: "A" },
  { course: "Combined Mathematics", mid: 92, final: 95, grade: "A+" },
  { course: "Organic Chemistry", mid: 78, final: 82, grade: "B+" },
  { course: "English Literature", mid: 86, final: 88, grade: "A" },
  { course: "ICT", mid: 90, final: 94, grade: "A+" },
];

export const invoices = [
  { id: "INV-2026-0421", date: "2026-05-01", desc: "May Tuition — Physics + Math", amount: 270, status: "Paid", method: "Visa •••• 4242" },
  { id: "INV-2026-0508", date: "2026-05-15", desc: "Lab Fee — Chemistry", amount: 45, status: "Paid", method: "PayPal" },
  { id: "INV-2026-0612", date: "2026-06-01", desc: "June Tuition — All Subjects", amount: 510, status: "Due", method: "—" },
  { id: "INV-2026-0703", date: "2026-06-15", desc: "Exam Registration", amount: 75, status: "Upcoming", method: "—" },
];

export const messages = [
  { from: "Dr. Saman Silva", role: "Teacher", preview: "Reminder: Lab tomorrow at 3 PM.", time: "10:42 AM", unread: true },
  { from: "Finance Office", role: "Admin", preview: "Your June invoice is now available.", time: "Yesterday", unread: true },
  { from: "Mrs. Lalani Perera", role: "Teacher", preview: "Great work on your chemistry essay.", time: "2 days ago", unread: false },
  { from: "Counselor Riya", role: "Counselor", preview: "Let's schedule our monthly catch-up.", time: "3 days ago", unread: false },
];

export const notifications = [
  { type: "grade", text: "Your Math II calculus assignment was graded: 92/100", time: "2h ago" },
  { type: "attendance", text: "Attendance recorded via facial recognition", time: "today 08:02" },
  { type: "billing", text: "June invoice of $510 is due in 5 days", time: "yesterday" },
  { type: "class", text: "Physics live class starts in 15 minutes", time: "10 min ago" },
];

export const leads = [
  { name: "Ishara Madushani", source: "Facebook Ad", interest: "A/L Science", stage: "Qualified", owner: "Marketing — Rajiv", value: 1200 },
  { name: "Yasodha Perera", source: "Google Search", interest: "O/L Math", stage: "Contacted", owner: "Marketing — Anu", value: 600 },
  { name: "Kasun Wijeratne", source: "Referral", interest: "ICT Advanced", stage: "Demo Booked", owner: "Marketing — Rajiv", value: 900 },
  { name: "Dilshan Kumara", source: "Instagram", interest: "English", stage: "New", owner: "Unassigned", value: 320 },
  { name: "Rashmi Edirisinghe", source: "Web Form", interest: "Combined Maths", stage: "Closed Won", owner: "Marketing — Anu", value: 1500 },
];

export const marketplaceCourses = [
  { id: "MP-1", title: "IELTS Mastery 2026", provider: "BrightPath Institute", rating: 4.9, students: 12483, price: 79, tag: "Bestseller", category: "Languages" },
  { id: "MP-2", title: "AP Calculus BC Crash Course", provider: "MathLab Pro", rating: 4.8, students: 7421, price: 99, tag: "New", category: "Mathematics" },
  { id: "MP-3", title: "Full-Stack Web Dev Bootcamp", provider: "CodeCraft Academy", rating: 4.9, students: 22301, price: 149, tag: "Bestseller", category: "Technology" },
  { id: "MP-4", title: "MCAT Biology Intensive", provider: "PreMed Global", rating: 4.7, students: 5612, price: 129, category: "Science" },
  { id: "MP-5", title: "Cambridge A/L Physics", provider: "Global Coaching Hub", rating: 4.8, students: 3120, price: 89, category: "Science" },
  { id: "MP-6", title: "Spoken French — Beginner", provider: "Lingua Vista", rating: 4.6, students: 9870, price: 49, tag: "Trending", category: "Languages" },
];

export const tenants = [
  { id: "T-001", name: "Global Coaching Hub", country: "Sri Lanka", students: 1842, plan: "Enterprise", status: "Active", mrr: 4900 },
  { id: "T-002", name: "EduStar International", country: "India", students: 3210, plan: "Enterprise", status: "Active", mrr: 7200 },
  { id: "T-003", name: "BrightPath Institute", country: "UAE", students: 642, plan: "Growth", status: "Active", mrr: 1450 },
  { id: "T-004", name: "MathLab Pro", country: "USA", students: 980, plan: "Growth", status: "Trial", mrr: 0 },
  { id: "T-005", name: "Lingua Vista", country: "France", students: 412, plan: "Starter", status: "Active", mrr: 320 },
];

export const platformUsers = [
  { name: "Priya Kumar", email: "priya@platform.io", role: "Super Admin", lastLogin: "10 min ago", mfa: true },
  { name: "Dr. Saman Silva", email: "saman@gch.lk", role: "Teacher", lastLogin: "2h ago", mfa: true },
  { name: "Nimal Perera", email: "nimal@gmail.com", role: "Parent", lastLogin: "1d ago", mfa: false },
  { name: "Aarav Perera", email: "aarav@gmail.com", role: "Student", lastLogin: "5 min ago", mfa: true },
  { name: "Rajiv Marketing", email: "rajiv@gch.lk", role: "Marketing Officer", lastLogin: "30 min ago", mfa: true },
];

export const auditLog = [
  { time: "11:42 AM", actor: "priya@platform.io", action: "Updated tenant plan", target: "T-003 BrightPath", severity: "info" },
  { time: "10:15 AM", actor: "saman@gch.lk", action: "Published grades", target: "PHY-12 Mid Term", severity: "info" },
  { time: "09:01 AM", actor: "system", action: "Backup completed", target: "tenant-data-eu", severity: "success" },
  { time: "Yesterday", actor: "unknown", action: "Failed MFA attempt", target: "admin@demo.com", severity: "warning" },
  { time: "Yesterday", actor: "rajiv@gch.lk", action: "Exported lead list", target: "leads-q2.csv", severity: "info" },
];

export const aiInsights = [
  { title: "12 students predicted at risk of failing", desc: "Combined Maths cohort — pattern: attendance < 70% and weak quiz scores.", action: "Schedule counselor intervention", confidence: 0.87, severity: "high" },
  { title: "Course recommendation for Aarav Perera", desc: "Based on performance, suggest 'AP Calculus BC Crash Course' from marketplace.", action: "Send recommendation", confidence: 0.92, severity: "info" },
  { title: "Dropout risk: Tharindu Bandara", desc: "Behavioural + attendance + finance signals indicate elevated risk.", action: "Notify parent + counselor", confidence: 0.79, severity: "high" },
  { title: "Optimal exam date suggestion", desc: "Model predicts 14% higher pass rate if mid-term moved to June 18.", action: "Propose to academic board", confidence: 0.71, severity: "info" },
];

export const children = [
  { id: "S-1001", name: "Aarav Perera", grade: "Grade 12 — Science", attendance: 94, gpa: 3.8, nextClass: "Physics @ 4 PM", duesUSD: 510 },
  { id: "S-1009", name: "Tashi Perera", grade: "Grade 8", attendance: 97, gpa: 3.7, nextClass: "Math @ 9 AM tomorrow", duesUSD: 280 },
];

export const teacherClasses = [
  { id: "PHY-12", name: "Advanced Physics", batch: "Science-A", students: 42, nextSession: "Today 4:00 PM", room: "Lab 3 / Zoom" },
  { id: "PHY-11", name: "Physics Foundations", batch: "Science-B", students: 38, nextSession: "Tomorrow 10:00 AM", room: "Room 2B" },
  { id: "PHY-AL", name: "A/L Revision Cohort", batch: "Revision", students: 64, nextSession: "Sat 9:00 AM", room: "Hall + Zoom" },
];

export const attendanceTrend = [
  { week: "W1", rate: 92 }, { week: "W2", rate: 89 }, { week: "W3", rate: 94 },
  { week: "W4", rate: 88 }, { week: "W5", rate: 91 }, { week: "W6", rate: 95 },
  { week: "W7", rate: 93 }, { week: "W8", rate: 90 },
];

export const revenueTrend = [
  { m: "Jan", v: 42 }, { m: "Feb", v: 51 }, { m: "Mar", v: 58 },
  { m: "Apr", v: 62 }, { m: "May", v: 71 }, { m: "Jun", v: 79 },
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
    studentName: "Aarav Perera",
    authorName: "Dr. Saman Silva",
    authorRole: "teacher",
    type: "permission",
    title: "Field trip — Planetarium (Jun 14)",
    body:
      "We're visiting the Colombo Planetarium on Friday, 14 June, 8 AM – 1 PM. Please acknowledge before Wednesday. Bus departs from the main gate. Pack a snack and water bottle.",
    date: d(0, 8, 12),
    pinned: true,
    requiresAck: true,
    replies: [],
  },
  {
    id: "SRB-502",
    studentId: "S-1001",
    studentName: "Aarav Perera",
    authorName: "Dr. Saman Silva",
    authorRole: "teacher",
    type: "achievement",
    title: "Top score in physics quiz",
    body:
      "Aarav scored 49/50 on this week's Quantum Mechanics quiz — class average was 36/50. Excellent grasp of wave-particle duality. Keep it up!",
    date: d(1, 14, 30),
    replies: [
      {
        id: "r1",
        authorName: "Nimal Perera",
        authorRole: "parent",
        text: "Thank you for letting us know! We'll celebrate at dinner tonight.",
        at: d(1, 18, 5),
      },
    ],
    ackBy: "Nimal Perera",
    ackAt: d(1, 18, 0),
  },
  {
    id: "SRB-503",
    studentId: "S-1001",
    studentName: "Aarav Perera",
    authorName: "Mrs. Lalani Perera",
    authorRole: "teacher",
    type: "homework",
    title: "Chemistry: Lab report due Friday",
    body:
      "Write up the alkene addition experiment we did today. 2–3 pages with hand-drawn mechanisms. Due Friday 8 AM.",
    date: d(2, 15, 0),
    ackBy: "Nimal Perera",
    ackAt: d(2, 19, 22),
  },
  {
    id: "SRB-504",
    studentId: "S-1001",
    studentName: "Aarav Perera",
    authorName: "Counselor Riya",
    authorRole: "counselor",
    type: "remark",
    title: "Counseling check-in — June",
    body:
      "Had our monthly chat. Aarav is feeling positive about A/Ls and has joined the chess club. No concerns at this time.",
    date: d(4, 11, 0),
    replies: [],
  },
  {
    id: "SRB-505",
    studentId: "S-1001",
    studentName: "Aarav Perera",
    authorName: "Nimal Perera",
    authorRole: "parent",
    type: "communication",
    title: "Aarav will be 15 min late tomorrow",
    body:
      "We have a dental appointment in the morning. Aarav will join the second period. Apologies for the late notice.",
    date: d(3, 20, 30),
    replies: [
      {
        id: "r2",
        authorName: "Dr. Saman Silva",
        authorRole: "teacher",
        text: "Noted, no problem. I'll share the morning's notes with him.",
        at: d(3, 21, 0),
      },
    ],
  },
  {
    id: "SRB-506",
    studentId: "S-1001",
    studentName: "Aarav Perera",
    authorName: "School Nurse",
    authorRole: "admin",
    type: "health",
    title: "Routine vision screening — passed",
    body: "Annual vision screening completed. Result: 20/20 both eyes. No further action.",
    date: d(7, 10, 15),
  },
  {
    id: "SRB-507",
    studentId: "S-1001",
    studentName: "Aarav Perera",
    authorName: "Mr. Asanka Gunasekara",
    authorRole: "teacher",
    type: "behavior",
    title: "Excellent group leadership",
    body:
      "Aarav led the maths problem-solving group today and helped two classmates understand integration. Strong collaborative behaviour.",
    date: d(5, 13, 45),
    ackBy: "Nimal Perera",
    ackAt: d(5, 18, 22),
  },
  /* Tashi Perera — second child for the demo parent */
  {
    id: "SRB-510",
    studentId: "S-1009",
    studentName: "Tashi Perera",
    authorName: "Ms. Chandrika Soysa",
    authorRole: "teacher",
    type: "homework",
    title: "English: Read chapters 4–6 by Monday",
    body:
      "Reading assignment from 'The Giver'. Be ready to discuss the role of Sameness in the community.",
    date: d(1, 16, 0),
  },
  {
    id: "SRB-511",
    studentId: "S-1009",
    studentName: "Tashi Perera",
    authorName: "Ms. Chandrika Soysa",
    authorRole: "teacher",
    type: "achievement",
    title: "Story-writing competition: 2nd place",
    body:
      "Tashi's short story 'The Lantern Keeper' placed 2nd in the inter-school writing contest. A certificate will follow.",
    date: d(6, 9, 30),
    replies: [
      {
        id: "r3",
        authorName: "Nimal Perera",
        authorRole: "parent",
        text: "🎉 So proud of her! Thank you for encouraging her.",
        at: d(6, 12, 12),
      },
    ],
    ackBy: "Nimal Perera",
    ackAt: d(6, 12, 0),
  },
  {
    id: "SRB-512",
    studentId: "S-1009",
    studentName: "Tashi Perera",
    authorName: "Ms. Chandrika Soysa",
    authorRole: "teacher",
    type: "behavior",
    title: "Disrupting class — June 5",
    body:
      "Tashi was chatting during the silent reading period and needed two reminders. Please have a brief conversation at home.",
    date: d(8, 11, 0),
    requiresAck: true,
  },
  /* A couple of entries for at-risk Tharindu for the teacher demo */
  {
    id: "SRB-520",
    studentId: "S-1005",
    studentName: "Tharindu Bandara",
    authorName: "Dr. Saman Silva",
    authorRole: "teacher",
    type: "remark",
    title: "Attendance concern — please call us",
    body:
      "Tharindu has missed 4 consecutive physics classes. Could we set up a parent-teacher call this week?",
    date: d(2, 17, 30),
    pinned: true,
    requiresAck: true,
  },
  {
    id: "SRB-521",
    studentId: "S-1005",
    studentName: "Tharindu Bandara",
    authorName: "Counselor Riya",
    authorRole: "counselor",
    type: "communication",
    title: "Wellness check-in scheduled",
    body:
      "I've blocked 30 minutes on Thursday at 11 AM for a check-in with Tharindu. Parents are welcome to join.",
    date: d(3, 14, 0),
  },
];
