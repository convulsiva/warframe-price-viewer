import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { useTheme } from "../settings/useTheme";
import { verifyLicenseKey } from "./api";
import { useLicenseStore } from "./store";

const LICENSE_CHECK_INTERVAL_MS = 60_000;

export function LicenseGate({ children }: { children: ReactNode }) {
  useTheme();
  const licenseKey = useLicenseStore((state) => state.licenseKey);
  const status = useLicenseStore((state) => state.status);
  const details = useLicenseStore((state) => state.details);
  const message = useLicenseStore((state) => state.message);
  const setLicenseKey = useLicenseStore((state) => state.setLicenseKey);
  const setValidation = useLicenseStore((state) => state.setValidation);

  const validate = useCallback(async (key: string, showLoading = false) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      setValidation("unlicensed");
      return false;
    }
    if (showLoading) setValidation("checking");

    try {
      const result = await verifyLicenseKey(normalizedKey);
      if (result.status === "expired") {
        setValidation("expired", result.details, "This license has expired.");
        return false;
      }
      setValidation("valid", result.details);
      return true;
    } catch (error) {
      setValidation("invalid", null, readableError(error));
      return false;
    }
  }, [setValidation]);

  useEffect(() => {
    void validate(licenseKey, true);
  }, [licenseKey, validate]);

  useEffect(() => {
    if (status !== "valid" || !licenseKey) return;

    const check = () => void validate(licenseKey);
    const interval = window.setInterval(check, LICENSE_CHECK_INTERVAL_MS);
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [licenseKey, status, validate]);

  async function activate(key: string) {
    const normalizedKey = key.trim();
    const activated = await validate(normalizedKey, true);
    if (activated) setLicenseKey(normalizedKey);
    return activated;
  }

  if (status === "valid") return children;
  if (status === "checking") return <LicenseLoading />;
  return <ActivationScreen status={status} details={details} message={message} onActivate={activate} />;
}

function LicenseLoading() {
  return (
    <main className="license-screen">
      <div className="license-loading" role="status">
        <ShieldCheck size={26} aria-hidden="true" />
        <span>Checking license...</span>
      </div>
    </main>
  );
}

type ActivationScreenProps = {
  status: "unlicensed" | "expired" | "invalid";
  details: ReturnType<typeof useLicenseStore.getState>["details"];
  message: string;
  onActivate: (licenseKey: string) => Promise<boolean>;
};

function ActivationScreen({ status, details, message, onActivate }: ActivationScreenProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!licenseKey.trim()) return;
    setSubmitting(true);
    await onActivate(licenseKey);
    setSubmitting(false);
  }

  return (
    <main className="license-screen">
      <section className="license-panel" aria-labelledby="license-title">
        <div className="license-brand">
          <span className="license-mark"><LockKeyhole size={24} aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">WFMarketTracker</p>
            <h1 id="license-title">License required</h1>
          </div>
        </div>

        <p className="license-intro">
          {status === "expired" ? "Your access period has ended. Enter a new license to continue." : "Enter your license key to unlock the application."}
        </p>

        {status === "expired" && details && (
          <div className="license-expired">
            <span>Expired license</span>
            <strong>{details.licenseId}</strong>
            <small>{formatExpiration(details.expiresAt)}</small>
          </div>
        )}

        {message && <p className="license-error" role="alert">{message}</p>}

        <form className="license-form" onSubmit={submit}>
          <label htmlFor="license-key">License key</label>
          <textarea
            id="license-key"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="WFM1..."
            value={licenseKey}
            onChange={(event) => setLicenseKey(event.target.value)}
          />
          <button className="primary-button" type="submit" disabled={submitting || !licenseKey.trim()}>
            <KeyRound size={17} aria-hidden="true" />
            {submitting ? "Checking..." : "Activate license"}
          </button>
        </form>

        <p className="license-support">Contact the seller if you need a license or renewal.</p>
      </section>
    </main>
  );
}

function formatExpiration(expiresAt: string | null): string {
  if (!expiresAt) return "Lifetime license";
  return `Expired ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(expiresAt))}`;
}

function readableError(error: unknown): string {
  const message = String(error instanceof Error ? error.message : error);
  return message && message !== "undefined" ? message : "This license key is not valid.";
}
