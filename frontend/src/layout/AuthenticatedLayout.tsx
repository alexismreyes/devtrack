import { Link, Outlet, useLocation, useMatch, useNavigate } from "react-router-dom";
import { LogoutButton } from "../auth/LogoutButton";
import { ProjectsPage } from "../projects/ProjectsPage";
import { useSession } from "../session/SessionContext";

export function AuthenticatedLayout() {
  const { session, onLoggedOut } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const projectMatch = useMatch("/projects/:projectId");
  const selectedProjectId = projectMatch?.params.projectId;

  if (session.kind !== "authenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        role="banner"
        className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-devtrack-bar bg-devtrack-bar px-4 text-devtrack-bar-foreground"
      >
        <h1 className="text-lg font-semibold tracking-tight">
          <Link to="/projects" className="hover:opacity-90">
            DevTrack
          </Link>
        </h1>
        <p className="truncate text-sm text-devtrack-bar-muted">
          Signed in as {session.user.email}
        </p>
        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/profile"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Profile
          </Link>
          <LogoutButton onLoggedOut={onLoggedOut} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside
          className="w-72 shrink-0 overflow-y-auto border-r bg-sidebar p-4 text-sidebar-foreground"
          aria-label="Projects"
        >
          <ProjectsPage
            selectedProjectId={selectedProjectId}
            reloadKey={location.pathname}
            onSelectProject={(projectId) => {
              void navigate(`/projects/${projectId}`);
            }}
            onUnauthenticated={onLoggedOut}
          />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
