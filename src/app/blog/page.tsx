import { Effect } from "effect";
import Link from "next/link";
import { listBlogPosts } from "@/lib/blog";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Blog",
  description:
    "Announcements and articles about Effect.ts and the Effect ecosystem.",
});

export const revalidate = 300;

export default async function BlogPage() {
  const posts = await Effect.runPromise(
    listBlogPosts().pipe(Effect.catchAll(() => Effect.succeed([] as const)))
  );

  return (
    <div className="container max-w-2xl px-4 py-10 md:px-6">
      <h1 className="mb-2 font-bold text-3xl tracking-tight">Blog</h1>
      <p className="mb-8 text-muted-foreground">
        Announcements and articles about Effect.ts.
      </p>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet. Check back soon.</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                className="group block rounded-lg border p-4 transition-colors hover:bg-muted/50"
                href={`/blog/${post.slug}`}
              >
                <h2 className="font-semibold transition-colors group-hover:text-primary">
                  {post.title}
                </h2>
                {post.date && (
                  <time
                    className="mt-1 block text-muted-foreground text-xs"
                    dateTime={post.date}
                  >
                    {formatDate(post.date)}
                  </time>
                )}
                {post.excerpt && (
                  <p className="mt-2 text-muted-foreground text-sm">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
