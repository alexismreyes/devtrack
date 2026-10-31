import { Link } from "react-router-dom";
import type { PublicProjectDto } from "../api/types";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { projectCoverFromName } from "./projectCover";

type ProjectCardProps = {
  project: PublicProjectDto;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const cover = projectCoverFromName(project.name);

  return (
    <Link
      to={`/projects/${project.id}`}
      aria-label={project.name}
      className="block cursor-pointer"
    >
      <Card className="overflow-hidden transition-colors hover:bg-accent/40">
        <div
          aria-hidden="true"
          data-slot="project-cover"
          className={cn(
            "flex h-24 items-center justify-center text-2xl font-semibold tracking-wide",
            cover.backgroundClass,
            cover.foregroundClass,
          )}
        >
          {cover.initials}
        </div>
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
