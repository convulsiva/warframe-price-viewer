import { invoke } from "@tauri-apps/api/core";
import type * as TauriNotificationModule from "@tauri-apps/plugin-notification";

type NotificationPayload = {
  title: string;
  body: string;
  actionTypeId?: string;
  extra?: Record<string, unknown>;
};

let actionTypesRegistered = false;

export async function sendDesktopNotification(payload: NotificationPayload): Promise<void> {
  if (isTauriRuntime()) {
    const notification = await import("@tauri-apps/plugin-notification");
    const granted = (await notification.isPermissionGranted()) || (await notification.requestPermission()) === "granted";
    if (granted) {
      const whisperCommand = payload.extra?.whisperCommand;
      if (typeof whisperCommand === "string" && whisperCommand.length > 0) {
        await invoke("send_price_alert_notification", {
          title: payload.title,
          body: payload.body,
          whisperCommand
        });
        return;
      }

      notification.sendNotification({ ...payload, autoCancel: true });
    }
    return;
  }

  if (!("Notification" in window)) return;
  const granted = Notification.permission === "granted" || (await Notification.requestPermission()) === "granted";
  if (granted) {
    new Notification(payload.title, { body: payload.body });
  }
}

export async function listenForNotificationActions(onWhisperCommand: (command: string) => Promise<void>): Promise<() => void> {
  if (!isTauriRuntime()) return () => {};

  const notification = await import("@tauri-apps/plugin-notification");
  await registerPriceAlertActions(notification);

  const listener = await notification.onAction(async (payload) => {
    const command = payload.extra?.whisperCommand;
    if (typeof command === "string" && command.length > 0) {
      await onWhisperCommand(command);
    }
  });

  return () => {
    listener.unregister();
  };
}

async function registerPriceAlertActions(notification: typeof TauriNotificationModule): Promise<void> {
  if (actionTypesRegistered) return;
  actionTypesRegistered = true;
  await notification.registerActionTypes([
    {
      id: "price-alert-actions",
      actions: [
        {
          id: "copy-whisper",
          title: "Copy whisper",
          foreground: false
        }
      ]
    }
  ]);
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
