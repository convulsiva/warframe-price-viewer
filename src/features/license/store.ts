import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LicenseDetails = {
  licenseId: string;
  customer: string;
  issuedAt: string;
  expiresAt: string | null;
};

export type LicenseStatus = "checking" | "unlicensed" | "valid" | "expired" | "invalid";

type LicenseState = {
  licenseKey: string;
  status: LicenseStatus;
  details: LicenseDetails | null;
  message: string;
  setLicenseKey: (licenseKey: string) => void;
  setValidation: (status: LicenseStatus, details?: LicenseDetails | null, message?: string) => void;
  clearLicense: () => void;
};

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set) => ({
      licenseKey: "",
      status: "checking",
      details: null,
      message: "",
      setLicenseKey: (licenseKey) => set({ licenseKey }),
      setValidation: (status, details = null, message = "") => set({ status, details, message }),
      clearLicense: () => set({ licenseKey: "", status: "unlicensed", details: null, message: "" })
    }),
    {
      name: "wfmarkettracker-license",
      partialize: (state) => ({ licenseKey: state.licenseKey })
    }
  )
);
