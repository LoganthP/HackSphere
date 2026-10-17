export type PlatformRole = "PARTICIPANT" | "ORGANIZER" | "ADMIN";
export type EventStage = "DRAFT" | "PUBLISHED" | "REGISTRATION_OPEN" | "IN_PROGRESS" | "JUDGING" | "COMPLETED";
export type EventMode = "ONLINE" | "OFFLINE" | "HYBRID";
export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface User {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  status: "ACTIVE" | "SUSPENDED";
  organizerVerified: boolean;
  college: string | null;
  bio: string | null;
  skills: string | null;
  avatarColor: string;
  createdAt: string;
}

export interface UserContext {
  isJudge: boolean;
  isTeamLeader: boolean;
  organizesEvents: boolean;
  pendingInvites: number;
}

export interface Person {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  college?: string | null;
  skills?: string | null;
}

export interface Problem {
  id: string;
  code: string;
  eventId: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  description: string;
  expectedOutput: string;
  resources: string | null;
  selectionLimit: number | null;
  selectedCount?: number;
  submittedCount?: number;
}

export interface Criterion {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  weight: number;
  position: number;
}

export interface Announcement {
  id: string;
  eventId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  author?: { name: string };
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  mode: EventMode;
  location: string | null;
  stage: EventStage;
  registrationClosesAt: string;
  startsAt: string;
  submissionDeadline: string;
  endsAt: string;
  minTeamSize: number;
  maxTeamSize: number;
  maxTeams: number | null;
  eligibility: string | null;
  rules: string | null;
  prizes: string | null;
  accentColor: string;
  resultsPublished: boolean;
  organizerId: string;
  organizer?: { id: string; name: string };
  bookmarked?: boolean;
  _count?: { teams: number; problems: number; registrations: number };
}

export interface EventDetail extends EventSummary {
  problems: Problem[];
  criteria: Criterion[];
  announcements: Announcement[];
}

export interface Viewer {
  isManager: boolean;
  isJudge: boolean;
  bookmarked: boolean;
  team: { id: string; name: string; isLeader: boolean; registration: RegistrationStatus | null } | null;
}

export interface Milestone {
  id: string;
  label: string;
  done: boolean;
}

export interface Submission {
  id: string;
  version: number;
  title: string;
  summary: string;
  techStack: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  slidesUrl: string | null;
  videoUrl: string | null;
  attachmentName: string | null;
  isFinal: boolean;
  submittedAt: string;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  techStack: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  slidesUrl: string | null;
  videoUrl: string | null;
  milestones: Milestone[];
  updatedAt: string;
  submissions: Submission[];
}

export interface Invitation {
  id: string;
  kind: "INVITE" | "REQUEST";
  status: string;
  message: string | null;
  createdAt: string;
  sender: Person;
  recipient: Person;
  team: { id: string; name: string; event: { id: string; slug: string; title: string; maxTeamSize: number; stage: EventStage }; _count: { members: number } };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface ResultRow {
  rank: number | null;
  average: number | null;
  evaluations: number;
  assignedJudges: number;
  missingEvaluations: number;
  team: { id: string; name: string; members: Person[] };
  problem: { id: string; code: string; title: string; category: string } | null;
  project: { title: string; summary: string; repoUrl: string | null; demoUrl: string | null };
  submittedAt: string;
  perCriterion: { criterionId: string; name: string; average: number | null }[];
}

export interface Results {
  event: { id: string; slug: string; title: string; stage: EventStage; resultsPublished: boolean; accentColor: string };
  criteria: { id: string; name: string; weight: number }[];
  rows: ResultRow[];
  awards: { award: string; teamId: string; teamName: string }[];
  progress: { assigned: number; completed: number };
  preview: boolean;
}

export interface Registration {
  id: string;
  eventId: string;
  teamId: string;
  status: RegistrationStatus;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
}
