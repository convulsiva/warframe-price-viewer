import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSettingsStore } from "./store";
import { currentLanguage } from "../../lib/i18n";

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const INITIAL_UPDATE_CHECK_DELAY_MS = 4000;

export type UpdaterStatus = "idle" | "checking" | "available" | "downloading" | "installing" | "current" | "error";

export type AppUpdater = {
  currentVersion: string;
  dialogOpen: boolean;
  downloadProgress: number | null;
  errorMessage: string;
  releaseNotes: string;
  status: UpdaterStatus;
  updateVersion: string;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  dismissDialog: () => void;
  installUpdate: () => Promise<void>;
  openDialog: () => void;
};

export function useAppUpdater(): AppUpdater {
  const [currentVersion, setCurrentVersion] = useState("");
  const [status, setStatus] = useState<UpdaterStatus>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const checkingRef = useRef(false);
  const installingRef = useRef(false);

  const checkForUpdates = useCallback(async (manual = true) => {
    if (!isTauriRuntime() || checkingRef.current || installingRef.current) return;

    if (update) {
      setStatus("available");
      if (manual) setDialogOpen(true);
      return;
    }

    checkingRef.current = true;
    setStatus("checking");
    setErrorMessage("");

    try {
      const availableUpdate = await check({ proxy: getUpdaterProxy() });
      if (availableUpdate) {
        setUpdate(availableUpdate);
        setStatus("available");
        setDialogOpen(true);
      } else {
        setStatus(manual ? "current" : "idle");
      }
    } catch (error) {
      if (manual) {
        setStatus("error");
        setErrorMessage(readableUpdaterError(error));
      } else {
        setStatus("idle");
        setErrorMessage("");
        setDialogOpen(false);
      }
    } finally {
      checkingRef.current = false;
    }
  }, [update]);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    void getVersion().then(setCurrentVersion).catch(() => setCurrentVersion("Unknown"));
    const initialCheck = window.setTimeout(() => void checkForUpdates(false), INITIAL_UPDATE_CHECK_DELAY_MS);
    const interval = window.setInterval(() => void checkForUpdates(false), UPDATE_CHECK_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
    };
  }, [checkForUpdates]);

  const installUpdate = useCallback(async () => {
    if (!update || status === "downloading" || status === "installing") return;

    let downloadedBytes = 0;
    let totalBytes: number | undefined;
    setStatus("downloading");
    installingRef.current = true;
    setDownloadProgress(0);
    setErrorMessage("");

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength;
          setDownloadProgress(totalBytes ? 0 : null);
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          setDownloadProgress(totalBytes ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : null);
        } else {
          setStatus("installing");
          setDownloadProgress(100);
        }
      });
      setStatus("installing");
      await relaunch();
    } catch (error) {
      installingRef.current = false;
      setStatus("error");
      setErrorMessage(readableUpdaterError(error));
    }
  }, [status, update]);

  return {
    currentVersion,
    dialogOpen,
    downloadProgress,
    errorMessage,
    releaseNotes: update?.body?.trim() || (currentLanguage() === "ru" ? "Обновление включает улучшения и исправления." : "This update includes improvements and fixes."),
    status,
    updateVersion: update?.version ?? "",
    checkForUpdates,
    dismissDialog: () => setDialogOpen(false),
    installUpdate,
    openDialog: () => update && setDialogOpen(true)
  };
}

function getUpdaterProxy(): string | undefined {
  const { proxyUrl, useProxy } = useSettingsStore.getState();
  const value = proxyUrl.trim();
  if (!useProxy || !value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const parts = value.split(":");
  if (parts.length === 2) return `http://${parts[0]}:${parts[1]}`;
  if (parts.length === 4) return `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
  return value;
}

function readableUpdaterError(error: unknown): string {
  const russian = currentLanguage() === "ru";
  const message = String(error).replace(/^Error:\s*/i, "");
  if (/valid release json|release json|update endpoint/i.test(message)) {
    return russian ? "Информация об обновлении временно недоступна. Попробуйте позже." : "Update information is temporarily unavailable. Please try again later.";
  }
  if (/404|not found/i.test(message)) return russian ? "Информация об обновлении пока недоступна." : "Update information is not available yet.";
  if (/network|connect|dns|request|timed out/i.test(message)) return russian ? "Не удалось подключиться к сервису обновлений." : "Could not reach the update service.";
  return message || (russian ? "Не удалось проверить обновления." : "Update check failed.");
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
