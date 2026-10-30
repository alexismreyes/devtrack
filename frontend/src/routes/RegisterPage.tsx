import { useNavigate } from "react-router-dom";
import { RegisterForm } from "../auth/RegisterForm";
import { useSession } from "../session/SessionContext";

export function RegisterPage() {
  const { onAuthenticated } = useSession();
  const navigate = useNavigate();

  return (
    <RegisterForm
      onSuccess={(user) => {
        onAuthenticated(user);
        void navigate("/projects", { replace: true });
      }}
    />
  );
}
