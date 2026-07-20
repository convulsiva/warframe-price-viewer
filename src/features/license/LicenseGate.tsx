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
import { useI18n } from "../../lib/i18n";

const LICENSE_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MINIMUM_FOCUS_REFRESH_MS = 5 * 60 * 1000;

export function LicenseGate({ children }: { children: ReactNode }) {
  useTheme();
  const { t } = useI18n();
  const leaseToken = useLicenseStore((state) => state.leaseToken);
  const status = useLicenseStore((state) => state.status);
  const details = useLicenseStore((state) => state.details);
  const offlineUntil = useLicenseStore((state) => state.offlineUntil);
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
            t("offlineLicenseEnded"),
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
  }, [leaseToken, refresh, setValidation, t]);

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

  useEffect(() => {
    if (status !== "valid") return;
    const expiration = effectiveExpiration(details?.expiresAt ?? null, offlineUntil);
    if (expiration === null) return;

    const lock = () => {
      setValidation(
        "expired",
        details,
        t("licenseSessionEnded"),
        offlineUntil
      );
    };
    const remaining = expiration - Date.now();
    if (remaining <= 0) {
      lock();
      return;
    }

    const timer = window.setTimeout(lock, remaining);
    return () => window.clearTimeout(timer);
  }, [details, offlineUntil, setValidation, status, t]);

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
  const { t } = useI18n();
  return (
    <main className="license-screen">
      <div className="license-loading" role="status">
        <ShieldCheck size={26} aria-hidden="true" />
        <span>{t("checkingLicense")}</span>
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
  const { language, t } = useI18n();
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
            <h1 id="license-title">{t("licenseRequired")}</h1>
          </div>
        </div>

        <p className="license-intro">
          {status === "expired" ? t("accessEnded") : t("enterLicense")}
        </p>

        {status === "expired" && details && (
          <div className="license-expired">
            <span>{t("expiredLicense")}</span>
            <strong>{details.licenseId}</strong>
            <small>{formatExpiration(details.expiresAt, language, t)}</small>
          </div>
        )}

        {message && <p className="license-error" role="alert">{message}</p>}

        <form className="license-form" onSubmit={submit}>
          <label htmlFor="license-key">{t("licenseKey")}</label>
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
            {submitting ? t("checking") : t("activateLicense")}
          </button>
        </form>

        <p className="license-support">{t("licenseSupport")}</p>
      </section>
    </main>
  );
}

function formatExpiration(expiresAt: string | null, language: "en" | "ru", t: ReturnType<typeof useI18n>["t"]): string {
  if (!expiresAt) return t("lifetimeLicense");
  const date = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(expiresAt));
  return t("expiredAt", { date });
}

function effectiveExpiration(licenseExpiration: string | null, offlineExpiration: string | null): number | null {
  const expirations = [licenseExpiration, offlineExpiration]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  return expirations.length > 0 ? Math.min(...expirations) : null;
}
