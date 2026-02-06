import { Lock } from "lucide-react"

interface ComingSoonProps {
  readonly title: string
  readonly description: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 rounded-full bg-muted p-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">{title}</h1>
      <p className="text-muted-foreground max-w-md mb-8">{description}</p>
    </div>
  )
}
