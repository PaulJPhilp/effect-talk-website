import { SettingsNav } from "@/components/SettingsNav";
import { requireAuth } from "@/services/Auth";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth guard: redirect to sign-in if not logged in
  await requireAuth();

  return (
    <div className="flex w-full flex-col items-center py-10">
      <div className="w-full max-w-3xl px-4 md:px-6">
        <div className="mb-8">
          <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account and preferences.
          </p>
        </div>
        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="w-full shrink-0 md:w-48">
            <SettingsNav />
          </aside>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
