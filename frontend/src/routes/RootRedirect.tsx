import { Navigate } from "react-router-dom";
import { useSession } from "../session/SessionContext";

export function RootRedirect() {
  const { session } = useSession();

  if (session.kind === "authenticated") {
    return <Navigate to="/projects" replace />;
  }

  return <Navigate to="/login" replace />;
}
