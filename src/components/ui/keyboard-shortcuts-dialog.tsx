"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { ScrollArea } from "./scroll-area";
import { Badge } from "./badge";
import { useHotkey, formatShortcut, type KeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { Keyboard } from "lucide-react";

interface ShortcutKeys {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: ShortcutKeys;
    description: string;
  }>;
}

const defaultShortcuts: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      {
        keys: { key: "k", ctrl: true },
        description: "Open search / command palette",
      },
      {
        keys: { key: "h", ctrl: true },
        description: "Go to home",
      },
      {
        keys: { key: "/", ctrl: true },
        description: "Focus search",
      },
      {
        keys: { key: "Escape" },
        description: "Close dialog or cancel",
      },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      {
        keys: { key: "n", ctrl: true },
        description: "Create new item",
      },
      {
        keys: { key: "s", ctrl: true },
        description: "Save changes",
      },
      {
        keys: { key: "e", ctrl: true },
        description: "Edit current item",
      },
      {
        keys: { key: "Enter", ctrl: true },
        description: "Submit form",
      },
    ],
  },
  {
    title: "Selection",
    shortcuts: [
      {
        keys: { key: "a", ctrl: true },
        description: "Select all",
      },
      {
        keys: { key: "ArrowUp" },
        description: "Move selection up",
      },
      {
        keys: { key: "ArrowDown" },
        description: "Move selection down",
      },
    ],
  },
  {
    title: "View",
    shortcuts: [
      {
        keys: { key: "b", ctrl: true },
        description: "Toggle sidebar",
      },
      {
        keys: { key: "?", shift: true },
        description: "Show keyboard shortcuts",
      },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shortcuts?: ShortcutGroup[];
}

/**
 * Keyboard shortcuts help dialog
 * Shows all available shortcuts in the application
 */
export function KeyboardShortcutsDialog({
  open: controlledOpen,
  onOpenChange,
  shortcuts = defaultShortcuts,
}: KeyboardShortcutsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  // Register the ? shortcut to open this dialog
  useHotkey("?", () => setOpen?.(true), { shift: true });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {shortcuts.map((group, groupIndex) => (
              <div key={groupIndex}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {formatShortcut(shortcut.keys)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
          Press <Badge variant="outline" className="mx-1">Esc</Badge> to close
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to use the keyboard shortcuts dialog
 */
export function useKeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useHotkey("?", () => setOpen(true), { shift: true });

  return {
    open,
    setOpen,
    KeyboardShortcutsDialog: () => (
      <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
    ),
  };
}

/**
 * Floating button to show keyboard shortcuts
 */
export function KeyboardShortcutsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow z-50"
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (Shift+?)"
      >
        <Keyboard className="h-5 w-5" />
      </button>
      <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
