import { ClipboardCheck, GitBranch, GraduationCap } from "lucide-react";
import { ConsultingForm } from "@/components/ConsultingForm";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Consulting",
  description:
    "Effect.ts consulting — assessments, migration strategy, and developer training for your team.",
});

const offers = [
  {
    title: "Effect Assessment",
    description:
      "We review your codebase and architecture, then deliver a detailed report with actionable recommendations for adopting or improving your use of Effect.ts.",
    icon: ClipboardCheck,
    tags: ["Architecture Review", "Actionable Report"],
  },
  {
    title: "Migration Strategy",
    description:
      "Get a step-by-step migration plan for moving your TypeScript codebase to Effect.ts — with prioritized phases, risk assessment, and effort estimates.",
    icon: GitBranch,
    tags: ["Step-by-Step Plan", "Risk Assessment"],
  },
  {
    title: "Developer Training",
    description:
      "Hands-on workshops for your engineering team. From beginner fundamentals to advanced patterns — tailored to your codebase and use cases.",
    icon: GraduationCap,
    tags: ["Workshops", "Custom Content"],
  },
] as const;

export default function ConsultingPage() {
  return (
    <div className="container px-4 py-10 md:px-6">
      <div className="mb-12 text-center">
        <h1 className="mb-3 font-bold text-3xl tracking-tight">
          Effect.ts Consulting
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Expert guidance for teams adopting or scaling Effect.ts. From
          architecture reviews to hands-on training.
        </p>
      </div>

      {/* Offers */}
      <div className="mb-16 grid gap-6 md:grid-cols-3">
        {offers.map((offer) => {
          const Icon = offer.icon;
          return (
            <Card className="h-full" key={offer.title}>
              <CardHeader>
                <Icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>{offer.title}</CardTitle>
                <CardDescription className="mt-2">
                  {offer.description}
                </CardDescription>
                <div className="mt-3 flex gap-1.5">
                  {offer.tags.map((tag) => (
                    <Badge className="text-xs" key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Form */}
      <div className="mx-auto max-w-lg">
        <ConsultingForm />
      </div>
    </div>
  );
}
