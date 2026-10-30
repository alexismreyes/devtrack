import { useNavigate } from "react-router-dom";
import { LoginForm } from "../auth/LoginForm";
import { useSession } from "../session/SessionContext";

export function LoginPage() {
  const { onAuthenticated } = useSession();
  const navigate = useNavigate();

  return (
    <LoginForm
      onSuccess={(user) => {
        onAuthenticated(user);
        void navigate("/projects", { replace: true });
      }}
    />
  );
}
