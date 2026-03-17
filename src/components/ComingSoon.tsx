import { Lock } from "lucide-react";

interface ComingSoonProps {
  readonly description: string;
  readonly title: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 rounded-full bg-muted p-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mb-3 font-bold text-3xl tracking-tight">{title}</h1>
      <p className="mb-8 max-w-md text-muted-foreground">{description}</p>
    </div>
  );
}
