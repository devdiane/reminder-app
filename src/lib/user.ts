/**
 * Utility functions for managing user session via Telegram
 */

const USER_ID_KEY = "reminder_userId";
const USER_NAME_KEY = "reminder_userName";

/**
 * Save user ID to localStorage
 */
export function setUserId(userId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_ID_KEY, userId);
  }
}

/**
 * Get user ID from localStorage
 */
export function getUserId(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(USER_ID_KEY);
  }
  return null;
}

/**
 * Save user display name to localStorage
 */
export function setUserName(name: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_NAME_KEY, name);
  }
}

/**
 * Get user display name from localStorage
 */
export function getUserName(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(USER_NAME_KEY);
  }
  return null;
}

/**
 * Clear user session
 */
export function clearUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_NAME_KEY);
  }
}

/**
 * Check if user is connected via Telegram
 */
export function isUserConnected(): boolean {
  return !!getUserId();
}
