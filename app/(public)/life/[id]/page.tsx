import { notFound } from "next/navigation";
import { LifeBlogDetailSection } from "@/components/public/life-blog-detail-section";
import {
  getLifeBlogById,
  isLifeBlogId,
} from "@/lib/constants/public-life-blogs";

type LifeBlogDetailPageProps = {
  params: Promise<{ id: string }>;
};

/** Parent `life/layout` is force-dynamic (requireAdmin) — no static params. */

export default async function LifeBlogDetailPage({
  params,
}: LifeBlogDetailPageProps) {
  const { id } = await params;

  if (!isLifeBlogId(id)) {
    notFound();
  }

  const post = getLifeBlogById(id);
  if (!post) {
    notFound();
  }

  return (
    <main className="flex-1">
      <LifeBlogDetailSection post={post} />
    </main>
  );
}
