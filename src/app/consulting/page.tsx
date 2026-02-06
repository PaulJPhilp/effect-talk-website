import { ConsultingForm } from "@/components/ConsultingForm"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardCheck, GitBranch, GraduationCap } from "lucide-react"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Consulting",
  description:
    "Effect.ts consulting — assessments, migration strategy, and developer training for your team.",
})

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
] as const

export default function ConsultingPage() {
  return (
    <div className="container px-4 md:px-6 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Effect.ts Consulting
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Expert guidance for teams adopting or scaling Effect.ts. From
          architecture reviews to hands-on training.
        </p>
      </div>

      {/* Offers */}
      <div className="grid gap-6 md:grid-cols-3 mb-16">
        {offers.map((offer) => {
          const Icon = offer.icon
          return (
            <Card key={offer.title} className="h-full">
              <CardHeader>
                <Icon className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>{offer.title}</CardTitle>
                <CardDescription className="mt-2">
                  {offer.description}
                </CardDescription>
                <div className="flex gap-1.5 mt-3">
                  {offer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto">
        <ConsultingForm />
      </div>
    </div>
  )
}
