import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export interface KeyboardShortcut {
  key: string;
  modifiers?: ("ctrl" | "cmd" | "alt" | "shift")[];
  description: string;
  action: () => void;
  global?: boolean;
}

function isMac() {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

function matchesModifiers(
  e: KeyboardEvent,
  modifiers: ("ctrl" | "cmd" | "alt" | "shift")[]
): boolean {
  const wantsCtrl = modifiers.includes("ctrl");
  const wantsCmd = modifiers.includes("cmd");
  const wantsAlt = modifiers.includes("alt");
  const wantsShift = modifiers.includes("shift");

  const hasCtrlOrCmd = e.ctrlKey || e.metaKey;

  if (wantsCtrl && !e.ctrlKey) return false;
  if (wantsCmd && !e.metaKey) return false;
  if (wantsAlt && !e.altKey) return false;
  if (wantsShift && !e.shiftKey) return false;

  // If neither ctrl nor cmd explicitly required, but one is pressed,
  // and the other modifier-only keys aren't wanted, still allow
  // Ctrl/Cmd as a generic modifier when specified as such.
  // For simplicity: if no specific ctrl/cmd requested, ensure none pressed.
  // Actually, we support Ctrl+K / Cmd+K interchangeably below.

  if (!wantsCtrl && !wantsCmd && hasCtrlOrCmd) return false;
  if (!wantsAlt && e.altKey) return false;
  if (!wantsShift && e.shiftKey) return false;

  return true;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  const shortcuts: KeyboardShortcut[] = [
    {
      key: "k",
      modifiers: [isMac() ? "cmd" : "ctrl"],
      description: "Schnellsuche / Command Palette öffnen",
      action: () => {
        // Command palette handles its own toggle
        // Dispatch custom event for CommandPalette component
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: isMac(),
            ctrlKey: !isMac(),
            bubbles: true,
          })
        );
      },
      global: true,
    },
    {
      key: "n",
      modifiers: [isMac() ? "cmd" : "ctrl"],
      description: "Neuen Patient anlegen",
      action: () => navigate("/patients?add=true"),
      global: true,
    },
    {
      key: "t",
      modifiers: [isMac() ? "cmd" : "ctrl"],
      description: "Neue Behandlung",
      action: () => navigate("/patients"),
      global: true,
    },
    {
      key: "a",
      modifiers: [isMac() ? "cmd" : "ctrl"],
      description: "Termine öffnen",
      action: () => navigate("/appointments"),
      global: true,
    },
    {
      key: "?",
      modifiers: [],
      description: "Tastaturkürzel anzeigen",
      action: () => setHelpOpen(true),
      global: true,
    },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if inside input/textarea/contenteditable, unless it's '?' without modifiers
      const target = e.target as HTMLElement;
      const tagName = target.tagName?.toLowerCase();
      const isInput =
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable;

      if (isInput && !(e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        return;
      }

      // Don't trigger when dialogs/modals are open (except help toggle)
      const dialogOpen = document.querySelector('[role="dialog"]');
      if (dialogOpen && e.key !== "Escape" && e.key !== "?") return;

      for (const shortcut of shortcuts) {
        if (shortcut.key.toLowerCase() !== e.key.toLowerCase()) continue;
        if (
          shortcut.modifiers?.length &&
          !matchesModifiers(e, shortcut.modifiers)
        ) {
          continue;
        }
        // For shortcuts without modifiers (like '?'), ensure no modifiers pressed
        if (!shortcut.modifiers?.length && (e.ctrlKey || e.metaKey || e.altKey)) {
          continue;
        }

        e.preventDefault();
        e.stopPropagation();
        shortcut.action();
        return;
      }

      // Close help on Escape
      if (e.key === "Escape" && helpOpen) {
        setHelpOpen(false);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shortcuts, helpOpen, navigate]);

  return { shortcuts, helpOpen, setHelpOpen };
}
