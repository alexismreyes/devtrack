import { useEffect, useState, type FormEvent } from "react";
import {
  changePassword,
  isUnauthenticated,
  toUserMessage,
  updateProfile,
} from "../api/client";
import type { PublicUserDto } from "../api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EYECANDY_SURFACE_CLASS } from "../theme/uiPalettes";

type ProfilePageProps = {
  user: PublicUserDto;
  onUpdated: (user: PublicUserDto) => void;
  onUnauthenticated: () => void;
};

type ProfileState =
  | { kind: "ready" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string };

type PasswordState =
  | { kind: "ready" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function ProfilePage({
  user,
  onUpdated,
  onUnauthenticated,
}: ProfilePageProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [state, setState] = useState<ProfileState>({ kind: "ready" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState<PasswordState>({
    kind: "ready",
  });

  useEffect(() => {
    setDisplayName(user.displayName);
  }, [user.displayName]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState({ kind: "saving" });
    try {
      const updated = await updateProfile({ displayName });
      onUpdated(updated);
      setState({ kind: "success", message: "Display name updated." });
    } catch (err) {
      if (isUnauthenticated(err)) {
        const message = toUserMessage(err);
        setState({ kind: "unauthenticated", message });
        onUnauthenticated();
        return;
      }
      setState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onChangePassword(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordState({
        kind: "error",
        message: "New password and confirmation do not match.",
      });
      return;
    }
    setPasswordState({ kind: "saving" });
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordState({ kind: "success", message: "Password updated." });
    } catch (err) {
      if (isUnauthenticated(err)) {
        setState({ kind: "unauthenticated", message: toUserMessage(err) });
        onUnauthenticated();
        return;
      }
      setPasswordState({ kind: "error", message: toUserMessage(err) });
    }
  }

  if (state.kind === "unauthenticated") {
    return (
      <section aria-labelledby="profile-heading" className="min-h-0 flex-1 overflow-y-auto">
        <Card className={EYECANDY_SURFACE_CLASS} data-testid="profile-card">
          <CardHeader>
            <h2 id="profile-heading" className="text-xl font-semibold tracking-tight">
              Your profile
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" role="status">
              {state.message}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="profile-heading" className="min-h-0 flex-1 overflow-y-auto">
      <Card className={EYECANDY_SURFACE_CLASS} data-testid="profile-card">
        <CardHeader>
          <h2 id="profile-heading" className="text-xl font-semibold tracking-tight">
            Your profile
          </h2>
        </CardHeader>
        <CardContent className="grid gap-8">
          <form onSubmit={(event) => void onSubmit(event)} className="grid max-w-md gap-4">
            <Label className="grid gap-2">
              Email
              <Input type="email" name="email" value={user.email} readOnly />
            </Label>
            <Label className="grid gap-2">
              Display name
              <Input
                type="text"
                name="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={state.kind === "saving"}
              />
            </Label>
            <Button type="submit" disabled={state.kind === "saving"}>
              {state.kind === "saving" ? "Saving…" : "Save display name"}
            </Button>
            {state.kind === "saving" ? (
              <p className="text-sm text-muted-foreground" role="status">
                Saving profile…
              </p>
            ) : null}
            {state.kind === "success" ? (
              <p className="text-sm text-muted-foreground" role="status">
                {state.message}
              </p>
            ) : null}
            {state.kind === "error" ? (
              <p className="text-sm text-destructive" role="alert">
                {state.message}
              </p>
            ) : null}
          </form>

          <form
            onSubmit={(event) => void onChangePassword(event)}
            className="grid max-w-md gap-4"
            aria-labelledby="change-password-heading"
          >
            <h3
              id="change-password-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Change password
            </h3>
            <Label className="grid gap-2">
              Current password
              <Input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={passwordState.kind === "saving"}
              />
            </Label>
            <Label className="grid gap-2">
              New password
              <Input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={passwordState.kind === "saving"}
              />
            </Label>
            <Label className="grid gap-2">
              Confirm new password
              <Input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={passwordState.kind === "saving"}
              />
            </Label>
            <Button type="submit" disabled={passwordState.kind === "saving"}>
              {passwordState.kind === "saving"
                ? "Updating password…"
                : "Update password"}
            </Button>
            {passwordState.kind === "saving" ? (
              <p className="text-sm text-muted-foreground" role="status">
                Updating password…
              </p>
            ) : null}
            {passwordState.kind === "success" ? (
              <p className="text-sm text-muted-foreground" role="status">
                {passwordState.message}
              </p>
            ) : null}
            {passwordState.kind === "error" ? (
              <p className="text-sm text-destructive" role="alert">
                {passwordState.message}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
