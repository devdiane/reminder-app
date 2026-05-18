/**
 * Date utility functions for consistent datetime formatting
 * Uses Philippines timezone (Asia/Manila - UTC+8) throughout
 */

// Fixed timezone for consistent display
const TIMEZONE = "Asia/Manila";

/**
 * Format a date to a readable string in Philippines timezone
 * @param date - Date object or ISO date string
 * @returns Formatted string like "May 19, 2026, 1:03 AM"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-PH", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Format just the date portion in Philippines timezone
 * @param date - Date object or ISO date string
 * @returns Formatted date string like "May 19, 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
  });
}

/**
 * Format just the time portion in Philippines timezone
 * @param date - Date object or ISO date string
 * @returns Formatted time string like "1:03 AM"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-PH", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}
