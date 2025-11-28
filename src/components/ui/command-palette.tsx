"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./command";
import { useHotkey } from "@/hooks/use-keyboard-shortcut";
import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  Users,
  Settings,
  Search,
  Clock,
  DollarSign,
  Building,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";

export interface CommandPaletteAction {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
  group?: string;
}

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  actions?: CommandPaletteAction[];
}

/**
 * Default navigation actions
 */
function useDefaultActions(router: ReturnType<typeof useRouter>): CommandPaletteAction[] {
  return useMemo(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        description: "View dashboard and analytics",
        icon: LayoutDashboard,
        keywords: ["home", "overview", "analytics"],
        action: () => router.push("/dashboard"),
        group: "Navigation",
      },
      {
        id: "invoices",
        label: "Invoices",
        description: "View and manage invoices",
        icon: FileText,
        keywords: ["billing", "payment"],
        action: () => router.push("/invoices"),
        group: "Navigation",
      },
      {
        id: "projects",
        label: "Projects",
        description: "View and manage projects",
        icon: FolderOpen,
        keywords: ["contracts", "work"],
        action: () => router.push("/projects"),
        group: "Navigation",
      },
      {
        id: "timesheets",
        label: "Timesheets",
        description: "View and upload timesheets",
        icon: Clock,
        keywords: ["hours", "time tracking"],
        action: () => router.push("/timesheets"),
        group: "Navigation",
      },
      {
        id: "employees",
        label: "Employees",
        description: "Manage employee information",
        icon: Users,
        keywords: ["staff", "team", "people"],
        action: () => router.push("/employees"),
        group: "Navigation",
      },
      {
        id: "companies",
        label: "Companies",
        description: "Manage company information",
        icon: Building,
        keywords: ["clients", "organizations"],
        action: () => router.push("/companies"),
        group: "Navigation",
      },
      {
        id: "departments",
        label: "Departments",
        description: "View departments",
        icon: FileSpreadsheet,
        keywords: ["org", "organization"],
        action: () => router.push("/departments"),
        group: "Navigation",
      },
      {
        id: "settings",
        label: "Settings",
        description: "Application settings",
        icon: Settings,
        keywords: ["preferences", "config"],
        action: () => router.push("/settings"),
        group: "Settings",
      },
    ],
    [router]
  );
}

/**
 * Command Palette for quick navigation and actions
 * Triggered with Ctrl+K or Cmd+K
 */
export function CommandPalette({
  open: controlledOpen,
  onOpenChange,
  actions: customActions,
}: CommandPaletteProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const defaultActions = useDefaultActions(router);
  const actions = customActions || defaultActions;

  // Register Ctrl+K / Cmd+K shortcut
  useHotkey("k", () => setOpen?.(true), { ctrl: true });

  // Group actions by category
  const groupedActions = useMemo(() => {
    const groups = new Map<string, CommandPaletteAction[]>();

    actions.forEach((action) => {
      const group = action.group || "Actions";
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)?.push(action);
    });

    return Array.from(groups.entries());
  }, [actions]);

  // Filter actions based on search
  const filteredGroups = useMemo(() => {
    if (!search) return groupedActions;

    const searchLower = search.toLowerCase();
    return groupedActions
      .map(([group, groupActions]) => {
        const filtered = groupActions.filter((action) => {
          const matchLabel = action.label.toLowerCase().includes(searchLower);
          const matchDescription = action.description?.toLowerCase().includes(searchLower);
          const matchKeywords = action.keywords?.some((kw) =>
            kw.toLowerCase().includes(searchLower)
          );
          return matchLabel || matchDescription || matchKeywords;
        });
        return [group, filtered] as [string, CommandPaletteAction[]];
      })
      .filter(([, groupActions]) => groupActions.length > 0);
  }, [groupedActions, search]);

  const handleSelect = (action: CommandPaletteAction) => {
    setOpen?.(false);
    setSearch("");
    action.action();
  };

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-2xl">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <Command>
          <CommandInput
            placeholder="Search for actions and pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {filteredGroups.map(([group, groupActions], groupIndex) => (
              <div key={group}>
                <CommandGroup>
              {groupActions.map((action) => {
                const Icon = action.icon || Search;
                return (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleSelect(action)}
                    className="flex items-center gap-2 px-2 py-3"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{action.label}</div>
                      {action.description && (
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      )}
                    </div>
                    {action.shortcut && (
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        {action.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                );
              })}
              </CommandGroup>
              {groupIndex < filteredGroups.length - 1 && <CommandSeparator />}
            </div>
          ))}
        </CommandList>
      </Command>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to use command palette
 */
export function useCommandPalette(customActions?: CommandPaletteAction[]) {
  const [open, setOpen] = useState(false);

  useHotkey("k", () => setOpen(true), { ctrl: true });

  return {
    open,
    setOpen,
    CommandPalette: () => (
      <CommandPalette open={open} onOpenChange={setOpen} actions={customActions} />
    ),
  };
}

/**
 * Recent items tracker for command palette
 */
export class RecentItems {
  private static readonly STORAGE_KEY = "command-palette-recent";
  private static readonly MAX_ITEMS = 5;

  static add(action: CommandPaletteAction): void {
    if (typeof window === "undefined") return;

    const recent = this.get();
    const filtered = recent.filter((item) => item.id !== action.id);
    const updated = [action, ...filtered].slice(0, this.MAX_ITEMS);

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  static get(): CommandPaletteAction[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

/**
 * Enhanced command palette with recent items
 */
export function EnhancedCommandPalette(props: CommandPaletteProps) {
  const [recentItems, setRecentItems] = useState<CommandPaletteAction[]>([]);

  useEffect(() => {
    setRecentItems(RecentItems.get());
  }, []);

  const allActions = useMemo(() => {
    const actions = props.actions || [];

    if (recentItems.length === 0) return actions;

    // Add recent items as a separate group
    const recentWithGroup = recentItems.map((item) => ({
      ...item,
      group: "Recent",
    }));

    return [...recentWithGroup, ...actions];
  }, [props.actions, recentItems]);

  const handleActionSelect = (action: CommandPaletteAction) => {
    RecentItems.add(action);
    setRecentItems(RecentItems.get());
  };

  return <CommandPalette {...props} actions={allActions} />;
}
