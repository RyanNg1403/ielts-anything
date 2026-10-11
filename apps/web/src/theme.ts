// Light/dark theme. "system" follows the OS; the choice is a per-device preference.
import { useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(pref: ThemePref = read()) {
  const dark = pref === "dark" || (pref === "system" && media().matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function useTheme(): [ThemePref, (p: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(read);
  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const m = media();
    const on = () => applyTheme(); // re-reads the stored choice, so Settings changes win
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [pref]);
  return [
    pref,
    (p) => {
      try {
        localStorage.setItem(KEY, p);
      } catch {}
      setPref(p);
    },
  ];
}
