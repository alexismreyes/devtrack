import { Outlet } from "react-router-dom";
import { useSession } from "../session/SessionContext";

export function SessionGate() {
  const { session } = useSession();

  if (session.kind === "loading") {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <header
          role="banner"
          className="flex h-14 items-center border-b border-devtrack-bar bg-devtrack-bar px-4 text-devtrack-bar-foreground"
        >
          <h1 className="text-lg font-semibold tracking-tight">DevTrack</h1>
        </header>
        <p className="p-6 text-muted-foreground" role="status">
          Checking session…
        </p>
      </main>
    );
  }

  if (session.kind === "error") {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <header
          role="banner"
          className="flex h-14 items-center border-b border-devtrack-bar bg-devtrack-bar px-4 text-devtrack-bar-foreground"
        >
          <h1 className="text-lg font-semibold tracking-tight">DevTrack</h1>
        </header>
        <p className="p-6 text-destructive" role="alert">
          {session.message}
        </p>
      </main>
    );
  }

  return <Outlet />;
}
