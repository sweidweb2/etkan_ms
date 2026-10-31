import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogsSection } from "@/components/public/blogs/blogs-section";
import { BlogsListSkeleton } from "@/components/public/blogs/blogs-skeletons";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PAGE_SEO } from "@/lib/seo/page-seo";
import { listPublishedBlogsForPublic } from "@/services/public/blog.service";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_SEO.blogs.title,
  description: PAGE_SEO.blogs.description,
  path: PAGE_SEO.blogs.path,
});

export default async function BlogsPage() {
  const posts = await listPublishedBlogsForPublic();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: PAGE_SEO.home.path },
          { name: PAGE_SEO.blogs.title, path: PAGE_SEO.blogs.path },
        ])}
      />
      <Suspense fallback={<BlogsListSkeleton />}>
        <BlogsSection posts={posts} />
      </Suspense>
    </>
  );
}
