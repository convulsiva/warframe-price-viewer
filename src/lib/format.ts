import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import type { AppLanguage } from "./i18n";
import { currentLanguage } from "./i18n";

export function formatPlatinum(value: number | null): string {
  return value === null ? "N/A" : `${value.toLocaleString()} pt`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}

export function formatDateTime(value: string | null, language: AppLanguage = currentLanguage()): string {
  if (!value) return language === "ru" ? "Неизвестно" : "Unknown";
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return language === "ru" ? "Неизвестно" : "Unknown";
  return date.toLocaleString(language === "ru" ? "ru-RU" : "en-US");
}

export function formatRelative(value: string | null, language: AppLanguage = currentLanguage()): string {
  if (!value) return language === "ru" ? "неизвестно" : "Unknown";
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return language === "ru" ? "неизвестно" : "Unknown";
  const distance = formatDistanceToNowStrict(date, { locale: language === "ru" ? ru : enUS });
  return language === "ru" ? `${distance} назад` : `${distance} ago`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
