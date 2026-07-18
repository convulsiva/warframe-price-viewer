import { useEffect } from "react";
import { useSettingsStore } from "./store";

export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
}
