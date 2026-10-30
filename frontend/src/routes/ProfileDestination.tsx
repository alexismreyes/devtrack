import { ProfilePage } from "../users/ProfilePage";
import { useSession } from "../session/SessionContext";

export function ProfileDestination() {
  const { session, onLoggedOut, onUserUpdated } = useSession();

  if (session.kind !== "authenticated") {
    return null;
  }

  return (
    <ProfilePage
      user={session.user}
      onUpdated={onUserUpdated}
      onUnauthenticated={onLoggedOut}
    />
  );
}
