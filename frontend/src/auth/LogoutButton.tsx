import { useState } from "react";
import { isUnauthenticated, logout, toUserMessage } from "../api/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  onLoggedOut: () => void;
};

export function LogoutButton({ onLoggedOut }: LogoutButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirmLogout(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await logout();
      setConfirmOpen(false);
      onLoggedOut();
    } catch (err) {
      if (isUnauthenticated(err)) {
        setConfirmOpen(false);
        onLoggedOut();
        return;
      }
      setConfirmOpen(false);
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
        onClick={() => setConfirmOpen(true)}
        disabled={submitting}
      >
        {submitting ? "Signing out…" : "Log out"}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Log out?"
        description="You will need to sign in again to continue."
        confirmLabel={submitting ? "Signing out…" : "Log out"}
        confirming={submitting}
        onConfirm={() => void onConfirmLogout()}
      />
      {submitting && !confirmOpen ? (
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
