import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Folders, Plus } from "lucide-react";
import {
  createProject,
  isForbidden,
  isUnauthenticated,
  listProjects,
  toUserMessage,
} from "../api/client";
import type { PublicProjectDto } from "../api/types";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "./CreateProjectDialog";

type ProjectsPageProps = {
  onSelectProject: (projectId: string) => void;
  onUnauthenticated: () => void;
  selectedProjectId?: string | null;
  reloadKey?: string;
  onProjectsChanged?: () => void;
};

type ListState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "success"; projects: PublicProjectDto[] }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string };

type CreateState =
  | { kind: "ready" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function activeProjects(projects: PublicProjectDto[]): PublicProjectDto[] {
  return projects.filter((project) => project.archivedAt === null);
}

export function ProjectsPage({
  onSelectProject,
  onUnauthenticated,
  selectedProjectId = null,
  reloadKey,
  onProjectsChanged,
}: ProjectsPageProps) {
  const [listState, setListState] = useState<ListState>({ kind: "loading" });
  const [createState, setCreateState] = useState<CreateState>({ kind: "ready" });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadProjects = useCallback(async (): Promise<boolean> => {
    setListState((current) =>
      current.kind === "success" || current.kind === "empty"
        ? current
        : { kind: "loading" },
    );
    try {
      const result = await listProjects();
      const projects = activeProjects(result.projects);
      if (projects.length === 0) {
        setListState({ kind: "empty" });
        return true;
      }
      setListState({ kind: "success", projects });
      return true;
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        onUnauthenticated();
        return false;
      }
      if (isForbidden(err)) {
        setListState({ kind: "forbidden", message: toUserMessage(err) });
        return false;
      }
      setListState({ kind: "error", message: toUserMessage(err) });
      return false;
    }
  }, [onUnauthenticated]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects, reloadKey]);

  function closeCreateDialog(): void {
    setCreateOpen(false);
    setName("");
    setDescription("");
    if (createState.kind === "error") {
      setCreateState({ kind: "ready" });
    }
  }

  async function onCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreateState({ kind: "saving" });
    const payload = {
      name,
      description: description.trim() === "" ? null : description,
    };
    try {
      await createProject(payload);
      setName("");
      setDescription("");
      setCreateOpen(false);
      if (onProjectsChanged === undefined) {
        const loaded = await loadProjects();
        if (loaded) {
          setCreateState({ kind: "success", message: "Project created." });
        }
        return;
      }
      setCreateState({ kind: "success", message: "Project created." });
      onProjectsChanged();
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        setCreateState({ kind: "ready" });
        setCreateOpen(false);
        onUnauthenticated();
        return;
      }
      if (isForbidden(err)) {
        setCreateState({ kind: "error", message: toUserMessage(err) });
        return;
      }
      setCreateState({ kind: "error", message: toUserMessage(err) });
    }
  }

  const creating = createState.kind === "saving";
  const listBlocked =
    listState.kind === "unauthenticated" || listState.kind === "forbidden";

  return (
    <section aria-labelledby="projects-heading" className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2
          id="projects-heading"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <Folders aria-hidden="true" className="size-4 shrink-0" />
          Projects
        </h2>
        {listBlocked ? null : (
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Create project"
            onClick={() => {
              setCreateState({ kind: "ready" });
              setCreateOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
          </Button>
        )}
      </div>
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open) {
            setCreateOpen(true);
            return;
          }
          closeCreateDialog();
        }}
        name={name}
        description={description}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onSubmit={onCreate}
        creating={creating}
        errorMessage={createState.kind === "error" ? createState.message : undefined}
      />
      {createState.kind === "success" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {createState.message}
        </p>
      ) : null}
      {listState.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading projects…
        </p>
      ) : null}
      {listState.kind === "empty" ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : null}
      {listState.kind === "success" ? (
        <ul aria-label="Projects" className="grid gap-1">
          {listState.projects.map((project) => (
            <li key={project.id}>
              <Button
                type="button"
                variant={selectedProjectId === project.id ? "secondary" : "ghost"}
                className="h-auto w-full justify-start px-3 py-2 text-left"
                onClick={() => onSelectProject(project.id)}
                aria-current={selectedProjectId === project.id ? "page" : undefined}
              >
                {project.name}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {listState.kind === "unauthenticated" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {listState.message}
        </p>
      ) : null}
      {listState.kind === "forbidden" ? (
        <p className="text-sm text-destructive" role="alert">
          {listState.message}
        </p>
      ) : null}
      {listState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {listState.message}
        </p>
      ) : null}
    </section>
  );
}
