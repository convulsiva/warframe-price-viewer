import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingsState = {
  closeToTray: boolean;
  setCloseToTray: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      closeToTray: true,
      setCloseToTray: (enabled) => set({ closeToTray: enabled })
    }),
    {
      name: "warframe-price-viewer-settings",
      version: 2,
      migrate: (persistedState) => ({
        ...(persistedState as Partial<SettingsState>),
        closeToTray: true
      })
    }
  )
);
