import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSession } from "../session/SessionContext";

export function NotFoundPage() {
  const { session } = useSession();
  const authenticated = session.kind === "authenticated";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col p-6">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">DevTrack</h1>
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Page not found</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">This page does not exist.</p>
          {authenticated ? (
            <Link to="/projects" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Go to projects
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Go to login
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
