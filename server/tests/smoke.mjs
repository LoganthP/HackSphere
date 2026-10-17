// API smoke test across every role. Run against a freshly seeded DB with the server on :4000:
//   npm run db:reset && npm run dev   (in another terminal)   then   npm run smoke
import { io } from "socket.io-client";

const B = "http://localhost:4000/api";
function client() {
  let cookie = "";
  const fn = async (method, path, body, form) => {
    const h = {};
    if (cookie) h.cookie = cookie;
    let b;
    if (form) {
      b = form;
    } else if (body !== undefined) {
      h["content-type"] = "application/json";
      b = JSON.stringify(body);
    }
    const r = await fetch(B + path, { method, headers: h, body: b });
    const sc = r.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    const t = await r.text();
    let j;
    try {
      j = JSON.parse(t);
    } catch {
      j = t;
    }
    return { s: r.status, j };
  };
  fn.cookie = () => cookie;
  return fn;
}

const ok = (c, label, r, exp = [200, 201]) => {
  const pass = (Array.isArray(exp) ? exp : [exp]).includes(r.s);
  console.log(pass ? "PASS" : "FAIL", label, r.s, pass ? "" : JSON.stringify(r.j).slice(0, 300));
  if (!pass) process.exitCode = 1;
  return r.j;
};
const login = async (email) => {
  const c = client();
  ok(c, "login " + email, await c("POST", "/auth/login", { email, password: "HackSphere@123" }));
  return c;
};

const pub = client();
ok(pub, "stats", await pub("GET", "/stats"));
const ev = ok(pub, "events list", await pub("GET", "/events"));
console.log("  public events:", ev.events.map((e) => e.title + "[" + e.stage + "]").join(", "));
ok(pub, "draft hidden", await pub("GET", "/events/ai-for-bharat-draft"), 404);
ok(pub, "unknown event 404", await pub("GET", "/events/unknown-slug-12345"), 404);
const cv = ok(pub, "event detail", await pub("GET", "/events/codeverse-2026")).event;
ok(pub, "results unpublished blocked", await pub("GET", "/events/healthhack-sprint/results"), 403);
const ff = ok(pub, "published results", await pub("GET", "/events/fintech-forge-2026/results"));
console.log("  FF ranks:", ff.rows.map((r) => r.rank + ":" + r.team.name + "=" + r.average).join(" | "), " awards:", ff.awards.length);
ok(pub, "unauth dashboard", await pub("GET", "/dashboard"), 401);
ok(pub, "bad login", await pub("POST", "/auth/login", { email: "student@hacksphere.dev", password: "wrong" }), 401);
ok(pub, "bad email register 400", await pub("POST", "/auth/register", { name: "Bad Email", email: "not-an-email", password: "HackSphere@123" }), 400);

const st = await login("student@hacksphere.dev");
const d = ok(st, "dashboard", await st("GET", "/dashboard"));
console.log("  student stats", JSON.stringify(d.stats), "recs", d.recommendations.length, "deadlines", d.deadlines.length);
const inv = ok(st, "invitations", await st("GET", "/invitations"));
ok(st, "accept invite", await st("POST", `/invitations/${inv.invitations[0].id}/respond`, { accept: true }));
ok(st, "can't create 2nd team same event", await st("POST", "/teams", { eventId: cv.id, name: "Solo" }), 409);
ok(st, "participant cannot create event", await st("POST", "/events", {}), 403);
ok(st, "participant cannot manage", await st("GET", "/manage/events/" + cv.id), 403);
ok(st, "participant cannot admin", await st("GET", "/admin/overview"), 403);
ok(st, "unknown team 404", await st("GET", "/teams/nonexistent-team-id"), 404);
const mine = ok(st, "my teams", await st("GET", "/teams/mine"));
const np = mine.teams.find((t) => t.name === "Null Pointers");
ok(st, "member can't register (leader only)", await st("POST", `/teams/${np.id}/register`), 403);

const ld = await login("leader@hacksphere.dev");
const ws = ok(ld, "workspace", await ld("GET", `/teams/${np.id}`));
console.log("  members", ws.team.members.length, "perm", JSON.stringify(ws.permissions));
ok(ld, "register team", await ld("POST", `/teams/${np.id}/register`), 201);
ok(ld, "duplicate register", await ld("POST", `/teams/${np.id}/register`), 409);
ok(ld, "save project draft", await ld("PUT", `/teams/${np.id}/project`, { title: "FoundIt", summary: "Lost and found", repoUrl: "https://github.com/x/y", milestones: [{ id: "a", label: "Wireframes", done: true }] }));
ok(ld, "bad url rejected", await ld("PUT", `/teams/${np.id}/project`, { title: "FoundIt", repoUrl: "github.com/x" }), 400);
ok(ld, "submit blocked (registration stage)", await ld("POST", `/teams/${np.id}/submissions`, { final: true }), 400);

const org = await login("organizer@hacksphere.dev");
const m = ok(org, "manage overview", await org("GET", "/manage/events/" + cv.id));
console.log("  stats", JSON.stringify(m.stats.registrations));
const reg = m.teams.find((t) => t.name === "Null Pointers").registration;
ok(org, "approve registration", await org("POST", `/manage/registrations/${reg.id}/review`, { status: "APPROVED" }));
const created = ok(org, "create event", await org("POST", "/events", { title: "Test Hack", tagline: "A test event", description: "This is a description long enough.", category: "Test", mode: "ONLINE", registrationClosesAt: new Date(Date.now() + 86400e3).toISOString(), startsAt: new Date(Date.now() + 2 * 86400e3).toISOString(), submissionDeadline: new Date(Date.now() + 3 * 86400e3).toISOString(), endsAt: new Date(Date.now() + 3 * 86400e3).toISOString(), minTeamSize: 1, maxTeamSize: 3 }), 201).event;
ok(org, "bad dates", await org("POST", "/events", { title: "Test Hack", tagline: "A test event", description: "This is a description long enough.", category: "Test", mode: "OFFLINE", registrationClosesAt: new Date().toISOString(), startsAt: new Date(Date.now() + 2 * 86400e3).toISOString(), submissionDeadline: new Date(Date.now() + 86400e3).toISOString(), endsAt: new Date(Date.now() + 3 * 86400e3).toISOString(), minTeamSize: 1, maxTeamSize: 3 }), 400);
ok(org, "end date before start date 400", await org("POST", "/events", { title: "Bad Dates Hack", tagline: "Tagline", description: "This is a description long enough.", category: "Test", mode: "ONLINE", registrationClosesAt: new Date(Date.now() + 86400e3).toISOString(), startsAt: new Date(Date.now() + 3 * 86400e3).toISOString(), submissionDeadline: new Date(Date.now() + 2 * 86400e3).toISOString(), endsAt: new Date(Date.now() + 86400e3).toISOString(), minTeamSize: 1, maxTeamSize: 3 }), 400);
ok(org, "min team size > max team size 400", await org("POST", "/events", { title: "Bad Sizes Hack", tagline: "Tagline", description: "This is a description long enough.", category: "Test", mode: "ONLINE", registrationClosesAt: new Date(Date.now() + 86400e3).toISOString(), startsAt: new Date(Date.now() + 2 * 86400e3).toISOString(), submissionDeadline: new Date(Date.now() + 3 * 86400e3).toISOString(), endsAt: new Date(Date.now() + 4 * 86400e3).toISOString(), minTeamSize: 5, maxTeamSize: 2 }), 400);
ok(org, "publish w/o problems blocked", await org("POST", `/events/${created.id}/stage`, { stage:"REGISTRATION_OPEN" }), 400);
const limProb = ok(org, "add limited problem", await org("POST", `/manage/events/${cv.id}/problems`, { code: "LIM-1", title: "Limited Problem", category: "Test", difficulty: "EASY", description: "Description for limited problem test", expectedOutput: "Output", selectionLimit: 1 }), 201).problem;
ok(ld, "first team select limited problem", await ld("POST", `/teams/${np.id}/problem`, { problemId: limProb.id }), 200);
ok(org, "delete problem chosen by team blocked", await org("DELETE", `/manage/problems/${limProb.id}`), 400);
ok(org, "add problem", await org("POST", `/manage/events/${created.id}/problems`, { code: "t-1", title: "Test problem", category: "Xx", difficulty: "EASY", description: "A description that is long enough", expectedOutput: "Something" }), 201);
ok(org, "open registration", await org("POST", `/events/${created.id}/stage`, { stage: "REGISTRATION_OPEN" }));
ok(org, "announce", await org("POST", `/events/${cv.id}/announcements`, { title: "Hello teams", body: "Kickoff at 9am" }), 201);
const hh = ok(pub, "hh detail", await pub("GET", "/events/healthhack-sprint")).event;
ok(org, "criteria locked when scoring", await org("POST", `/manage/events/${hh.id}/criteria`, { name: "X", weight: 1 }), 400);
const pre = ok(org, "results preview", await org("GET", `/events/${hh.id}/results`));
console.log("  HH preview", pre.rows.map((r) => r.rank + ":" + r.team.name + "=" + r.average + " miss" + r.missingEvaluations).join(" | "));

const jd = await login("judge@hacksphere.dev");
const as = ok(jd, "judge assignments", await jd("GET", "/judging/assignments"));
const todo = as.assignments.find((a) => a.event.stage === "JUDGING" && !a.evaluation);
const det = ok(jd, "assignment detail", await jd("GET", `/judging/assignments/${todo.team.id}`));
const scores = Object.fromEntries(det.criteria.map((c) => [c.id, 9]));
ok(jd, "score > 10 rejected", await jd("PUT", `/judging/evaluations/${todo.team.id}`, { scores: { [det.criteria[0].id]: 11 }, feedback: "test", submit: false }), 400);
ok(jd, "score < 0 rejected", await jd("PUT", `/judging/evaluations/${todo.team.id}`, { scores: { [det.criteria[0].id]: -1 }, feedback: "test", submit: false }), 400);
ok(jd, "incomplete submit rejected", await jd("PUT", `/judging/evaluations/${todo.team.id}`, { scores: {}, feedback: "x", submit: true }), 400);
ok(jd, "save draft", await jd("PUT", `/judging/evaluations/${todo.team.id}`, { scores: { [det.criteria[0].id]: 7 }, feedback: "", submit: false }));
const e = ok(jd, "submit eval", await jd("PUT", `/judging/evaluations/${todo.team.id}`, { scores, feedback: "Excellent work with clear user research.", submit: true }));
console.log("  score", e.evaluation.score);
const other = as.assignments.find((a) => a.event.stage === "JUDGING" && !a.evaluation && a.team.id !== todo.team.id);
ok(jd, "declare conflict", await jd("POST", `/judging/assignments/${other.team.id}/conflict`, { note: "I mentored this team." }));
ok(jd, "conflicted cannot score", await jd("PUT", `/judging/evaluations/${other.team.id}`, { scores, feedback: "", submit: false }), 403);
ok(jd, "judge cannot see unrelated team", await jd("GET", `/teams/${np.id}`), 403);

ok(org, "publish results", await org("POST", `/events/${hh.id}/results/publish`, { publish: true }));
const pr = ok(pub, "public results now", await pub("GET", `/events/healthhack-sprint/results`));
console.log("  HH final", pr.rows.map((r) => r.rank + ":" + r.team.name + "=" + r.average).join(" | "));

// in-progress submission flow
const ka = await login("karthik@hacksphere.dev");
const kt = ok(ka, "karthik teams", await ka("GET", "/teams/mine")).teams.find((t) => t.name === "Carbon Coders");
ok(ka, "final missing fields", await ka("POST", `/teams/${kt.id}/submissions`, undefined, (() => { const f = new FormData(); f.set("final", "true"); return f; })()), 400);
ok(ka, "complete project", await ka("PUT", `/teams/${kt.id}/project`, { title: "WattWise", summary: "WattWise reads a household's electricity bill and estimates which appliances drive it, with savings tips.", repoUrl: "https://github.com/example/wattwise", demoUrl: "https://wattwise.example.app" }));
const f = new FormData();
f.set("final", "true");
f.set("attachment", new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), "pitch.pdf");
const sub = ok(ka, "final submission w/ file", await ka("POST", `/teams/${kt.id}/submissions`, undefined, f), 201).submission;
console.log("  version", sub.version, sub.attachmentName);
ok(ka, "challenge locked after final submission", await ka("POST", `/teams/${kt.id}/problem`, { problemId: null }), 400);
const bad = new FormData();
bad.set("attachment", new Blob(["x"]), "evil.exe");
ok(ka, "bad file type", await ka("POST", `/teams/${kt.id}/submissions`, undefined, bad), 400);
const dl = await fetch(`${B}/teams/${kt.id}/submissions/${sub.id}/attachment`);
console.log(dl.status === 401 ? "PASS" : "FAIL", "attachment requires auth", dl.status);
ok(st, "attachment forbidden for unrelated user", await st("GET", `/teams/${kt.id}/submissions/${sub.id}/attachment`), 403);

const ad = await login("admin@hacksphere.dev");
ok(ad, "admin overview", await ad("GET", "/admin/overview"));
const pend = ok(ad, "pending organizers", await ad("GET", "/admin/users?pending=true")).users;
ok(ad, "verify organizer", await ad("PATCH", `/admin/users/${pend[0].id}`, { organizerVerified: true }));
ok(ad, "audit", await ad("GET", "/admin/audit"));
const admMe = ok(ad, "me", await ad("GET", "/auth/me")).user;
ok(ad, "can't suspend self", await ad("PATCH", `/admin/users/${admMe.id}`, { status: "SUSPENDED" }), 400);
ok(ad, "can't demote self", await ad("PATCH", `/admin/users/${admMe.id}`, { role: "PARTICIPANT" }), 400);

// User suspension test
const tc = await login("techclub@hacksphere.dev");
ok(tc, "techclub can access before suspend", await tc("GET", "/dashboard"));
ok(ad, "suspend user", await ad("PATCH", `/admin/users/${pend[0].id}`, { status: "SUSPENDED" }));
ok(tc, "suspended session revoked 401", await tc("GET", "/dashboard"), 401);
ok(pub, "suspended user login blocked 403", await pub("POST", "/auth/login", { email: "techclub@hacksphere.dev", password: "HackSphere@123" }), 403);
ok(ad, "reactivate user", await ad("PATCH", `/admin/users/${pend[0].id}`, { status: "ACTIVE" }));

// Real-time Socket.IO test
const socketReceived = await new Promise((resolve) => {
  const cookieVal = st.cookie().replace(/^hs_session=/, "");
  const socket = io("http://localhost:4000", {
    extraHeaders: { cookie: `hs_session=${cookieVal}` },
    transports: ["websocket", "polling"],
  });
  const timer = setTimeout(() => {
    socket.disconnect();
    resolve(false);
  }, 5000);
  socket.on("connect", () => {
    socket.on("notification", (n) => {
      clearTimeout(timer);
      socket.disconnect();
      resolve(n);
    });
    // Trigger notification: leader invites divya, or org announces
    org("POST", `/events/${cv.id}/announcements`, { title: "Socket Live Test", body: "Checking live delivery" });
  });
  socket.on("connect_error", () => {
    clearTimeout(timer);
    socket.disconnect();
    resolve(false);
  });
});
console.log(socketReceived ? "PASS" : "FAIL", "socket.io notification received", socketReceived ? socketReceived.title : "timeout");
if (!socketReceived) process.exitCode = 1;

const notes = ok(st, "notifications", await st("GET", "/notifications"));
console.log("  student unread", notes.unread);
const fg = ok(pub, "forgot", await pub("POST", "/auth/forgot", { email: "student@hacksphere.dev" }));
const token = new URL(fg.devResetLink).searchParams.get("token");
ok(pub, "reset", await pub("POST", "/auth/reset", { token, password: "NewPass@123" }));
ok(pub, "login new pw", await pub("POST", "/auth/login", { email: "student@hacksphere.dev", password: "NewPass@123" }));
ok(st, "old session revoked", await st("GET", "/dashboard"), 401);

// Restore student password so subsequent suites can sign in with default HackSphere@123
const fg2 = ok(pub, "forgot restore", await pub("POST", "/auth/forgot", { email: "student@hacksphere.dev" }));
const token2 = new URL(fg2.devResetLink).searchParams.get("token");
ok(pub, "reset back to default pw", await pub("POST", "/auth/reset", { token: token2, password: "HackSphere@123" }));
ok(pub, "login restored pw", await pub("POST", "/auth/login", { email: "student@hacksphere.dev", password: "HackSphere@123" }));
