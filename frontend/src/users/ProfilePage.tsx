import { useEffect, useState, type FormEvent } from "react";
import { isUnauthenticated, toUserMessage, updateProfile } from "../api/client";
import type { PublicUserDto } from "../api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function ProfilePage({
  user,
  onUpdated,
  onUnauthenticated,
}: ProfilePageProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [state, setState] = useState<ProfileState>({ kind: "ready" });

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

  if (state.kind === "unauthenticated") {
    return (
      <section aria-labelledby="profile-heading">
        <Card>
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
    <section aria-labelledby="profile-heading">
      <Card>
        <CardHeader>
          <h2 id="profile-heading" className="text-xl font-semibold tracking-tight">
            Your profile
          </h2>
        </CardHeader>
        <CardContent>
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
          </form>
          {state.kind === "saving" ? (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              Saving profile…
            </p>
          ) : null}
          {state.kind === "success" ? (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              {state.message}
            </p>
          ) : null}
          {state.kind === "error" ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
