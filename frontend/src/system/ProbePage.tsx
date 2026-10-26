import { useCallback, useEffect, useState } from "react";
import { createProbe, isUnauthenticated, listProbes, toUserMessage } from "../api/client";
import type { ProbeResponseDto } from "../api/types";

type PageState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "success"; probes: ProbeResponseDto[] }
  | { kind: "unauthenticated"; message: string }
  | { kind: "error"; message: string };

export function ProbePage() {
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [recording, setRecording] = useState(false);

  const loadProbes = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const result = await listProbes();
      if (result.probes.length === 0) {
        setState({ kind: "empty" });
        return;
      }
      setState({ kind: "success", probes: result.probes });
    } catch (err) {
      if (isUnauthenticated(err)) {
        setState({ kind: "unauthenticated", message: toUserMessage(err) });
        return;
      }
      setState({ kind: "error", message: toUserMessage(err) });
    }
  }, []);

  useEffect(() => {
    void loadProbes();
  }, [loadProbes]);

  async function onRecord(): Promise<void> {
    setRecording(true);
    try {
      await createProbe();
      await loadProbes();
    } catch (err) {
      if (isUnauthenticated(err)) {
        setState({ kind: "unauthenticated", message: toUserMessage(err) });
        return;
      }
      setState({ kind: "error", message: toUserMessage(err) });
    } finally {
      setRecording(false);
    }
  }

  const busy = recording || state.kind === "loading";

  return (
    <section aria-labelledby="probe-heading">
      <h2 id="probe-heading">Recorded probes</h2>
      <button type="button" onClick={() => void onRecord()} disabled={busy}>
        {recording ? "Recording…" : "Record probe"}
      </button>
      {state.kind === "loading" ? (
        <p role="status">Loading probes…</p>
      ) : null}
      {state.kind === "empty" ? <p>No probes recorded yet.</p> : null}
      {state.kind === "success" ? (
        <ul aria-label="System probes">
          {state.probes.map((probe) => (
            <li key={probe.id}>
              <span>{probe.id}</span>{" "}
              <time dateTime={probe.recordedAt}>{probe.recordedAt}</time>
            </li>
          ))}
        </ul>
      ) : null}
      {state.kind === "unauthenticated" ? (
        <p role="status">{state.message}</p>
      ) : null}
      {state.kind === "error" ? <p role="alert">{state.message}</p> : null}
    </section>
  );
}
