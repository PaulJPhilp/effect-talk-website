"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TabItem {
  readonly href: string;
  readonly isLocked: boolean;
  readonly label: string;
}

const tabs: readonly TabItem[] = [
  { label: "EffectPatterns CLI", href: "/cli", isLocked: false },
  { label: "EffectPatterns MCP Server", href: "/mcp", isLocked: false },
  { label: "Effect Tour", href: "/tour", isLocked: false },
  { label: "EffectPatterns Playground", href: "/playground", isLocked: true },
  { label: "EffectTalk Code Review", href: "/code-review", isLocked: true },
];

export function TabsBar() {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <div className="container px-4 md:px-6">
        <div className="flex gap-0 overflow-x-auto" role="tablist">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href === "/tour" && pathname?.startsWith("/tour"));
            return (
              <Link
                aria-selected={isActive}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 font-medium text-sm transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground",
                  tab.isLocked && "opacity-70"
                )}
                href={tab.href}
                key={tab.href}
                role="tab"
              >
                {tab.label}
                {tab.isLocked && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
                {tab.isLocked && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 font-normal text-[10px] text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
