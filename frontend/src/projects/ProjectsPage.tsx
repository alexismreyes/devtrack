import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createProject,
  isForbidden,
  isUnauthenticated,
  listProjects,
  toUserMessage,
} from "../api/client";
import type { PublicProjectDto } from "../api/types";

type ProjectsPageProps = {
  onSelectProject: (projectId: string) => void;
  onUnauthenticated: () => void;
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
}: ProjectsPageProps) {
  const [listState, setListState] = useState<ListState>({ kind: "loading" });
  const [createState, setCreateState] = useState<CreateState>({ kind: "ready" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadProjects = useCallback(async (): Promise<boolean> => {
    setListState({ kind: "loading" });
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
  }, [loadProjects]);

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
      const loaded = await loadProjects();
      if (loaded) {
        setCreateState({ kind: "success", message: "Project created." });
      }
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        setCreateState({ kind: "ready" });
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
    <section aria-labelledby="projects-heading">
      <h2 id="projects-heading">Projects</h2>
      {listBlocked ? null : (
        <form onSubmit={(event) => void onCreate(event)} aria-labelledby="create-project-heading">
          <h3 id="create-project-heading">Create project</h3>
          <label>
            Name
            <input
              type="text"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={creating}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={creating}
            />
          </label>
          <button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create project"}
          </button>
        </form>
      )}
      {creating ? <p role="status">Creating project…</p> : null}
      {createState.kind === "success" ? (
        <p role="status">{createState.message}</p>
      ) : null}
      {createState.kind === "error" ? (
        <p role="alert">{createState.message}</p>
      ) : null}
      {listState.kind === "loading" ? (
        <p role="status">Loading projects…</p>
      ) : null}
      {listState.kind === "empty" ? <p>No projects yet.</p> : null}
      {listState.kind === "success" ? (
        <ul aria-label="Projects">
          {listState.projects.map((project) => (
            <li key={project.id}>
              <button type="button" onClick={() => onSelectProject(project.id)}>
                {project.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {listState.kind === "unauthenticated" ? (
        <p role="status">{listState.message}</p>
      ) : null}
      {listState.kind === "forbidden" ? (
        <p role="alert">{listState.message}</p>
      ) : null}
      {listState.kind === "error" ? (
        <p role="alert">{listState.message}</p>
      ) : null}
    </section>
  );
}
