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
  leaseToken: string;
  status: LicenseStatus;
  details: LicenseDetails | null;
  offlineUntil: string | null;
  message: string;
  setLease: (leaseToken: string, details: LicenseDetails, offlineUntil: string) => void;
  setValidation: (status: LicenseStatus, details?: LicenseDetails | null, message?: string, offlineUntil?: string | null) => void;
  clearLicense: () => void;
};

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set) => ({
      leaseToken: "",
      status: "checking",
      details: null,
      offlineUntil: null,
      message: "",
      setLease: (leaseToken, details, offlineUntil) => set({ leaseToken, details, offlineUntil, status: "valid", message: "" }),
      setValidation: (status, details = null, message = "", offlineUntil = null) => set({ status, details, message, offlineUntil }),
      clearLicense: () => set({ leaseToken: "", status: "unlicensed", details: null, offlineUntil: null, message: "" })
    }),
    {
      name: "wfmarkettracker-license",
      partialize: (state) => ({ leaseToken: state.leaseToken })
    }
  )
);
