import { Effect } from "effect"
import Link from "next/link"
import { listBlogPosts } from "@/lib/blog"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Blog",
  description: "Announcements and articles about Effect.ts and the Effect ecosystem.",
})

export const revalidate = 300

export default async function BlogPage() {
  const posts = await Effect.runPromise(
    listBlogPosts().pipe(Effect.catchAll(() => Effect.succeed([] as const)))
  )

  return (
    <div className="container px-4 md:px-6 py-10 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Blog</h1>
      <p className="text-muted-foreground mb-8">
        Announcements and articles about Effect.ts.
      </p>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet. Check back soon.</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <h2 className="font-semibold group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                {post.date && (
                  <time
                    dateTime={post.date}
                    className="text-xs text-muted-foreground mt-1 block"
                  >
                    {formatDate(post.date)}
                  </time>
                )}
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
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
