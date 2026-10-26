import { ProbePage } from "./system/ProbePage";

export function App() {
  return (
    <main>
      <h1>DevTrack system probes</h1>
      <p>
        Record a system probe to verify the browser can persist data through the
        backend API.
      </p>
      <ProbePage />
    </main>
  );
}
