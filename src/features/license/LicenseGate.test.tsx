import { invoke } from "@tauri-apps/api/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LicenseGate } from "./LicenseGate";
import { useLicenseStore } from "./store";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const validLicense = {
  status: "valid" as const,
  details: {
    licenseId: "WFM-TEST",
    customer: "test@example.com",
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2027-01-01T00:00:00.000Z"
  },
  offlineUntil: "2026-07-22T00:00:00.000Z"
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
});
