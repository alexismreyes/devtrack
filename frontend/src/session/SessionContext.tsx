import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProfile, isUnauthenticated, toUserMessage } from "../api/client";
import type { PublicUserDto } from "../api/types";

export type SessionState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "authenticated"; user: PublicUserDto }
  | { kind: "error"; message: string };

type SessionContextValue = {
  session: SessionState;
  onAuthenticated: (user: PublicUserDto) => void;
  onLoggedOut: () => void;
  onUserUpdated: (user: PublicUserDto) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ kind: "loading" });

  const loadSession = useCallback(async () => {
    setSession({ kind: "loading" });
    try {
      const user = await getProfile();
      setSession({ kind: "authenticated", user });
    } catch (err) {
      if (isUnauthenticated(err)) {
        setSession({ kind: "guest" });
        return;
      }
      setSession({ kind: "error", message: toUserMessage(err) });
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const onAuthenticated = useCallback((user: PublicUserDto): void => {
    setSession({ kind: "authenticated", user });
  }, []);

  const onLoggedOut = useCallback((): void => {
    setSession({ kind: "guest" });
  }, []);

  const onUserUpdated = useCallback((user: PublicUserDto): void => {
    setSession({ kind: "authenticated", user });
  }, []);

  const value = useMemo(
    () => ({ session, onAuthenticated, onLoggedOut, onUserUpdated }),
    [session, onAuthenticated, onLoggedOut, onUserUpdated],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return value;
}
