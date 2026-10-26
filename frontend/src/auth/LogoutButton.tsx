import { useState } from "react";
import { isUnauthenticated, logout, toUserMessage } from "../api/client";

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
      <button type="button" onClick={() => void onClick()} disabled={submitting}>
        {submitting ? "Signing out…" : "Log out"}
      </button>
      {submitting ? <p role="status">Signing out…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
