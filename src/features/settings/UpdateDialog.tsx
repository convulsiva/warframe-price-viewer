import { Download, RefreshCw, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { AppUpdater } from "./useAppUpdater";
import { useI18n } from "../../lib/i18n";

export function UpdateDialog({ updater }: { updater: AppUpdater }) {
  const { t } = useI18n();
  if (!updater.dialogOpen) return null;

  const busy = updater.status === "downloading" || updater.status === "installing";
  return createPortal(
    <div className="update-modal-backdrop" role="presentation">
      <section className="update-modal" role="dialog" aria-modal="true" aria-labelledby="update-dialog-title">
        <header>
          <div>
            <p className="eyebrow">{t("softwareUpdate")}</p>
            <h2 id="update-dialog-title">{t("updateAvailable", { version: updater.updateVersion })}</h2>
          </div>
          <button className="icon-button" type="button" aria-label={t("closeUpdate")} disabled={busy} onClick={updater.dismissDialog}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="update-modal-body">
          <p className="update-version-line">{t("installed", { version: updater.currentVersion || t("checking") })}</p>
          <div className="update-notes">
            <strong>{t("whatChanged")}</strong>
            <p>{updater.releaseNotes}</p>
          </div>

          {busy && (
            <div className="update-progress" aria-live="polite">
              <div className="update-progress-track">
                <span style={{ width: `${updater.downloadProgress ?? 18}%` }} />
              </div>
              <span>{updater.status === "installing" ? t("installingRestarting") : updater.downloadProgress === null ? t("downloading") : t("downloadingProgress", { value: updater.downloadProgress })}</span>
            </div>
          )}
          {updater.status === "error" && <p className="update-error">{updater.errorMessage}</p>}
        </div>

        <footer>
          <button className="ghost-button" type="button" disabled={busy} onClick={updater.dismissDialog}>{t("later")}</button>
          <button className="primary-button" type="button" disabled={busy} onClick={() => void updater.installUpdate()}>
            {busy ? <RefreshCw className="spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
            {updater.status === "installing" ? t("restarting") : updater.status === "downloading" ? t("downloading") : t("downloadInstall")}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
