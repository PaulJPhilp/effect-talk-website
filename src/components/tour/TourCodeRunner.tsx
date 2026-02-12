"use client"

import { useSyncExternalStore } from "react"
import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackProvider,
  SandpackPreview,
} from "@codesandbox/sandpack-react"
import { githubLight } from "@codesandbox/sandpack-themes"

interface TourCodeRunnerProps {
  readonly code: string
  readonly readOnly?: boolean
}

/**
 * Embedded code runner using Sandpack with Effect.js pre-configured.
 * Replaces static CodeHighlight for runnable tour steps.
 * 
 * Note: Sandpack generates random IDs that cause hydration mismatches,
 * so we only render it after the component has mounted on the client.
 */
export function TourCodeRunner({ code, readOnly = false }: TourCodeRunnerProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // Don't render Sandpack during SSR to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30">
        <div className="text-sm text-muted-foreground">Loading code editor...</div>
      </div>
    )
  }

  return (
    <div
      className="h-full w-full min-h-[500px] flex flex-col rounded border border-border bg-background shadow-sm tour-code-runner"
    >
      <div className="px-1.5 py-0.5 text-[0.65rem] font-medium border-b bg-muted/50">
        Code
      </div>
      <SandpackProvider
        template="vanilla-ts"
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
        // Light theme with font ~25% smaller than default (13px → 10px).
        theme={{
          ...githubLight,
          font: { ...githubLight.font, size: "10px", lineHeight: "16px" },
        }}
        options={{
          autorun: true,
          recompileMode: "immediate",
          recompileDelay: 300,
        }}
      >
        <div className="relative flex flex-col h-full min-h-[500px]">
          {/* Off-screen Preview required for bundler to run code and populate Console */}
          <div
            className="absolute -left-[9999px] top-0 w-[400px] h-[300px] overflow-hidden"
            aria-hidden="true"
          >
            <SandpackPreview />
          </div>
          <div className="min-h-0 h-full flex-1">
            <SandpackCodeEditor
              showTabs={false}
              showLineNumbers
              showInlineErrors
              wrapContent
              readOnly={readOnly}
              showReadOnly={false}
            />
          </div>
          <div className="px-1.5 py-0.5 text-[0.65rem] font-medium border-y bg-muted/50 dark:text-white">
            Console
          </div>
          <div className="h-[140px] max-h-[140px] overflow-auto">
            <SandpackConsole resetOnPreviewRestart />
          </div>
        </div>
      </SandpackProvider>
    </div>
  )
}
