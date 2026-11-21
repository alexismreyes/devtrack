import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Noun used in the toggle accessible name, e.g. "password" → "Show password". */
  toggleNoun?: string;
};

export function PasswordInput({
  className,
  disabled,
  toggleNoun = "password",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const showLabel = `Show ${toggleNoun}`;
  const hideLabel = `Hide ${toggleNoun}`;

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        disabled={disabled}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 text-muted-foreground hover:text-foreground"
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </Button>
    </div>
  );
}
