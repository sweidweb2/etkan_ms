import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogDetailSection } from "@/components/public/blogs/blog-detail-section";
import { SITE } from "@/lib/config/site";
import {
  getPublishedBlogBySlugForPublic,
  getSuggestedPublishedBlogs,
  listPublishedBlogsForPublic,
} from "@/services/public/blog.service";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

/** Warm published slugs at build; on-demand ISR still fills new posts. */
export async function generateStaticParams() {
  const posts = await listPublishedBlogsForPublic();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogBySlugForPublic(slug);

  if (!post) {
    return {
      title: `Blog | ${SITE.name}`,
    };
  }

  const title = post.meta_title?.trim() || post.title;
  const description = post.meta_description?.trim() || post.summary;

  return {
    title: `${title} | ${SITE.name}`,
    description,
    openGraph: {
      title,
      description,
      images: post.thumbnail_url ? [{ url: post.thumbnail_url }] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogBySlugForPublic(slug);

  if (!post) {
    notFound();
  }

  const suggested = await getSuggestedPublishedBlogs(post.slug, 4);

  return <BlogDetailSection post={post} suggested={suggested} />;
}
