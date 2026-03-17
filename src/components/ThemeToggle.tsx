"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const subscribeNoop = () => {
  return () => {
    // No external subscription; this only gates rendering to the client.
  };
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const iconClass = "h-4 w-4 text-foreground";

  if (!isMounted) {
    return (
      <Button className="h-8 w-8 p-0" disabled size="sm" variant="ghost">
        <Sun className={iconClass} />
        <span className="sr-only">Theme</span>
      </Button>
    );
  }

  const currentIcon =
    theme === "light" ? (
      <Sun className={iconClass} />
    ) : theme === "dark" ? (
      <Moon className={iconClass} />
    ) : (
      <Monitor className={iconClass} />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
          {currentIcon}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
