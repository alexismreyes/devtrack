import { useCallback, useEffect, useState } from "react";
import { getProfile, isUnauthenticated, toUserMessage } from "./api/client";
import type { PublicUserDto } from "./api/types";
import { LoginForm } from "./auth/LoginForm";
import { LogoutButton } from "./auth/LogoutButton";
import { RegisterForm } from "./auth/RegisterForm";
import { ProjectDetail } from "./projects/ProjectDetail";
import { ProjectsPage } from "./projects/ProjectsPage";
import { ProbePage } from "./system/ProbePage";
import { ProfilePage } from "./users/ProfilePage";

type GuestView = "register" | "login";

type SessionState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "authenticated"; user: PublicUserDto }
  | { kind: "error"; message: string };

export function App() {
  const [session, setSession] = useState<SessionState>({ kind: "loading" });
  const [guestView, setGuestView] = useState<GuestView>("register");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setSession({ kind: "loading" });
    try {
      const user = await getProfile();
      setSession({ kind: "authenticated", user });
    } catch (err) {
      if (isUnauthenticated(err)) {
        setSession({ kind: "guest" });
        return;
      }
      setSession({ kind: "error", message: toUserMessage(err) });
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const onAuthenticated = useCallback((user: PublicUserDto): void => {
    setSession({ kind: "authenticated", user });
  }, []);

  const onLoggedOut = useCallback((): void => {
    setSelectedProjectId(null);
    setGuestView("login");
    setSession({ kind: "guest" });
  }, []);

  const probeKey =
    session.kind === "authenticated" ? session.user.id : session.kind;

  return (
    <main>
      <h1>DevTrack</h1>
      {session.kind === "loading" ? (
        <p role="status">Checking session…</p>
      ) : null}
      {session.kind === "error" ? (
        <p role="alert">{session.message}</p>
      ) : null}
      {session.kind === "guest" ? (
        <section aria-labelledby="auth-heading">
          <h2 id="auth-heading">Account</h2>
          <p>
            <button type="button" onClick={() => setGuestView("register")}>
              Register
            </button>{" "}
            <button type="button" onClick={() => setGuestView("login")}>
              Log in
            </button>
          </p>
          {guestView === "register" ? (
            <RegisterForm onSuccess={onAuthenticated} />
          ) : (
            <LoginForm onSuccess={onAuthenticated} />
          )}
        </section>
      ) : null}
      {session.kind === "authenticated" ? (
        <>
          <p>Signed in as {session.user.email}</p>
          <LogoutButton onLoggedOut={onLoggedOut} />
          <ProfilePage
            user={session.user}
            onUpdated={(user) => setSession({ kind: "authenticated", user })}
            onUnauthenticated={onLoggedOut}
          />
          {selectedProjectId === null ? (
            <ProjectsPage
              onSelectProject={setSelectedProjectId}
              onUnauthenticated={onLoggedOut}
            />
          ) : (
            <ProjectDetail
              projectId={selectedProjectId}
              onBack={() => setSelectedProjectId(null)}
              onUnauthenticated={onLoggedOut}
            />
          )}
        </>
      ) : null}
      <ProbePage key={probeKey} />
    </main>
  );
}
