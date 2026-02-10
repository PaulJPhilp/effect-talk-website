import { Effect } from "effect"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getBlogPost, listBlogSlugs } from "@/lib/blog"
import { buildMetadata } from "@/lib/seo"
import type { Metadata } from "next"

export const revalidate = 300

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await listBlogSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await Effect.runPromise(
    getBlogPost(slug).pipe(Effect.catchAll(() => Effect.succeed(null)))
  )
  if (!post) {
    return buildMetadata({ title: "Post Not Found" })
  }
  return buildMetadata({
    title: post.title,
    description: post.excerpt ?? undefined,
  })
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await Effect.runPromise(
    getBlogPost(slug).pipe(Effect.catchAll(() => Effect.succeed(null)))
  )

  if (!post) {
    notFound()
  }

  return (
    <div className="container px-4 md:px-6 py-10 max-w-3xl">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Blog
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
        {post.date && (
          <time
            dateTime={post.date}
            className="text-sm text-muted-foreground mt-2 block"
          >
            {formatDate(post.date)}
          </time>
        )}
      </header>

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML from effect-mdx compileMdxToHtml
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return iso
  }
}
