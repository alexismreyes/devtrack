import { Navigate, useParams } from "react-router-dom";
import { ProjectDetail } from "../projects/ProjectDetail";
import { useSession } from "../session/SessionContext";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { onLoggedOut } = useSession();

  if (projectId === undefined || projectId.trim() === "") {
    return <Navigate to="/projects" replace />;
  }

  return (
    <ProjectDetail projectId={projectId} onUnauthenticated={onLoggedOut} />
  );
}
