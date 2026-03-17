"use client";

import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { githubLight } from "@codesandbox/sandpack-themes";
import { useSyncExternalStore } from "react";

const subscribeNoop = () => {
  return () => {
    // No external subscription; this only gates rendering to the client.
  };
};

interface TourCodeRunnerProps {
  readonly code: string;
  readonly panelTitle?: string;
  readonly readOnly?: boolean;
}

/**
 * Embedded code runner using Sandpack with Effect.js pre-configured.
 * Replaces static CodeHighlight for runnable tour steps.
 *
 * Note: Sandpack generates random IDs that cause hydration mismatches,
 * so we only render it after the component has mounted on the client.
 */
export function TourCodeRunner({
  code,
  readOnly = false,
  panelTitle = "Code",
}: TourCodeRunnerProps) {
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  // Don't render Sandpack during SSR to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/30">
        <div className="text-muted-foreground text-sm">
          Loading code editor...
        </div>
      </div>
    );
  }

  return (
    <div className="tour-code-runner flex h-full min-h-[500px] w-full flex-col rounded border border-border bg-background shadow-sm">
      <div className="border-b bg-muted/50 px-2 py-1.5 font-medium text-sm">
        {panelTitle}
      </div>
      <SandpackProvider
        customSetup={{
          dependencies: {
            effect: "latest",
            "@effect/schema": "latest",
          },
          entry: "/index.ts",
        }}
        files={{
          "/index.ts": {
            code,
            readOnly,
            active: true,
          },
        }}
        options={{
          autorun: true,
          recompileMode: "immediate",
          recompileDelay: 300,
        }}
        template="vanilla-ts"
        // Readable code font size (14px) with comfortable line height.
        theme={{
          ...githubLight,
          font: { ...githubLight.font, size: "14px", lineHeight: "22px" },
        }}
      >
        <div className="relative flex h-full min-h-[500px] flex-col">
          {/* Off-screen Preview required for bundler to run code and populate Console */}
          <div
            aria-hidden="true"
            className="absolute top-0 -left-[9999px] h-[300px] w-[400px] overflow-hidden"
          >
            <SandpackPreview />
          </div>
          <div className="h-full min-h-0 flex-1">
            <SandpackCodeEditor
              readOnly={readOnly}
              showInlineErrors
              showLineNumbers
              showReadOnly={false}
              showTabs={false}
              wrapContent
            />
          </div>
          <div className="border-y bg-muted/50 px-2 py-1.5 font-medium text-sm dark:text-white">
            Console
          </div>
          <div className="h-[140px] max-h-[140px] overflow-auto">
            <SandpackConsole resetOnPreviewRestart />
          </div>
        </div>
      </SandpackProvider>
    </div>
  );
}
