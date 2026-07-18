import { invoke } from "@tauri-apps/api/core";
import { act, render, screen } from "@testing-library/react";
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
  }
};

describe("LicenseGate", () => {
  beforeEach(() => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
    useLicenseStore.setState({ licenseKey: "", status: "checking", details: null, message: "" });
  });

  it("locks the application until a license is provided", async () => {
    render(<LicenseGate><div>Application content</div></LicenseGate>);

    expect(await screen.findByRole("heading", { name: /license required/i })).toBeInTheDocument();
    expect(screen.queryByText("Application content")).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("stores a valid license and unlocks the application", async () => {
    vi.mocked(invoke).mockResolvedValue(validLicense);
    render(<LicenseGate><div>Application content</div></LicenseGate>);

    const input = await screen.findByRole("textbox", { name: /license key/i });
    await userEvent.type(input, "WFM1.test.signature");
    await userEvent.click(screen.getByRole("button", { name: /activate license/i }));

    expect(await screen.findByText("Application content")).toBeInTheDocument();
    expect(useLicenseStore.getState().licenseKey).toBe("WFM1.test.signature");
  });

  it("locks an open application when a repeated check reports expiration", async () => {
    useLicenseStore.setState({ licenseKey: "WFM1.test.signature", status: "checking" });
    vi.mocked(invoke)
      .mockResolvedValueOnce(validLicense)
      .mockResolvedValueOnce({ ...validLicense, status: "expired" });

    render(<LicenseGate><div>Application content</div></LicenseGate>);
    expect(await screen.findByText("Application content")).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("focus")));

    expect(await screen.findByText(/access period has ended/i)).toBeInTheDocument();
    expect(screen.queryByText("Application content")).not.toBeInTheDocument();
  });
});
