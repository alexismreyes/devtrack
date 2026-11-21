import { Link, Outlet } from "react-router-dom";

export function GuestLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        role="banner"
        className="flex h-14 items-center gap-4 border-b border-devtrack-bar bg-devtrack-bar px-4 text-devtrack-bar-foreground"
      >
        <h1 className="text-lg font-semibold tracking-tight">DevTrack</h1>
        <nav aria-label="Account" className="ml-auto flex items-center gap-4 text-sm font-medium">
          <Link
            to="/register"
            className="cursor-pointer underline-offset-4 hover:underline"
          >
            Register
          </Link>
          <Link
            to="/login"
            className="cursor-pointer underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
