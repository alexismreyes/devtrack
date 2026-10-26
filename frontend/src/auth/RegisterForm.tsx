import { useState, type FormEvent } from "react";
import { register, toUserMessage } from "../api/client";
import type { PublicUserDto } from "../api/types";

type RegisterFormProps = {
  onSuccess: (user: PublicUserDto) => void;
};

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await register({ email, displayName, password });
      setPassword("");
      onSuccess(user);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} aria-labelledby="register-heading">
      <h2 id="register-heading">Register</h2>
      <label>
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={submitting}
        />
      </label>
      <label>
        Display name
        <input
          type="text"
          name="displayName"
          autoComplete="nickname"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={submitting}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Registering…" : "Create account"}
      </button>
      {submitting ? <p role="status">Registering…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
