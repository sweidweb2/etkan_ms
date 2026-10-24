import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogDetailSection } from "@/components/public/blogs/blog-detail-section";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
} from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PAGE_SEO } from "@/lib/seo/page-seo";
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
      title: PAGE_SEO.blogs.title,
    };
  }

  const title = post.meta_title?.trim() || post.title;
  const description =
    post.meta_description?.trim() || post.summary || PAGE_SEO.blogs.description;
  const path = `/blogs/${post.slug}`;
  const publishedTime = post.published_at ?? undefined;

  return buildPageMetadata({
    title,
    description,
    path,
    type: "article",
    publishedTime,
    modifiedTime: publishedTime,
    authors: post.author_name ? [post.author_name] : undefined,
    images: post.thumbnail_url ? [{ url: post.thumbnail_url }] : undefined,
  });
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogBySlugForPublic(slug);

  if (!post) {
    notFound();
  }

  const suggested = await getSuggestedPublishedBlogs(post.slug, 4);
  const title = post.meta_title?.trim() || post.title;
  const description =
    post.meta_description?.trim() || post.summary || PAGE_SEO.blogs.description;
  const path = `/blogs/${post.slug}`;

  return (
    <>
      <JsonLd
        data={[
          buildBreadcrumbJsonLd([
            { name: "Home", path: PAGE_SEO.home.path },
            { name: PAGE_SEO.blogs.title, path: PAGE_SEO.blogs.path },
            { name: title, path },
          ]),
          buildBlogPostingJsonLd({
            title,
            description,
            path,
            imageUrl: post.thumbnail_url,
            authorName: post.author_name,
            datePublished: post.published_at,
            dateModified: post.published_at,
          }),
        ]}
      />
      <BlogDetailSection post={post} suggested={suggested} />
    </>
  );
}
