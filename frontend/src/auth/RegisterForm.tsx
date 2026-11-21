import { useState, type FormEvent } from "react";
import { register, toUserMessage } from "../api/client";
import type { PublicUserDto } from "../api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./PasswordInput";

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
    <Card>
      <CardHeader>
        <h2 id="register-heading" className="text-xl font-semibold tracking-tight">
          Register
        </h2>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => void onSubmit(event)}
          aria-labelledby="register-heading"
          className="grid gap-4"
        >
          <Label className="grid gap-2">
            Email
            <Input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
            />
          </Label>
          <Label className="grid gap-2">
            Display name
            <Input
              type="text"
              name="displayName"
              autoComplete="nickname"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={submitting}
            />
          </Label>
          <Label className="grid gap-2">
            Password
            <PasswordInput
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
            />
          </Label>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Registering…" : "Create account"}
          </Button>
          {submitting ? (
            <p className="text-sm text-muted-foreground" role="status">
              Registering…
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
