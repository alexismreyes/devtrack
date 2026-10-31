import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyUiPaletteToDocument,
  readStoredUiPalette,
  writeStoredUiPalette,
  type UiPaletteId,
} from "./uiPalettes";

type UiPaletteContextValue = {
  palette: UiPaletteId;
  setPalette: (id: UiPaletteId) => void;
};

const UiPaletteContext = createContext<UiPaletteContextValue | null>(null);

export function UiPaletteProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<UiPaletteId>(() => {
    const initial = readStoredUiPalette();
    applyUiPaletteToDocument(initial);
    return initial;
  });

  useLayoutEffect(() => {
    applyUiPaletteToDocument(palette);
  }, [palette]);

  const setPalette = useCallback((id: UiPaletteId): void => {
    setPaletteState(id);
    writeStoredUiPalette(id);
    applyUiPaletteToDocument(id);
  }, []);

  const value = useMemo(
    () => ({ palette, setPalette }),
    [palette, setPalette],
  );

  return <UiPaletteContext.Provider value={value}>{children}</UiPaletteContext.Provider>;
}

export function useUiPalette(): UiPaletteContextValue {
  const value = useContext(UiPaletteContext);
  if (value === null) {
    throw new Error("useUiPalette must be used within UiPaletteProvider");
  }
  return value;
}
