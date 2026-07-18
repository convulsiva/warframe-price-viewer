import { Download, RefreshCw, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { AppUpdater } from "./useAppUpdater";

export function UpdateDialog({ updater }: { updater: AppUpdater }) {
  if (!updater.dialogOpen) return null;

  const busy = updater.status === "downloading" || updater.status === "installing";
  return createPortal(
    <div className="update-modal-backdrop" role="presentation">
      <section className="update-modal" role="dialog" aria-modal="true" aria-labelledby="update-dialog-title">
        <header>
          <div>
            <p className="eyebrow">Software update</p>
            <h2 id="update-dialog-title">Version {updater.updateVersion} is available</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close update dialog" disabled={busy} onClick={updater.dismissDialog}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="update-modal-body">
          <p className="update-version-line">Installed: {updater.currentVersion || "Checking..."}</p>
          <div className="update-notes">
            <strong>What changed</strong>
            <p>{updater.releaseNotes}</p>
          </div>

          {busy && (
            <div className="update-progress" aria-live="polite">
              <div className="update-progress-track">
                <span style={{ width: `${updater.downloadProgress ?? 18}%` }} />
              </div>
              <span>{updater.status === "installing" ? "Installing and restarting..." : updater.downloadProgress === null ? "Downloading..." : `Downloading ${updater.downloadProgress}%`}</span>
            </div>
          )}
          {updater.status === "error" && <p className="update-error">{updater.errorMessage}</p>}
        </div>

        <footer>
          <button className="ghost-button" type="button" disabled={busy} onClick={updater.dismissDialog}>Later</button>
          <button className="primary-button" type="button" disabled={busy} onClick={() => void updater.installUpdate()}>
            {busy ? <RefreshCw className="spin" size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
            {updater.status === "installing" ? "Restarting" : updater.status === "downloading" ? "Downloading" : "Download and install"}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
