import { Suspense } from "react";
import { BlogsSection } from "@/components/public/blogs/blogs-section";
import { BlogsListSkeleton } from "@/components/public/blogs/blogs-skeletons";
import { listPublishedBlogsForPublic } from "@/services/public/blog.service";

export default async function BlogsPage() {
  const posts = await listPublishedBlogsForPublic();

  return (
    <Suspense fallback={<BlogsListSkeleton />}>
      <BlogsSection posts={posts} />
    </Suspense>
  );
}
