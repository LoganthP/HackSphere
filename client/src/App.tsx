import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { PublicLayout } from "./layouts/PublicLayout";
import { AppLayout, RequireRole } from "./layouts/AppLayout";
import { Spinner } from "./components/ui";

const Landing = lazy(() => import("./pages/Landing"));
const Explore = lazy(() => import("./pages/Explore"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Results = lazy(() => import("./pages/Results"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Teams = lazy(() => import("./pages/app/Teams"));
const TeamWorkspace = lazy(() => import("./pages/app/TeamWorkspace"));
const Inbox = lazy(() => import("./pages/app/Inbox"));
const Notifications = lazy(() => import("./pages/app/Notifications"));
const Profile = lazy(() => import("./pages/app/Profile"));
const OrganizerHome = lazy(() => import("./pages/organize/OrganizerHome"));
const EventForm = lazy(() => import("./pages/organize/EventForm"));
const ManageEvent = lazy(() => import("./pages/organize/ManageEvent"));
const JudgingHome = lazy(() => import("./pages/judge/JudgingHome"));
const Evaluate = lazy(() => import("./pages/judge/Evaluate"));
const Admin = lazy(() => import("./pages/admin/Admin"));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="hackathons" element={<Explore />} />
          <Route path="hackathons/:slug" element={<EventDetail />} />
          <Route path="hackathons/:slug/results" element={<Results />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="teams" element={<Teams />} />
          <Route path="teams/:id" element={<TeamWorkspace />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="organize" element={<RequireRole roles={["ORGANIZER"]}><OrganizerHome /></RequireRole>} />
          <Route path="organize/new" element={<RequireRole roles={["ORGANIZER"]}><EventForm /></RequireRole>} />
          <Route path="organize/:id" element={<RequireRole roles={["ORGANIZER"]}><ManageEvent /></RequireRole>} />
          <Route path="organize/:id/edit" element={<RequireRole roles={["ORGANIZER"]}><EventForm /></RequireRole>} />
          <Route path="judging" element={<RequireRole roles={["JUDGE"]}><JudgingHome /></RequireRole>} />
          <Route path="judging/:teamId" element={<RequireRole roles={["JUDGE"]}><Evaluate /></RequireRole>} />
          <Route path="admin" element={<RequireRole roles={["ADMIN"]}><Admin /></RequireRole>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
