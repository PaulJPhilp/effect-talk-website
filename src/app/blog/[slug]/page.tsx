import { Effect } from "effect";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, listBlogSlugs } from "@/lib/blog";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await listBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await Effect.runPromise(
    getBlogPost(slug).pipe(Effect.catchAll(() => Effect.succeed(null)))
  );
  if (!post) {
    return buildMetadata({ title: "Post Not Found" });
  }
  return buildMetadata({
    title: post.title,
    description: post.excerpt ?? undefined,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await Effect.runPromise(
    getBlogPost(slug).pipe(Effect.catchAll(() => Effect.succeed(null)))
  );

  if (!post) {
    notFound();
  }

  return (
    <div className="container max-w-3xl px-4 py-10 md:px-6">
      <Link
        className="mb-6 inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
        href="/blog"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Blog
      </Link>

      <header className="mb-8">
        <h1 className="font-bold text-3xl tracking-tight">{post.title}</h1>
        {post.date && (
          <time
            className="mt-2 block text-muted-foreground text-sm"
            dateTime={post.date}
          >
            {formatDate(post.date)}
          </time>
        )}
      </header>

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
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
