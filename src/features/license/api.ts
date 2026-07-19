import { invoke } from "@tauri-apps/api/core";
import type { LicenseDetails } from "./store";

export type LicenseVerification = {
  status: "valid" | "expired";
  details: LicenseDetails;
  offlineUntil: string | null;
};

export type LicenseLease = {
  leaseToken: string;
  details: LicenseDetails;
  offlineUntil: string;
};

export async function activateLicenseKey(licenseKey: string): Promise<LicenseLease> {
  if (!isTauriRuntime()) {
    return {
      leaseToken: "WFMLEASE1.development.signature",
      details: {
        licenseId: "WFM-DEVELOPMENT",
        customer: "Local development",
        issuedAt: new Date(0).toISOString(),
        expiresAt: null
      },
      offlineUntil: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    };
  }

  return invoke<LicenseLease>("activate_server_license", { licenseKey });
}

export async function verifyLicenseLease(leaseToken: string): Promise<LicenseVerification> {
  if (!isTauriRuntime()) return developmentVerification();
  return invoke<LicenseVerification>("verify_server_license", { leaseToken });
}

export async function refreshLicenseLease(leaseToken: string): Promise<LicenseLease> {
  if (!isTauriRuntime()) {
    const verification = developmentVerification();
    return {
      leaseToken,
      details: verification.details,
      offlineUntil: verification.offlineUntil as string
    };
  }

  return invoke<LicenseLease>("refresh_server_license", { leaseToken });
}

export function isAuthoritativeLicenseError(error: unknown): boolean {
  const message = String(error instanceof Error ? error.message : error);
  return ["LICENSE_REVOKED", "LICENSE_EXPIRED", "DEVICE_MISMATCH", "INVALID_LICENSE", "INVALID_LEASE"].some((code) =>
    message.includes(`[${code}]`)
  );
}

export function readableLicenseError(error: unknown): string {
  const message = String(error instanceof Error ? error.message : error).replace(/^\[[A-Z_]+\]\s*/, "");
  return message && message !== "undefined" ? message : "This license key is not valid.";
}

function developmentVerification(): LicenseVerification {
  return {
    status: "valid",
    details: {
      licenseId: "WFM-DEVELOPMENT",
      customer: "Local development",
      issuedAt: new Date(0).toISOString(),
      expiresAt: null
    },
    offlineUntil: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
  };
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
