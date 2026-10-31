import { Route, Routes } from "react-router-dom";
import { SessionGate } from "./layout/SessionGate";
import { AuthGuard, GuestGuard } from "./routes/guards";
import { LoginPage } from "./routes/LoginPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { ProfileDestination } from "./routes/ProfileDestination";
import { ProjectDetailPage } from "./routes/ProjectDetailPage";
import { ProjectsHome } from "./routes/ProjectsHome";
import { RegisterPage } from "./routes/RegisterPage";
import { RootRedirect } from "./routes/RootRedirect";
import { SessionProvider } from "./session/SessionContext";
import { UiPaletteProvider } from "./theme/UiPaletteProvider";

export function App() {
  return (
    <UiPaletteProvider>
      <SessionProvider>
        <Routes>
          <Route element={<SessionGate />}>
            <Route path="/" element={<RootRedirect />} />
            <Route element={<GuestGuard />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route element={<AuthGuard />}>
              <Route path="/projects" element={<ProjectsHome />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/profile" element={<ProfileDestination />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SessionProvider>
    </UiPaletteProvider>
  );
}
