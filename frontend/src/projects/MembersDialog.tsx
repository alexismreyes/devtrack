import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  addMember,
  isUnauthenticated,
  listMembers,
  removeMember,
  toUserMessage,
  updateMember,
} from "../api/client";
import type { ProjectMemberRole, PublicMemberDto } from "../api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, nativeSelectClassName } from "@/lib/utils";

const MEMBER_ROLES: ProjectMemberRole[] = ["OWNER", "EDITOR", "VIEWER"];

type MembersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  ownerUserId: string;
  onUnauthenticated: () => void;
};

type ListState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "success"; members: PublicMemberDto[] }
  | { kind: "unauthenticated"; message: string }
  | { kind: "error"; message: string };

type ActionState =
  | { kind: "idle" }
  | { kind: "adding" }
  | { kind: "updating"; userId: string }
  | { kind: "removing"; userId: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function MembersDialog({
  open,
  onOpenChange,
  projectId,
  ownerUserId,
  onUnauthenticated,
}: MembersDialogProps) {
  const [listState, setListState] = useState<ListState>({ kind: "loading" });
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectMemberRole>("VIEWER");

  const loadMembers = useCallback(async (): Promise<boolean> => {
    setListState({ kind: "loading" });
    try {
      const result = await listMembers(projectId);
      if (result.members.length === 0) {
        setListState({ kind: "empty" });
        return true;
      }
      setListState({ kind: "success", members: result.members });
      return true;
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        setActionState({ kind: "idle" });
        onUnauthenticated();
        return false;
      }
      setListState({ kind: "error", message: toUserMessage(err) });
      return false;
    }
  }, [onUnauthenticated, projectId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setEmail("");
    setRole("VIEWER");
    setActionState({ kind: "idle" });
    void loadMembers();
  }, [loadMembers, open]);

  function handleAuthzError(err: unknown): boolean {
    if (isUnauthenticated(err)) {
      setListState({ kind: "unauthenticated", message: toUserMessage(err) });
      setActionState({ kind: "idle" });
      onUnauthenticated();
      return true;
    }
    return false;
  }

  async function onAdd(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionState({ kind: "adding" });
    try {
      await addMember(projectId, { email, role });
      const loaded = await loadMembers();
      if (loaded) {
        setEmail("");
        setRole("VIEWER");
        setActionState({ kind: "success", message: "Member added." });
      }
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onChangeRole(
    userId: string,
    nextRole: ProjectMemberRole,
  ): Promise<void> {
    setActionState({ kind: "updating", userId });
    try {
      await updateMember(projectId, userId, { role: nextRole });
      const loaded = await loadMembers();
      if (loaded) {
        setActionState({ kind: "success", message: "Member role updated." });
      }
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onRemove(userId: string): Promise<void> {
    setActionState({ kind: "removing", userId });
    try {
      await removeMember(projectId, userId);
      const loaded = await loadMembers();
      if (loaded) {
        setActionState({ kind: "success", message: "Member removed." });
      }
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  const busy =
    actionState.kind === "adding" ||
    actionState.kind === "updating" ||
    actionState.kind === "removing";
  const members =
    listState.kind === "success"
      ? listState.members
      : listState.kind === "empty"
        ? []
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (busy) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="project-members-heading">Members</DialogTitle>
          <DialogDescription>
            Add an existing DevTrack user by email, change roles, or remove
            members.
          </DialogDescription>
        </DialogHeader>
        {listState.kind === "loading" ? (
          <p className="text-sm text-muted-foreground" role="status">
            Loading members…
          </p>
        ) : null}
        {listState.kind === "unauthenticated" ? (
          <p className="text-sm text-muted-foreground" role="status">
            {listState.message}
          </p>
        ) : null}
        {listState.kind === "error" ? (
          <p className="text-sm text-destructive" role="alert">
            {listState.message}
          </p>
        ) : null}
        {listState.kind === "empty" ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : null}
        {members !== null && members.length > 0 ? (
          <ul aria-label="Project members" className="grid gap-3">
            {members.map((member) => {
              const creatingOwner = member.userId === ownerUserId;
              return (
                <li
                  key={member.id}
                  className="grid gap-2 rounded-md border p-3"
                >
                  <p className="text-sm font-medium">{member.displayName}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <p className="text-sm text-muted-foreground">Role {member.role}</p>
                  <Label className="grid gap-2">
                    Role for {member.displayName}
                    <select
                      className={cn(nativeSelectClassName)}
                      value={member.role}
                      disabled={busy || creatingOwner}
                      onChange={(event) => {
                        const nextRole = event.target.value as ProjectMemberRole;
                        if (nextRole === member.role) {
                          return;
                        }
                        void onChangeRole(member.userId, nextRole);
                      }}
                    >
                      {MEMBER_ROLES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void onRemove(member.userId)}
                    disabled={busy || creatingOwner}
                  >
                    {actionState.kind === "removing" &&
                    actionState.userId === member.userId
                      ? "Removing…"
                      : `Remove ${member.displayName}`}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <form
          onSubmit={(event) => void onAdd(event)}
          aria-labelledby="add-member-heading"
          className="grid gap-3"
        >
          <h3 id="add-member-heading" className="text-sm font-semibold">
            Add member
          </h3>
          <Label className="grid gap-2">
            Member email
            <Input
              type="email"
              name="member-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
          </Label>
          <Label className="grid gap-2">
            Member role
            <select
              name="member-role"
              className={cn(nativeSelectClassName)}
              value={role}
              onChange={(event) =>
                setRole(event.target.value as ProjectMemberRole)
              }
              disabled={busy}
            >
              {MEMBER_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Label>
          {actionState.kind === "adding" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Adding member…
            </p>
          ) : null}
          {actionState.kind === "success" ? (
            <p className="text-sm text-muted-foreground" role="status">
              {actionState.message}
            </p>
          ) : null}
          {actionState.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {actionState.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={busy}>
              {actionState.kind === "adding" ? "Adding…" : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
