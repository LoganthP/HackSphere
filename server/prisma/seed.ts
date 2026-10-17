/* eslint-disable no-console */
import { prisma, type EventStage } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/security";
import { weightedScore } from "../src/lib/scoring";

const DAY = 864e5;
const now = Date.now();
const at = (days: number, hour = 10) => {
  const d = new Date(now + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const PASSWORD = "HackSphere@123";

const people = [
  { key: "admin", name: "Neha Kulkarni", email: "admin@hacksphere.dev", role: "ADMIN", color: "#202747" },
  { key: "organizer", name: "Priya Raman", email: "organizer@hacksphere.dev", role: "ORGANIZER", verified: true, color: "#7058F5", college: "HackSphere Events Team" },
  { key: "newOrg", name: "Tech Club VVCE", email: "techclub@hacksphere.dev", role: "ORGANIZER", verified: false, color: "#4285FF", college: "Vidyavardhaka College of Engineering" },
  { key: "judge", name: "Dr. Arvind Rao", email: "judge@hacksphere.dev", color: "#3DCFAE", college: "Industry mentor", skills: "ML, systems design" },
  { key: "judge2", name: "Sana Sheikh", email: "judge2@hacksphere.dev", color: "#FF7890", college: "Product designer", skills: "UX, accessibility" },
  { key: "leader", name: "Ananya Iyer", email: "leader@hacksphere.dev", color: "#FF7890", college: "VVCE Mysuru", skills: "React, TypeScript, UI design" },
  { key: "student", name: "Rahul Menon", email: "student@hacksphere.dev", color: "#4285FF", college: "VVCE Mysuru", skills: "Python, ML, data" },
  { key: "karthik", name: "Karthik Gowda", email: "karthik@hacksphere.dev", color: "#FFC857", college: "NIE Mysuru", skills: "Node, IoT, climate" },
  { key: "meera", name: "Meera Nair", email: "meera@hacksphere.dev", color: "#3DCFAE", college: "SJCE Mysuru", skills: "Figma, research" },
  { key: "sneha", name: "Sneha Patil", email: "sneha@hacksphere.dev", color: "#7058F5", college: "RVCE Bengaluru", skills: "Flutter, Firebase" },
  { key: "vikram", name: "Vikram Shetty", email: "vikram@hacksphere.dev", color: "#FF7890", college: "PES University", skills: "Go, cloud, DevOps" },
  { key: "divya", name: "Divya Hegde", email: "divya@hacksphere.dev", color: "#4285FF", college: "BMSCE", skills: "Data science, health" },
  { key: "arjun", name: "Arjun Das", email: "arjun@hacksphere.dev", color: "#FFC857", college: "MIT Manipal", skills: "Blockchain, finance" },
  { key: "fatima", name: "Fatima Khan", email: "fatima@hacksphere.dev", color: "#3DCFAE", college: "Christ University", skills: "Python, NLP" },
  { key: "rohan", name: "Rohan Joshi", email: "rohan@hacksphere.dev", color: "#7058F5", college: "VVCE Mysuru", skills: "Java, Spring, SQL" },
  { key: "isha", name: "Isha Reddy", email: "isha@hacksphere.dev", color: "#FF7890", college: "NIE Mysuru", skills: "UI, motion design" },
] as const;

type Key = (typeof people)[number]["key"];

async function reset() {
  // Children first, respecting foreign keys.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.judgeAssignment.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.project.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.problemStatement.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.eventRole.deleteMany();
  await prisma.event.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

const CRITERIA = [
  { name: "Innovation", description: "Originality of the idea and approach.", weight: 1.25 },
  { name: "Technical implementation", description: "Quality, completeness and complexity of the build.", weight: 1.5 },
  { name: "User experience", description: "How usable, clear and accessible the product is.", weight: 1 },
  { name: "Feasibility", description: "Could this be deployed and sustained in the real world?", weight: 1 },
  { name: "Presentation", description: "Clarity of the demo, pitch and documentation.", weight: 0.75 },
];

async function main() {
  console.log("Resetting data…");
  await reset();

  const passwordHash = await hashPassword(PASSWORD);
  const u = {} as Record<Key, string>;
  for (const p of people) {
    const created = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        passwordHash,
        role: ("role" in p ? p.role : "PARTICIPANT") as "ADMIN" | "ORGANIZER" | "PARTICIPANT",
        organizerVerified: "verified" in p ? p.verified : false,
        avatarColor: p.color,
        college: "college" in p ? p.college : null,
        skills: "skills" in p ? p.skills : null,
        createdAt: new Date(now - Math.floor(Math.random() * 20 + 3) * DAY),
      },
    });
    u[p.key] = created.id;
  }

  async function makeEvent(opts: {
    slug: string;
    title: string;
    tagline: string;
    description: string;
    category: string;
    mode: "ONLINE" | "OFFLINE" | "HYBRID";
    location?: string;
    stage: EventStage;
    regCloses: number;
    starts: number;
    deadline: number;
    ends: number;
    accent: string;
    prizes: string;
    resultsPublished?: boolean;
    maxTeamSize?: number;
    problems: { code: string; title: string; category: string; difficulty: "EASY" | "MEDIUM" | "HARD"; description: string; expectedOutput: string; resources?: string; selectionLimit?: number }[];
    judges?: Key[];
  }) {
    const event = await prisma.event.create({
      data: {
        slug: opts.slug,
        title: opts.title,
        tagline: opts.tagline,
        description: opts.description,
        category: opts.category,
        mode: opts.mode,
        location: opts.location ?? null,
        stage: opts.stage,
        registrationClosesAt: at(opts.regCloses, 23),
        startsAt: at(opts.starts, 9),
        submissionDeadline: at(opts.deadline, 18),
        endsAt: at(opts.ends, 20),
        minTeamSize: 2,
        maxTeamSize: opts.maxTeamSize ?? 4,
        maxTeams: 60,
        eligibility: "Open to undergraduate and postgraduate students in India. Bring a valid college ID.",
        rules:
          "All code must be written during the hackathon.\nOpen-source libraries and APIs are allowed; credit them in your README.\nOne team per person.\nSubmissions must include a public repository and a demo link or video.",
        prizes: opts.prizes,
        accentColor: opts.accent,
        resultsPublished: opts.resultsPublished ?? false,
        organizerId: u.organizer,
        roles: {
          create: [
            { userId: u.organizer, role: "ORGANIZER" },
            ...(opts.judges ?? []).map((k) => ({ userId: u[k], role: "JUDGE" as const })),
          ],
        },
        criteria: { create: CRITERIA.map((c, i) => ({ ...c, position: i })) },
        problems: { create: opts.problems },
      },
      include: { problems: true, criteria: true },
    });
    return event;
  }

  async function makeTeam(
    eventId: string,
    name: string,
    leader: Key,
    members: Key[],
    opts: { pitch?: string; problemIdx?: number; problems?: { id: string }[]; reg?: "PENDING" | "APPROVED" | "REJECTED"; looking?: boolean } = {},
  ) {
    const team = await prisma.team.create({
      data: {
        eventId,
        name,
        pitch: opts.pitch ?? null,
        leaderId: u[leader],
        lookingForMembers: opts.looking ?? members.length < 3,
        problemId: opts.problemIdx !== undefined && opts.problems ? opts.problems[opts.problemIdx].id : null,
        members: {
          create: [leader, ...members].map((k) => ({ userId: u[k], eventId, isLeader: k === leader })),
        },
        createdAt: new Date(now - 6 * DAY),
      },
    });
    if (opts.reg) {
      await prisma.registration.create({
        data: { eventId, teamId: team.id, status: opts.reg, reviewedAt: opts.reg === "PENDING" ? null : new Date(), createdAt: new Date(now - Math.floor(Math.random() * 6 + 1) * DAY) },
      });
    }
    return team;
  }

  async function makeProject(
    teamId: string,
    submitter: Key,
    p: { title: string; summary: string; techStack: string; repo: string; demo?: string; video?: string; milestones?: [string, boolean][] },
    versions: { final: boolean; daysAgo: number }[] = [],
  ) {
    const project = await prisma.project.create({
      data: {
        teamId,
        title: p.title,
        summary: p.summary,
        techStack: p.techStack,
        repoUrl: p.repo,
        demoUrl: p.demo ?? null,
        videoUrl: p.video ?? null,
        milestones: JSON.stringify((p.milestones ?? []).map(([label, done], i) => ({ id: `m${i}`, label, done }))),
      },
    });
    const subs = [];
    for (const [i, v] of versions.entries()) {
      subs.push(
        await prisma.submission.create({
          data: {
            projectId: project.id,
            version: i + 1,
            title: p.title,
            summary: p.summary,
            techStack: p.techStack,
            repoUrl: p.repo,
            demoUrl: p.demo ?? null,
            videoUrl: p.video ?? null,
            isFinal: v.final,
            submittedById: u[submitter],
            submittedAt: new Date(now - v.daysAgo * DAY),
          },
        }),
      );
    }
    return { project, subs };
  }

  /* ---------- 1. Registration open ---------- */
  console.log("Creating hackathons…");
  const codeverse = await makeEvent({
    slug: "codeverse-2026",
    title: "CodeVerse 2026",
    tagline: "36 hours to build something your campus will actually use.",
    description:
      "CodeVerse is a hybrid, 36-hour hackathon for student builders. Pick a challenge from campus life, civic tech or open innovation, form a team of two to four, and ship a working prototype. Mentors from industry hold office hours through the night.",
    category: "Open innovation",
    mode: "HYBRID",
    location: "Innovation Centre, Bengaluru (plus online)",
    stage: "REGISTRATION_OPEN",
    regCloses: 9,
    starts: 14,
    deadline: 15,
    ends: 15,
    accent: "#7058F5",
    prizes: "Winner: ₹1,00,000\nRunner-up: ₹50,000\nThird place: ₹25,000\nBest in each challenge: swag + internship interviews",
    judges: ["judge", "judge2"],
    problems: [
      { code: "CV-01", title: "Lost & found for large campuses", category: "Campus life", difficulty: "EASY", description: "Students lose ID cards, bottles and chargers every day, and notice boards don't work. Design a system that matches lost items with owners quickly and privately.", expectedOutput: "A working web or mobile prototype with item reporting, matching and a hand-off flow.", resources: "Sample campus map dataset will be shared at kickoff." },
      { code: "CV-02", title: "Accessible public transport alerts", category: "Civic tech", difficulty: "MEDIUM", description: "City bus delays hit commuters with disabilities hardest. Build an alerting tool that works with screen readers and low-bandwidth phones.", expectedOutput: "A prototype that consumes the provided GTFS feed and sends accessible alerts.", resources: "GTFS sample feed, WCAG 2.2 quick reference", selectionLimit: 15 },
      { code: "CV-03", title: "Fair lab-slot booking", category: "Campus life", difficulty: "MEDIUM", description: "Lab slots get grabbed by the fastest clickers. Create a booking system that is fair, transparent and handles no-shows.", expectedOutput: "Booking flow, fairness policy explanation and an admin view." },
      { code: "CV-04", title: "Open innovation", category: "Open", difficulty: "HARD", description: "Have your own idea? Pitch a problem you have personally experienced and build a solution that a real group of people would use next week.", expectedOutput: "Problem evidence (interviews or data), working prototype and a short pitch." },
    ],
  });
  const nullPointers = await makeTeam(codeverse.id, "Null Pointers", "leader", ["meera"], {
    pitch: "Designers who code. Looking for one ML person to make our matching smarter.",
    problemIdx: 0,
    problems: codeverse.problems,
    looking: true,
  });
  await makeTeam(codeverse.id, "Byte Busters", "vikram", ["rohan", "isha"], { pitch: "Cloud + backend crew.", problemIdx: 2, problems: codeverse.problems, reg: "PENDING" });
  await makeTeam(codeverse.id, "Pixel Pirates", "sneha", ["fatima"], { pitch: "Mobile-first team building for commuters.", problemIdx: 1, problems: codeverse.problems, reg: "APPROVED" });
  await makeTeam(codeverse.id, "Open Source Owls", "arjun", ["divya"], { problemIdx: 3, problems: codeverse.problems, reg: "PENDING" });
  await prisma.invitation.create({
    data: { teamId: nullPointers.id, senderId: u.leader, recipientId: u.student, kind: "INVITE", message: "We need your ML skills for smart item matching. Join us?" },
  });
  await prisma.bookmark.create({ data: { userId: u.student, eventId: codeverse.id } });
  await prisma.announcement.create({
    data: { eventId: codeverse.id, authorId: u.organizer, title: "Mentor office hours", body: "Mentors from cloud, ML and design tracks will be available every 3 hours during the event. The schedule is in the rules section.", pinned: true },
  });

  /* ---------- 2. In progress ---------- */
  const greengrid = await makeEvent({
    slug: "greengrid-climate-hack",
    title: "GreenGrid Climate Hack",
    tagline: "Tools that cut emissions, one neighbourhood at a time.",
    description:
      "A week-long online hackathon on practical climate action: energy, waste, water and mobility. Teams get access to real municipal datasets and mentoring from sustainability practitioners.",
    category: "Climate",
    mode: "ONLINE",
    stage: "IN_PROGRESS",
    regCloses: -5,
    starts: -2,
    deadline: 4,
    ends: 5,
    accent: "#3DCFAE",
    prizes: "Winner: ₹75,000\nRunner-up: ₹40,000\nBest data use: ₹15,000",
    judges: ["judge", "judge2"],
    problems: [
      { code: "GG-01", title: "Household energy coach", category: "Energy", difficulty: "MEDIUM", description: "Most households don't know which appliance drives their bill. Turn monthly bills and simple inputs into personalised, actionable savings advice.", expectedOutput: "An app that estimates appliance-level usage and recommends changes with projected savings." },
      { code: "GG-02", title: "Waste segregation feedback loop", category: "Waste", difficulty: "EASY", description: "Help residents and collectors close the loop on segregation quality with quick feedback and recognition.", expectedOutput: "Collector-side capture and resident-side feedback flows." },
      { code: "GG-03", title: "Urban heat map from open data", category: "Data", difficulty: "HARD", description: "Combine satellite land-surface temperature with tree cover to recommend where new shade should go.", expectedOutput: "Interactive map plus a ranked list of intervention sites.", resources: "Landsat LST tiles, city ward boundaries" },
    ],
  });
  const carbon = await makeTeam(greengrid.id, "Carbon Coders", "karthik", ["leader", "rohan"], { pitch: "Energy nerds.", problemIdx: 0, problems: greengrid.problems, reg: "APPROVED", looking: false });
  await makeProject(
    carbon.id,
    "karthik",
    {
      title: "WattWise",
      summary: "WattWise reads a household's electricity bill and a two-minute appliance quiz, then estimates which appliances drive the bill and suggests the three changes with the biggest savings.",
      techStack: "React, Node.js, Python (scikit-learn)",
      repo: "https://github.com/example/wattwise",
      milestones: [["Bill parser", true], ["Appliance quiz", true], ["Savings model", false], ["Demo video", false]],
    },
    [{ final: false, daysAgo: 1 }],
  );
  const greenTeam = await makeTeam(greengrid.id, "Heat Seekers", "divya", ["fatima"], { problemIdx: 2, problems: greengrid.problems, reg: "APPROVED" });
  await makeProject(greenTeam.id, "divya", { title: "ShadeMap", summary: "Mapping hot spots and tree cover.", techStack: "Python, Leaflet", repo: "https://github.com/example/shademap", milestones: [["Data pipeline", true], ["Map UI", false]] });
  await makeTeam(greengrid.id, "Sort It Out", "sneha", ["isha"], { problemIdx: 1, problems: greengrid.problems, reg: "APPROVED" });
  await prisma.announcement.create({
    data: { eventId: greengrid.id, authorId: u.organizer, title: "Dataset mirror is live", body: "We've added a faster mirror for the Landsat tiles. Links are in the GG-03 resources.", pinned: false },
  });

  /* ---------- 3. Judging ---------- */
  const health = await makeEvent({
    slug: "healthhack-sprint",
    title: "HealthHack Sprint",
    tagline: "Better care starts with better tools.",
    description: "A 48-hour sprint on primary healthcare: patient follow-ups, clinic operations and health literacy. Judging is underway.",
    category: "Health",
    mode: "OFFLINE",
    location: "Medical College Auditorium, Mysuru",
    stage: "JUDGING",
    regCloses: -14,
    starts: -6,
    deadline: -4,
    ends: -4,
    accent: "#FF7890",
    prizes: "Winner: ₹60,000\nRunner-up: ₹30,000\nBest patient experience: ₹10,000",
    judges: ["judge", "judge2"],
    problems: [
      { code: "HH-01", title: "Medication adherence nudges", category: "Patient care", difficulty: "MEDIUM", description: "Patients with chronic conditions often stop medication early. Design respectful reminders that work on basic phones.", expectedOutput: "SMS/IVR-friendly reminder system with clinician dashboard." },
      { code: "HH-02", title: "Clinic queue predictor", category: "Operations", difficulty: "HARD", description: "Predict wait times at primary health centres and let patients pick better arrival slots.", expectedOutput: "Prediction model and patient-facing slot picker." },
    ],
  });
  const healthTeams = [
    { name: "MediMinds", leader: "divya" as Key, members: ["fatima"] as Key[], p: 0, title: "PillPal", repo: "pillpal" },
    { name: "Queue Breakers", leader: "vikram" as Key, members: ["rohan", "isha"] as Key[], p: 1, title: "WaitLess", repo: "waitless" },
    { name: "Care Crafters", leader: "sneha" as Key, members: ["arjun"] as Key[], p: 0, title: "DoseBuddy", repo: "dosebuddy" },
    { name: "Pulse Pioneers", leader: "karthik" as Key, members: ["meera"] as Key[], p: 1, title: "ClinicFlow", repo: "clinicflow" },
  ];
  const healthTeamIds: string[] = [];
  for (const [i, t] of healthTeams.entries()) {
    const team = await makeTeam(health.id, t.name, t.leader, t.members, { problemIdx: t.p, problems: health.problems, reg: "APPROVED", looking: false });
    healthTeamIds.push(team.id);
    const { subs } = await makeProject(
      team.id,
      t.leader,
      {
        title: t.title,
        summary: `${t.title} tackles ${health.problems[t.p].title.toLowerCase()} with a lightweight, low-bandwidth design that clinic staff can adopt without training. Built and tested with feedback from two local clinics.`,
        techStack: "React, Express, SQLite, Twilio",
        repo: `https://github.com/example/${t.repo}`,
        demo: `https://${t.repo}.example.app`,
        milestones: [["Prototype", true], ["User testing", true], ["Pitch deck", true]],
      },
      [{ final: false, daysAgo: 5 }, { final: true, daysAgo: 4 - i * 0.05 }],
    );
    for (const judge of ["judge", "judge2"] as Key[]) {
      await prisma.judgeAssignment.create({ data: { eventId: health.id, judgeId: u[judge], teamId: team.id } });
    }
    // judge2 has finished everything; judge has finished the first two.
    const scorers: Key[] = i < 2 ? ["judge", "judge2"] : ["judge2"];
    for (const judge of scorers) {
      const ratings = Object.fromEntries(health.criteria.map((c, ci) => [c.id, Math.min(10, 6 + ((i * 3 + ci + (judge === "judge" ? 1 : 0)) % 4))]));
      await prisma.evaluation.create({
        data: {
          eventId: health.id,
          teamId: team.id,
          submissionId: subs[1].id,
          judgeId: u[judge],
          scores: JSON.stringify(ratings),
          score: weightedScore(health.criteria, ratings),
          feedback: "Clear problem framing and a working demo. Strengthen the evidence from user testing and explain how you'd handle scale.",
          status: "SUBMITTED",
          submittedAt: new Date(now - DAY),
        },
      });
    }
  }

  /* ---------- 4. Completed with results ---------- */
  const fintech = await makeEvent({
    slug: "fintech-forge-2026",
    title: "FinTech Forge 2026",
    tagline: "Money tools for the next hundred million users.",
    description: "A national fintech hackathon focused on financial inclusion, UPI-native experiences and fraud prevention. Results are published.",
    category: "Fintech",
    mode: "ONLINE",
    stage: "COMPLETED",
    regCloses: -40,
    starts: -30,
    deadline: -28,
    ends: -28,
    accent: "#4285FF",
    prizes: "Winner: ₹1,50,000\nRunner-up: ₹75,000\nThird place: ₹35,000",
    resultsPublished: true,
    judges: ["judge", "judge2"],
    problems: [
      { code: "FF-01", title: "Scam-call shield", category: "Security", difficulty: "HARD", description: "Detect and warn users about likely UPI scam patterns in real time.", expectedOutput: "Detection approach, user warning UX, evaluation on sample data." },
      { code: "FF-02", title: "Savings for gig workers", category: "Inclusion", difficulty: "MEDIUM", description: "Irregular income makes saving hard. Build an automatic, flexible savings tool.", expectedOutput: "Working prototype with simulated income streams." },
    ],
  });
  const ffTeams: [string, Key, Key[], number, number[]][] = [
    ["Ledger Legends", "arjun", ["sneha"], 0, [9, 9, 8, 8, 9]],
    ["Rupee Rangers", "vikram", ["isha"], 1, [8, 8, 9, 8, 7]],
    ["Coin Crafters", "leader", ["student"], 1, [7, 8, 8, 9, 8]],
    ["Safe Swipe", "fatima", ["divya"], 0, [7, 7, 7, 6, 7]],
  ];
  for (const [i, [name, leader, members, p, base]] of ffTeams.entries()) {
    const team = await makeTeam(fintech.id, name, leader, members, { problemIdx: p, problems: fintech.problems, reg: "APPROVED", looking: false });
    const { subs } = await makeProject(
      team.id,
      leader,
      {
        title: `${name.split(" ")[0]}${["Guard", "Save", "Stack", "Shield"][i]}`,
        summary: `A ${fintech.problems[p].title.toLowerCase()} prototype built in 48 hours, tested with real users from the target group and documented with an architecture overview and a demo video.`,
        techStack: "Kotlin, FastAPI, PostgreSQL",
        repo: `https://github.com/example/${name.toLowerCase().replace(/\s/g, "-")}`,
        video: "https://example.com/demo-video",
      },
      [{ final: true, daysAgo: 28.5 - i * 0.01 }],
    );
    for (const [ji, judge] of (["judge", "judge2"] as Key[]).entries()) {
      await prisma.judgeAssignment.create({ data: { eventId: fintech.id, judgeId: u[judge], teamId: team.id } });
      const ratings = Object.fromEntries(fintech.criteria.map((c, ci) => [c.id, Math.max(0, Math.min(10, base[ci] - ji * (ci % 2)))]));
      await prisma.evaluation.create({
        data: {
          eventId: fintech.id,
          teamId: team.id,
          submissionId: subs[0].id,
          judgeId: u[judge],
          scores: JSON.stringify(ratings),
          score: weightedScore(fintech.criteria, ratings),
          feedback: "Strong execution. The threat model and the onboarding flow were especially well thought out.",
          status: "SUBMITTED",
          submittedAt: new Date(now - 27 * DAY),
        },
      });
    }
  }

  /* ---------- 5. Published (registration not yet open) & 6. Draft ---------- */
  await makeEvent({
    slug: "campus-build-night",
    title: "Campus Build Night",
    tagline: "One night, one idea, one working demo.",
    description: "A beginner-friendly overnight build session. Perfect for first-timers: mentors pair with every team and the challenges are scoped to finish by sunrise.",
    category: "Beginner friendly",
    mode: "OFFLINE",
    location: "Main Auditorium, Mysuru",
    stage: "PUBLISHED",
    regCloses: 24,
    starts: 30,
    deadline: 31,
    ends: 31,
    accent: "#FFC857",
    prizes: "Certificates for every finisher, goodies for the top 5 teams",
    problems: [
      { code: "BN-01", title: "Club event planner", category: "Campus life", difficulty: "EASY", description: "Help student clubs avoid date clashes and promote events to the right students.", expectedOutput: "A shared calendar with clash detection." },
    ],
  });
  await makeEvent({
    slug: "ai-for-bharat-draft",
    title: "AI for Bharat",
    tagline: "Language AI for everyday services.",
    description: "Draft: an upcoming hackathon on Indic-language AI for public services. Not visible to participants until published.",
    category: "AI/ML",
    mode: "HYBRID",
    location: "Bengaluru",
    stage: "DRAFT",
    regCloses: 50,
    starts: 60,
    deadline: 62,
    ends: 62,
    accent: "#7058F5",
    prizes: "To be announced",
    problems: [
      { code: "AB-01", title: "Voice forms in Kannada", category: "Language AI", difficulty: "HARD", description: "Let citizens fill government forms by speaking in Kannada, with confirmation steps for accuracy.", expectedOutput: "Speech-to-form prototype with an error-correction flow." },
    ],
  });

  /* ---------- Notifications & audit trail ---------- */
  await prisma.notification.createMany({
    data: [
      { userId: u.student, type: "invitation", title: "Ananya Iyer invited you to Null Pointers", body: "Join them for CodeVerse 2026.", link: "/app/inbox" },
      { userId: u.student, type: "results", title: "FinTech Forge 2026 results are out", body: "See the leaderboard and winners.", link: "/hackathons/fintech-forge-2026/results", read: true },
      { userId: u.leader, type: "announcement", title: "GreenGrid Climate Hack: Dataset mirror is live", body: "We've added a faster mirror for the Landsat tiles.", link: "/hackathons/greengrid-climate-hack#announcements" },
      { userId: u.judge, type: "judging.open", title: "HealthHack Sprint", body: "Judging is open. Your assigned projects are ready.", link: "/app/judging" },
      { userId: u.organizer, type: "registration.new", title: "Byte Busters registered for CodeVerse 2026", body: "3 member(s) awaiting review.", link: `/app/organize/${codeverse.id}?tab=registrations` },
    ],
  });
  await prisma.auditLog.createMany({
    data: [
      { actorId: u.organizer, action: "event.create", targetType: "Event", targetId: codeverse.id, meta: JSON.stringify({ title: codeverse.title }) },
      { actorId: u.organizer, action: "event.stage", targetType: "Event", targetId: health.id, meta: JSON.stringify({ from: "IN_PROGRESS", to: "JUDGING" }) },
      { actorId: u.organizer, action: "results.publish", targetType: "Event", targetId: fintech.id },
      { actorId: u.admin, action: "admin.user.update", targetType: "User", targetId: u.organizer, meta: JSON.stringify({ organizerVerified: true }) },
    ],
  });

  console.log("\nSeed complete. Every account uses the password:", PASSWORD);
  console.table(people.map((p) => ({ email: p.email, name: p.name, role: "role" in p ? p.role : "PARTICIPANT" })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
