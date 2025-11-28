"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Keyboard shortcut modifiers
 */
export interface ShortcutModifiers {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command key on Mac
}

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut extends ShortcutModifiers {
  key: string;
  callback: (event: KeyboardEvent) => void;
  description?: string;
  /**
   * Whether the shortcut is enabled
   * @default true
   */
  enabled?: boolean;
  /**
   * Prevent default browser behavior
   * @default true
   */
  preventDefault?: boolean;
  /**
   * Stop event propagation
   * @default false
   */
  stopPropagation?: boolean;
}

/**
 * Check if a keyboard event matches the shortcut
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  const key = event.key.toLowerCase();
  const targetKey = shortcut.key.toLowerCase();

  if (key !== targetKey) return false;

  // Check modifiers
  if (shortcut.ctrl && !event.ctrlKey) return false;
  if (!shortcut.ctrl && event.ctrlKey) return false;

  if (shortcut.shift && !event.shiftKey) return false;
  if (!shortcut.shift && event.shiftKey) return false;

  if (shortcut.alt && !event.altKey) return false;
  if (!shortcut.alt && event.altKey) return false;

  if (shortcut.meta && !event.metaKey) return false;
  if (!shortcut.meta && event.metaKey) return false;

  return true;
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcut(
  shortcuts: KeyboardShortcut | KeyboardShortcut[]
) {
  const shortcutsArray = Array.isArray(shortcuts) ? shortcuts : [shortcuts];
  const shortcutsRef = useRef(shortcutsArray);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcutsArray;
  }, [shortcutsArray]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (unless explicitly allowed)
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        // Skip if disabled
        if (shortcut.enabled === false) continue;

        // Skip if typing in input and not explicitly allowed
        if (isInput && !shortcut.key.includes("Escape")) continue;

        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }
          shortcut.callback(event);
          break; // Only trigger first matching shortcut
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}

/**
 * Hook for a single keyboard shortcut with easier API
 */
export function useHotkey(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: Partial<ShortcutModifiers> & {
    enabled?: boolean;
    preventDefault?: boolean;
  } = {}
) {
  useKeyboardShortcut({
    key,
    callback,
    ...options,
  });
}

/**
 * Common keyboard shortcuts
 */
export const COMMON_SHORTCUTS = {
  // Navigation
  goHome: { key: "h", ctrl: true, description: "Go to home" },
  goBack: { key: "[", ctrl: true, description: "Go back" },
  goForward: { key: "]", ctrl: true, description: "Go forward" },

  // Search
  search: { key: "k", ctrl: true, description: "Open search" },
  commandPalette: { key: "k", ctrl: true, shift: true, description: "Command palette" },

  // Actions
  save: { key: "s", ctrl: true, description: "Save" },
  create: { key: "n", ctrl: true, description: "Create new" },
  delete: { key: "Delete", description: "Delete" },
  edit: { key: "e", ctrl: true, description: "Edit" },
  cancel: { key: "Escape", description: "Cancel/Close" },
  submit: { key: "Enter", ctrl: true, description: "Submit form" },

  // Selection
  selectAll: { key: "a", ctrl: true, description: "Select all" },

  // Clipboard
  copy: { key: "c", ctrl: true, description: "Copy" },
  paste: { key: "v", ctrl: true, description: "Paste" },
  cut: { key: "x", ctrl: true, description: "Cut" },

  // Undo/Redo
  undo: { key: "z", ctrl: true, description: "Undo" },
  redo: { key: "y", ctrl: true, description: "Redo" },

  // View
  toggleSidebar: { key: "b", ctrl: true, description: "Toggle sidebar" },
  fullscreen: { key: "f", ctrl: true, description: "Toggle fullscreen" },
  zoomIn: { key: "+", ctrl: true, description: "Zoom in" },
  zoomOut: { key: "-", ctrl: true, description: "Zoom out" },

  // Help
  help: { key: "?", shift: true, description: "Show help" },
} as const;

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: ShortcutModifiers & { key: string }): string {
  const parts: string[] = [];

  // Use platform-specific key names
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  if (shortcut.ctrl) parts.push(isMac ? "⌃" : "Ctrl");
  if (shortcut.alt) parts.push(isMac ? "⌥" : "Alt");
  if (shortcut.shift) parts.push(isMac ? "⇧" : "Shift");
  if (shortcut.meta) parts.push(isMac ? "⌘" : "Win");

  // Format key name
  let keyName = shortcut.key;
  const keyMap: Record<string, string> = {
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Enter: "↵",
    Backspace: "⌫",
    Delete: "Del",
    " ": "Space",
  };
  keyName = keyMap[keyName] || keyName.toUpperCase();

  parts.push(keyName);
  return parts.join(isMac ? "" : "+");
}

/**
 * Keyboard shortcuts registry for documentation
 */
class ShortcutRegistry {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();

  register(id: string, shortcut: KeyboardShortcut) {
    this.shortcuts.set(id, shortcut);
  }

  unregister(id: string) {
    this.shortcuts.delete(id);
  }

  getAll(): Array<[string, KeyboardShortcut]> {
    return Array.from(this.shortcuts.entries());
  }

  getAllByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(
      (s) => s.description?.startsWith(category)
    );
  }
}

export const shortcutRegistry = new ShortcutRegistry();

/**
 * Hook to register shortcuts in the global registry
 */
export function useRegisteredShortcut(
  id: string,
  shortcut: KeyboardShortcut
) {
  useEffect(() => {
    shortcutRegistry.register(id, shortcut);
    return () => shortcutRegistry.unregister(id);
  }, [id, shortcut]);

  useKeyboardShortcut(shortcut);
}
