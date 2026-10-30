import { useState } from "react";
import { isUnauthenticated, logout, toUserMessage } from "../api/client";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  onLoggedOut: () => void;
};

export function LogoutButton({ onLoggedOut }: LogoutButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await logout();
      onLoggedOut();
    } catch (err) {
      if (isUnauthenticated(err)) {
        onLoggedOut();
        return;
      }
      setError(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-devtrack-bar-muted/40 bg-transparent text-devtrack-bar-foreground hover:bg-white/10 hover:text-devtrack-bar-foreground"
        onClick={() => void onClick()}
        disabled={submitting}
      >
        {submitting ? "Signing out…" : "Log out"}
      </Button>
      {submitting ? (
        <p className="mt-1 text-xs text-devtrack-bar-muted" role="status">
          Signing out…
        </p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-destructive-foreground" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
