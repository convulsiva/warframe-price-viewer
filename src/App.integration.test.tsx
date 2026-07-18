import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { itemFixture, itemsFixture, ordersFixture, topOrdersFixture } from "./test/fixtures/api";

function mockFetch(status = 200) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const body = url.endsWith("/items")
      ? itemsFixture
      : url.endsWith("/items/lex_prime_set")
        ? itemFixture
        : url.endsWith("/orders/item/lex_prime_set/top")
          ? topOrdersFixture
          : url.endsWith("/orders/item/lex_prime_set")
            ? ordersFixture
            : { error: "not found" };
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("App integration", () => {
  it("searches an item, loads orders, filters, refreshes, and saves favorite", async () => {
    mockFetch();
    renderApp();

    await userEvent.type(await screen.findByRole("combobox"), "lex");
    await userEvent.click(await screen.findByRole("option", { name: /lex prime set/i }));

    expect(await screen.findByRole("heading", { name: /lex prime set/i })).toBeInTheDocument();
    expect(screen.getByLabelText("45 Ducats")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("5 pt").length).toBeGreaterThan(0));
    expect(screen.getAllByText("3 pt").length).toBeGreaterThan(0);

    await userEvent.selectOptions(screen.getByLabelText(/type/i), "sell");
    expect(screen.getByRole("heading", { name: /best sellers/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /saved/i })).toBeInTheDocument());
    expect(screen.getAllByText("Lex Prime Set").length).toBeGreaterThan(1);

    await userEvent.type(screen.getByLabelText(/lex prime set drop alert price/i), "7");
    await userEvent.type(screen.getByLabelText(/lex prime set rise alert price/i), "15");
    expect(screen.getByLabelText(/lex prime set drop alert price/i)).toHaveValue(7);
    expect(screen.getByLabelText(/lex prime set rise alert price/i)).toHaveValue(15);
  });

  it("shows API errors", async () => {
    mockFetch(429);
    renderApp();
    expect(await screen.findByText(/rate limit/i)).toBeInTheDocument();
  });

  it("toggles notifications and closes settings when clicking outside", async () => {
    mockFetch();
    renderApp();

    const settingsSummary = screen.getByText("Settings");
    await userEvent.click(settingsSummary);
    const settingsMenu = settingsSummary.closest("details");
    expect(settingsMenu).toHaveAttribute("open");

    const notificationsToggle = screen.getByRole("checkbox", { name: /^notifications/i });
    expect(notificationsToggle).toBeChecked();
    await userEvent.click(notificationsToggle);
    expect(notificationsToggle).not.toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: /home/i }));
    expect(settingsMenu).not.toHaveAttribute("open");
  });
});
