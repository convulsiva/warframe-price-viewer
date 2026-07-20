import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingsState = {
  closeToTray: boolean;
  language: "en" | "ru";
  notificationsEnabled: boolean;
  theme: "dark" | "light";
  useProxy: boolean;
  proxyUrl: string;
  setCloseToTray: (enabled: boolean) => void;
  setLanguage: (language: "en" | "ru") => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  setUseProxy: (enabled: boolean) => void;
  setProxyUrl: (proxyUrl: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      closeToTray: true,
      language: "en",
      notificationsEnabled: true,
      theme: "dark",
      useProxy: false,
      proxyUrl: "",
      setCloseToTray: (enabled) => set({ closeToTray: enabled }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
      setUseProxy: (enabled) => set({ useProxy: enabled }),
      setProxyUrl: (proxyUrl) => set({ proxyUrl })
    }),
    {
      name: "warframe-price-viewer-settings",
      version: 6,
      migrate: (persistedState) => ({
        ...(persistedState as Partial<SettingsState>),
        closeToTray: (persistedState as Partial<SettingsState>)?.closeToTray ?? true,
        language: (persistedState as Partial<SettingsState>)?.language ?? "en",
        notificationsEnabled: (persistedState as Partial<SettingsState>)?.notificationsEnabled ?? true,
        theme: (persistedState as Partial<SettingsState>)?.theme ?? "dark",
        useProxy: (persistedState as Partial<SettingsState>)?.useProxy ?? false,
        proxyUrl: (persistedState as Partial<SettingsState>)?.proxyUrl ?? ""
      })
    }
  )
);
