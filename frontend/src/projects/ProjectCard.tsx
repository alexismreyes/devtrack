import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProjectCoverContent } from "../api/client";
import type { PublicProjectCoverSummaryDto, PublicProjectDto } from "../api/types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { projectCoverFromName } from "./projectCover";

type ProjectCardProps = {
  project: PublicProjectDto;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const fallback = projectCoverFromName(project.name);

  return (
    <Link
      to={`/projects/${project.id}`}
      aria-label={project.name}
      className="block cursor-pointer"
    >
      <Card className="overflow-hidden transition-colors hover:bg-accent/40">
        {project.cover === null ? (
          <NameDerivedCover
            initials={fallback.initials}
            backgroundClass={fallback.backgroundClass}
            foregroundClass={fallback.foregroundClass}
          />
        ) : (
          <AuthenticatedProjectCover
            projectId={project.id}
            cover={project.cover}
            fallbackInitials={fallback.initials}
            fallbackBackgroundClass={fallback.backgroundClass}
            fallbackForegroundClass={fallback.foregroundClass}
          />
        )}
        <CardHeader className="p-4">
          <CardTitle className="text-base">{project.name}</CardTitle>
          {project.description === null || project.description.trim() === "" ? null : (
            <CardDescription className="line-clamp-2">{project.description}</CardDescription>
          )}
        </CardHeader>
      </Card>
    </Link>
  );
}

function NameDerivedCover({
  initials,
  backgroundClass,
  foregroundClass,
}: {
  initials: string;
  backgroundClass: string;
  foregroundClass: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-slot="project-cover"
      data-cover-kind="fallback"
      className={cn(
        "flex h-24 items-center justify-center text-2xl font-semibold tracking-wide",
        backgroundClass,
        foregroundClass,
      )}
    >
      {initials}
    </div>
  );
}

function AuthenticatedProjectCover({
  projectId,
  cover,
  fallbackInitials,
  fallbackBackgroundClass,
  fallbackForegroundClass,
}: {
  projectId: string;
  cover: PublicProjectCoverSummaryDto;
  fallbackInitials: string;
  fallbackBackgroundClass: string;
  fallbackForegroundClass: string;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    async function load(): Promise<void> {
      try {
        const { blob } = await fetchProjectCoverContent(projectId);
        createdUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(createdUrl);
          createdUrl = null;
          return;
        }
        setObjectUrl(createdUrl);
      } catch {
        if (!cancelled) {
          setObjectUrl(null);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (createdUrl !== null) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [cover.id, projectId]);

  if (objectUrl === null) {
    return (
      <NameDerivedCover
        initials={fallbackInitials}
        backgroundClass={fallbackBackgroundClass}
        foregroundClass={fallbackForegroundClass}
      />
    );
  }

  return (
    <img
      src={objectUrl}
      alt=""
      aria-hidden="true"
      data-slot="project-cover"
      data-cover-kind="image"
      data-cover-id={cover.id}
      className="h-24 w-full object-cover"
    />
  );
}
