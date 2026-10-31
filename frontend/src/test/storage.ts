import { expect } from "vitest";
import { UI_PALETTE_STORAGE_KEY } from "../theme/uiPalettes";

const SESSION_MATERIAL = /token|bearer|session|password|jwt|authorization/i;

function storageKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null) {
      keys.push(key);
    }
  }
  return keys;
}

export function expectNoSessionTokenStorage(): void {
  const localKeys = storageKeys(window.localStorage);
  expect(localKeys.every((key) => key === UI_PALETTE_STORAGE_KEY)).toBe(true);
  const paletteValue = window.localStorage.getItem(UI_PALETTE_STORAGE_KEY);
  if (paletteValue !== null) {
    expect(paletteValue).not.toMatch(SESSION_MATERIAL);
  }
  expect(window.sessionStorage.length).toBe(0);
  expect(window.sessionStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBeNull();
}
