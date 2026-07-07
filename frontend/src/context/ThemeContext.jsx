import { createContext, useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "./AuthContext";
import api from "../services/api";

export const ThemeContext = createContext(null);

const resolveTheme = (mode, startHour = 6, endHour = 18) => {
  if (mode === "dark" || mode === "light") return mode;
  if (mode === "system") {
    if (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) return "dark";
    return "light";
  }
  const now = new Date();
  const hour = now.getHours();
  if (startHour <= endHour) {
    return hour >= startHour && hour < endHour ? "light" : "dark";
  }
  return hour >= startHour || hour < endHour ? "light" : "dark";
};

export const ThemeProvider = ({ children }) => {
  const { user, updateUser } = useContext(AuthContext) || {};

  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("cubicnotes_theme_mode") || "light");
  const [themeAutoStartHour, setThemeAutoStartHour] = useState(() => {
    const stored = localStorage.getItem("cubicnotes_theme_auto_start");
    return stored !== null ? Number(stored) : 6;
  });
  const [themeAutoEndHour, setThemeAutoEndHour] = useState(() => {
    const stored = localStorage.getItem("cubicnotes_theme_auto_end");
    return stored !== null ? Number(stored) : 18;
  });
  const [theme, setTheme] = useState(() => {
    const mode = localStorage.getItem("cubicnotes_theme_mode") || "light";
    const start = Number(localStorage.getItem("cubicnotes_theme_auto_start") || 6);
    const end = Number(localStorage.getItem("cubicnotes_theme_auto_end") || 18);
    return resolveTheme(mode, start, end);
  });

  useEffect(() => {
    const resolved = resolveTheme(themeMode, themeAutoStartHour, themeAutoEndHour);
    setTheme(resolved);
    localStorage.setItem("cubicnotes_theme_mode", themeMode);
    localStorage.setItem("cubicnotes_theme_auto_start", String(themeAutoStartHour));
    localStorage.setItem("cubicnotes_theme_auto_end", String(themeAutoEndHour));
  }, [themeMode, themeAutoStartHour, themeAutoEndHour]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cubicnotes_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    const nextMode = user.themeMode || user.theme || "light";
    setThemeMode(nextMode);
    setThemeAutoStartHour(user.themeAutoStartHour ?? 6);
    setThemeAutoEndHour(user.themeAutoEndHour ?? 18);
  }, [user?.themeMode, user?.theme, user?.themeAutoStartHour, user?.themeAutoEndHour]);

  useEffect(() => {
    if (themeMode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setTheme(resolveTheme("system", themeAutoStartHour, themeAutoEndHour));
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }, [themeMode, themeAutoStartHour, themeAutoEndHour]);

  const persistThemeMode = useCallback(
    async (mode, startHour, endHour) => {
      setThemeMode(mode);
      setThemeAutoStartHour(startHour);
      setThemeAutoEndHour(endHour);

      if (user) {
        const payload = {
          themeMode: mode,
          themeAutoStartHour: startHour,
          themeAutoEndHour: endHour,
        };
        if (mode === "light" || mode === "dark") {
          payload.theme = mode;
        }
        try {
          const { data } = await api.put("/auth/profile", payload);
          updateUser?.(data);
        } catch {
          // ignore backend persistence failure
        }
      }
    },
    [user, updateUser]
  );

  const toggleTheme = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    persistThemeMode(next, themeAutoStartHour, themeAutoEndHour);
  }, [theme, themeAutoStartHour, themeAutoEndHour, persistThemeMode]);

  const setThemeModePreference = useCallback(
    (mode) => {
      persistThemeMode(mode, themeAutoStartHour, themeAutoEndHour);
    },
    [themeAutoStartHour, themeAutoEndHour, persistThemeMode]
  );

  const setThemeAutoHours = useCallback(
    (startHour, endHour) => {
      persistThemeMode(themeMode, startHour, endHour);
    },
    [themeMode, persistThemeMode]
  );

  return (
    <ThemeContext.Provider value={{
      theme,
      themeMode,
      themeAutoStartHour,
      themeAutoEndHour,
      toggleTheme,
      setThemeMode: setThemeModePreference,
      setThemeAutoHours,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
