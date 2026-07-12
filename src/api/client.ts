import type { z } from "zod";
import { invoke } from "@tauri-apps/api/core";
import { config } from "../lib/config";
import { ApiError } from "./errors";

type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

function mergeSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", abort, { once: true });
  }
  return controller.signal;
}

export async function requestJson<T>(
  path: string,
  schema: z.ZodSchema<T>,
  options: RequestOptions = {}
): Promise<T> {
  if (isTauriRuntime()) {
    return requestJsonFromTauri(path, schema);
  }

  const timeoutController = new AbortController();
  const timeout = window.setTimeout(() => timeoutController.abort(), options.timeoutMs ?? config.requestTimeoutMs);
  const signals = options.signal ? [options.signal, timeoutController.signal] : [timeoutController.signal];

  try {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        language: config.language,
        platform: config.platform,
        crossplay: String(config.crossplay)
      },
      signal: mergeSignals(signals)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 429) throw new ApiError("rate-limit", "Rate limited", response.status, text);
      if (response.status === 509) throw new ApiError("connection-limit", "Too many connections", response.status, text);
      if (response.status === 404) throw new ApiError("not-found", "Not found", response.status, text);
      if (response.status === 403) throw new ApiError("forbidden", "Forbidden", response.status, text);
      if (response.status >= 500) throw new ApiError("server", "Server error", response.status, text);
      throw new ApiError("unknown", `HTTP ${response.status}`, response.status, text);
    }

    const json: unknown = await response.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      if (import.meta.env.DEV) {
        console.error("API validation failed", parsed.error.flatten());
      }
      throw new ApiError("validation", "Invalid API response", undefined, parsed.error);
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(timeoutController.signal.aborted ? "timeout" : "network", "Request aborted");
    }
    throw new ApiError("network", "Network error", undefined, error);
  } finally {
    window.clearTimeout(timeout);
  }
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

async function requestJsonFromTauri<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const json: unknown = await invoke("fetch_warframe_market", { path });
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      if (import.meta.env.DEV) {
        console.error("Tauri API validation failed", parsed.error.flatten());
      }
      throw new ApiError("validation", "Invalid API response", undefined, parsed.error);
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = String(error);
    if (message.includes("HTTP 429")) throw new ApiError("rate-limit", "Rate limited", 429, message);
    if (message.includes("HTTP 509")) throw new ApiError("connection-limit", "Too many connections", 509, message);
    if (message.includes("HTTP 404")) throw new ApiError("not-found", "Not found", 404, message);
    if (message.includes("HTTP 403")) throw new ApiError("forbidden", "Forbidden", 403, message);
    if (message.includes("HTTP 5")) throw new ApiError("server", "Server error", undefined, message);
    throw new ApiError("network", "Network error", undefined, message);
  }
}
