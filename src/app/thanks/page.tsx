import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Thank You",
  description: "Thanks for reaching out!",
  noIndex: true,
})

export default function ThanksPage() {
  return (
    <div className="container px-4 md:px-6 py-20 flex flex-col items-center text-center">
      <div className="mb-6 rounded-full bg-green-100 dark:bg-green-900/30 p-4">
        <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">Thank you!</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We&apos;ve received your submission. We&apos;ll be in touch soon.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/patterns">Browse Patterns</Link>
        </Button>
      </div>
    </div>
  )
}
