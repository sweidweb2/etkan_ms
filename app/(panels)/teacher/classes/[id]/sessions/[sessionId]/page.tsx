import { redirect } from "next/navigation";
import { getTeacherClassDetailRoute } from "@/lib/constants/routes";

type TeacherClassSessionDetailPageProps = {
  params: Promise<{ id: string; sessionId: string }>;
};

/** Nested session routes fold into the class Sessions tab. */
export default async function TeacherClassSessionDetailPage({
  params,
}: TeacherClassSessionDetailPageProps) {
  const { id } = await params;
  redirect(getTeacherClassDetailRoute(id, "sessions"));
}
