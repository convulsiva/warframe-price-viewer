type NotificationPayload = {
  title: string;
  body: string;
};

export async function sendDesktopNotification(payload: NotificationPayload): Promise<void> {
  if (isTauriRuntime()) {
    const notification = await import("@tauri-apps/plugin-notification");
    const granted = (await notification.isPermissionGranted()) || (await notification.requestPermission()) === "granted";
    if (granted) {
      notification.sendNotification(payload);
    }
    return;
  }

  if (!("Notification" in window)) return;
  const granted = Notification.permission === "granted" || (await Notification.requestPermission()) === "granted";
  if (granted) {
    new Notification(payload.title, { body: payload.body });
  }
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
