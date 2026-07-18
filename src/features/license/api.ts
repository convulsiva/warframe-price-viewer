import { invoke } from "@tauri-apps/api/core";
import type { LicenseDetails } from "./store";

export type LicenseVerification = {
  status: "valid" | "expired";
  details: LicenseDetails;
};

export async function verifyLicenseKey(licenseKey: string): Promise<LicenseVerification> {
  if (!isTauriRuntime()) {
    return {
      status: "valid",
      details: {
        licenseId: "WFM-DEVELOPMENT",
        customer: "Local development",
        issuedAt: new Date(0).toISOString(),
        expiresAt: null
      }
    };
  }

  return invoke<LicenseVerification>("verify_license", { licenseKey });
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}
