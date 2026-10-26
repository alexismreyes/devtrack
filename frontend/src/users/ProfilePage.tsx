import { useEffect, useState, type FormEvent } from "react";
import { isUnauthenticated, toUserMessage, updateProfile } from "../api/client";
import type { PublicUserDto } from "../api/types";

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
        <h2 id="profile-heading">Your profile</h2>
        <p role="status">{state.message}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="profile-heading">
      <h2 id="profile-heading">Your profile</h2>
      <form onSubmit={(event) => void onSubmit(event)}>
        <label>
          Email
          <input type="email" name="email" value={user.email} readOnly />
        </label>
        <label>
          Display name
          <input
            type="text"
            name="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={state.kind === "saving"}
          />
        </label>
        <button type="submit" disabled={state.kind === "saving"}>
          {state.kind === "saving" ? "Saving…" : "Save display name"}
        </button>
      </form>
      {state.kind === "saving" ? <p role="status">Saving profile…</p> : null}
      {state.kind === "success" ? <p role="status">{state.message}</p> : null}
      {state.kind === "error" ? <p role="alert">{state.message}</p> : null}
    </section>
  );
}
