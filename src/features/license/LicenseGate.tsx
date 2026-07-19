import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../settings/useTheme";
import {
  activateLicenseKey,
  isAuthoritativeLicenseError,
  readableLicenseError,
  refreshLicenseLease,
  verifyLicenseLease
} from "./api";
import { useLicenseStore } from "./store";

const LICENSE_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MINIMUM_FOCUS_REFRESH_MS = 5 * 60 * 1000;

export function LicenseGate({ children }: { children: ReactNode }) {
  useTheme();
  const leaseToken = useLicenseStore((state) => state.leaseToken);
  const status = useLicenseStore((state) => state.status);
  const details = useLicenseStore((state) => state.details);
  const message = useLicenseStore((state) => state.message);
  const setLease = useLicenseStore((state) => state.setLease);
  const setValidation = useLicenseStore((state) => state.setValidation);
  const lastRefreshAttempt = useRef(0);

  const refresh = useCallback(async (token: string): Promise<"ok" | "offline" | "rejected"> => {
    lastRefreshAttempt.current = Date.now();
    try {
      const result = await refreshLicenseLease(token);
      setLease(result.leaseToken, result.details, result.offlineUntil);
      return "ok";
    } catch (error) {
      if (isAuthoritativeLicenseError(error)) {
        const expired = String(error).includes("[LICENSE_EXPIRED]");
        setValidation(expired ? "expired" : "invalid", null, readableLicenseError(error));
        return "rejected";
      }
      return "offline";
    }
  }, [setLease, setValidation]);

  useEffect(() => {
    let cancelled = false;
    async function validateStoredLease() {
      if (!leaseToken) {
        setValidation("unlicensed");
        return;
      }
      setValidation("checking");
      try {
        const result = await verifyLicenseLease(leaseToken);
        if (cancelled) return;
        if (result.status === "valid") {
          setValidation("valid", result.details, "", result.offlineUntil);
          if (lastRefreshAttempt.current === 0) await refresh(leaseToken);
          return;
        }

        const renewal = await refresh(leaseToken);
        if (renewal === "offline" && !cancelled) {
          setValidation(
            "expired",
            result.details,
            "Offline access has ended. Connect to the internet to renew your license session.",
            result.offlineUntil
          );
        }
      } catch (error) {
        if (!cancelled) setValidation("invalid", null, readableLicenseError(error));
      }
    }
    void validateStoredLease();
    return () => {
      cancelled = true;
    };
  }, [leaseToken, refresh, setValidation]);

  useEffect(() => {
    if (status !== "valid" || !leaseToken) return;

    const check = () => {
      if (Date.now() - lastRefreshAttempt.current >= MINIMUM_FOCUS_REFRESH_MS) void refresh(leaseToken);
    };
    const interval = window.setInterval(() => void refresh(leaseToken), LICENSE_REFRESH_INTERVAL_MS);
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
  }, [leaseToken, refresh, status]);

  async function activate(key: string) {
    const normalizedKey = key.trim();
    if (!normalizedKey) return false;
    setValidation("checking");
    try {
      const result = await activateLicenseKey(normalizedKey);
      setLease(result.leaseToken, result.details, result.offlineUntil);
      return true;
    } catch (error) {
      setValidation("invalid", null, readableLicenseError(error));
      return false;
    }
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
            placeholder="WFMK-XXXX-XXXX-XXXX-XXXX-XXXX"
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
