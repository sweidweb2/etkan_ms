import { ClassStudentGradesSection } from "@/components/manager/classes/class-student-grades-section";
import { ClassWeightsSection } from "@/components/manager/classes/class-weights-section";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getManagerClassStudentGradesPreview } from "@/lib/constants/manager-class-student-grades-mock";
import { getManagerClassWeightsPreview } from "@/lib/constants/manager-class-weights-mock";
import { getManagerClassDetailRoute, ROUTES } from "@/lib/constants/routes";
import { getManagerClassPreview } from "@/lib/manager/get-manager-class-preview";

type ManagerClassGradesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerClassGradesPage({
  params,
}: ManagerClassGradesPageProps) {
  const { id } = await params;
  const classRow = getManagerClassPreview(id);
  const classWeights = getManagerClassWeightsPreview(id);
  const studentGradeRows = getManagerClassStudentGradesPreview(id);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_CLASSES}>
              Manage classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={getManagerClassDetailRoute(id)}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Grades</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle className="text-xl">Class grades</CardTitle>
          <p className="text-sm text-muted-foreground">
            Grade summaries for {classRow.name}. More views will be added here
            later.
          </p>
        </CardHeader>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Task and session grade summaries coming soon.
        </CardContent>
      </Card>

      <ClassWeightsSection
        classId={id}
        className={classRow.name}
        initialWeights={classWeights}
      />

      <ClassStudentGradesSection
        classId={id}
        className={classRow.name}
        rows={studentGradeRows}
        initialWeights={classWeights}
      />
    </div>
  );
}
