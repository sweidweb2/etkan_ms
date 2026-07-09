import { ClassGradesPanel } from "@/components/manager/classes/class-grades-panel";

type ManagerClassGradesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerClassGradesPage({
  params,
}: ManagerClassGradesPageProps) {
  const { id } = await params;

  return <ClassGradesPanel classId={id} />;
}
