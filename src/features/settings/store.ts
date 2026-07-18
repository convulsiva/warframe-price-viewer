import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingsState = {
  closeToTray: boolean;
  notificationsEnabled: boolean;
  theme: "dark" | "light";
  useProxy: boolean;
  proxyUrl: string;
  setCloseToTray: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  setUseProxy: (enabled: boolean) => void;
  setProxyUrl: (proxyUrl: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      closeToTray: true,
      notificationsEnabled: true,
      theme: "dark",
      useProxy: false,
      proxyUrl: "",
      setCloseToTray: (enabled) => set({ closeToTray: enabled }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
      setUseProxy: (enabled) => set({ useProxy: enabled }),
      setProxyUrl: (proxyUrl) => set({ proxyUrl })
    }),
    {
      name: "warframe-price-viewer-settings",
      version: 5,
      migrate: (persistedState) => ({
        ...(persistedState as Partial<SettingsState>),
        closeToTray: (persistedState as Partial<SettingsState>)?.closeToTray ?? true,
        notificationsEnabled: (persistedState as Partial<SettingsState>)?.notificationsEnabled ?? true,
        theme: (persistedState as Partial<SettingsState>)?.theme ?? "dark",
        useProxy: (persistedState as Partial<SettingsState>)?.useProxy ?? false,
        proxyUrl: (persistedState as Partial<SettingsState>)?.proxyUrl ?? ""
      })
    }
  )
);
