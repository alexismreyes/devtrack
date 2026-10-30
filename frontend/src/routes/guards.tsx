import { Navigate } from "react-router-dom";
import { AuthenticatedLayout } from "../layout/AuthenticatedLayout";
import { GuestLayout } from "../layout/GuestLayout";
import { useSession } from "../session/SessionContext";

export function GuestGuard() {
  const { session } = useSession();

  if (session.kind === "authenticated") {
    return <Navigate to="/projects" replace />;
  }

  return <GuestLayout />;
}

export function AuthGuard() {
  const { session } = useSession();

  if (session.kind === "guest") {
    return <Navigate to="/login" replace />;
  }

  return <AuthenticatedLayout />;
}
