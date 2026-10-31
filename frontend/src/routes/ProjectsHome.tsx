import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { isForbidden, isUnauthenticated, listProjects, toUserMessage } from "../api/client";
import type { PublicProjectDto } from "../api/types";
import type { AuthenticatedOutletContext } from "../layout/AuthenticatedLayout";
import { ProjectCard } from "../projects/ProjectCard";
import { useSession } from "../session/SessionContext";

type ListState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "success"; projects: PublicProjectDto[] }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string };

function activeProjects(projects: PublicProjectDto[]): PublicProjectDto[] {
  return projects.filter((project) => project.archivedAt === null);
}

function useProjectListEpoch(): number {
  const ctx = useOutletContext<AuthenticatedOutletContext | undefined>();
  return ctx?.projectListEpoch ?? 0;
}

export function ProjectsHome() {
  const { onLoggedOut } = useSession();
  const projectListEpoch = useProjectListEpoch();
  const [listState, setListState] = useState<ListState>({ kind: "loading" });

  const loadProjects = useCallback(async () => {
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
        return;
      }
      setListState({ kind: "success", projects });
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        onLoggedOut();
        return;
      }
      if (isForbidden(err)) {
        setListState({ kind: "forbidden", message: toUserMessage(err) });
        return;
      }
      setListState({ kind: "error", message: toUserMessage(err) });
    }
  }, [onLoggedOut]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects, projectListEpoch]);

  return (
    <section
      aria-labelledby="projects-home-heading"
      className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto"
    >
      <h2 id="projects-home-heading" className="text-xl font-semibold tracking-tight">
        Your projects
      </h2>
      {listState.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading projects…
        </p>
      ) : null}
      {listState.kind === "empty" ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : null}
      {listState.kind === "success" ? (
        <ul
          aria-label="Project cards"
          className="grid grid-cols-[repeat(auto-fill,minmax(14rem,18rem))] justify-start gap-4"
        >
          {listState.projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
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
