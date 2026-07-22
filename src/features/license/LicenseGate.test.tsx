import { invoke } from "@tauri-apps/api/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LicenseGate } from "./LicenseGate";
import { useLicenseStore } from "./store";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const validUntil = new Date(Date.now() + 60_000).toISOString();

const validLicense = {
  status: "valid" as const,
  details: {
    licenseId: "WFM-TEST",
    customer: "test@example.com",
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: validUntil
  },
  offlineUntil: validUntil
};

const validLease = {
  leaseToken: "WFMLEASE1.test.signature",
  details: validLicense.details,
  offlineUntil: validLicense.offlineUntil
};

describe("LicenseGate", () => {
  beforeEach(() => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
    vi.mocked(invoke).mockReset();
    useLicenseStore.setState({ leaseToken: "", status: "checking", details: null, offlineUntil: null, message: "" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks the application until a license is provided", async () => {
    render(<LicenseGate><div>Application content</div></LicenseGate>);

    expect(await screen.findByRole("heading", { name: /license required/i })).toBeInTheDocument();
    expect(screen.queryByText("Application content")).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("stores a valid license and unlocks the application", async () => {
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "verify_server_license") return validLicense;
      return validLease;
    });
    render(<LicenseGate><div>Application content</div></LicenseGate>);

    const input = await screen.findByRole("textbox", { name: /license key/i });
    await userEvent.type(input, "WFMK-TEST-TEST-TEST-TEST-TEST");
    await userEvent.click(screen.getByRole("button", { name: /activate license/i }));

    expect(await screen.findByText("Application content")).toBeInTheDocument();
    expect(useLicenseStore.getState().leaseToken).toBe(validLease.leaseToken);
  });

  it("locks a stored license when the server reports that it was revoked", async () => {
    useLicenseStore.setState({ leaseToken: validLease.leaseToken, status: "checking" });
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "verify_server_license") return validLicense;
      throw new Error("[LICENSE_REVOKED] This license has been disabled.");
    });

    render(<LicenseGate><div>Application content</div></LicenseGate>);
    expect(await screen.findByText(/license has been disabled/i)).toBeInTheDocument();
    expect(screen.queryByText("Application content")).not.toBeInTheDocument();
  });

  it("locks the application exactly when the local license session expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00.000Z"));
    const expiration = "2026-07-19T12:00:01.000Z";
    const expiringVerification = {
      ...validLicense,
      details: { ...validLicense.details, expiresAt: expiration },
      offlineUntil: expiration
    };
    const expiringLease = {
      leaseToken: validLease.leaseToken,
      details: expiringVerification.details,
      offlineUntil: expiration
    };
    useLicenseStore.setState({ leaseToken: validLease.leaseToken, status: "checking" });
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "verify_server_license") return expiringVerification;
      return expiringLease;
    });

    render(<LicenseGate><div>Application content</div></LicenseGate>);
    await act(async () => Promise.resolve());
    await act(async () => Promise.resolve());
    expect(screen.getByText("Application content")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.queryByText("Application content")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /license required/i })).toBeInTheDocument();
    expect(useLicenseStore.getState().status).toBe("expired");
  });
});
