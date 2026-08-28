"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadMentorSubjectsPageAction } from "@/app/manager/instructors/actions";
import { SubjectCatalogSection } from "@/components/manager/instructors/subject-catalog-section";
import {
  SubjectCapabilitiesMatrix,
  removeSubjectFromCapabilitiesCache,
  type SubjectCapabilityRow,
} from "@/components/manager/instructors/subject-capabilities-matrix";
import { usePermissions } from "@/components/auth/permissions-provider";
import { SkeletonTable } from "@/components/loaders/skeletons";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import {
  SUBJECT_SCOPES,
  SUBJECT_SCOPE_PERMISSIONS,
} from "@/lib/constants/subject-scope";
import type { ManagerSubjectColumn } from "@/types/manager-capability-subject";

const SCOPE = SUBJECT_SCOPES.MENTOR;

type MentorSubjectsPanelProps = {
  /** Mentors are the matrix rows. */
  mentors: SubjectCapabilityRow[];
  /** Fetch is deferred until the Mentors tab is first opened. */
  enabled: boolean;
};

export function MentorSubjectsPanel({
  mentors,
  enabled,
}: MentorSubjectsPanelProps) {
  const permissions = usePermissions();
  const queryClient = useQueryClient();
  const canUpdateCapabilities = hasPermissionInSet(
    permissions,
    SUBJECT_SCOPE_PERMISSIONS.mentor.capabilitiesUpdate
  );

  const { data, isLoading } = useQuery({
    queryKey: ["manager-mentor-subjects-page"],
    queryFn: () => loadMentorSubjectsPageAction(),
    enabled,
    staleTime: 60_000,
  });

  const [subjects, setSubjects] = useState<ManagerSubjectColumn[]>(
    data?.subjects ?? []
  );
  const subjectsKey = (data?.subjects ?? [])
    .map((row) => `${row.id}:${row.name}:${row.sort_order}`)
    .join("|");
  const [syncedSubjectsKey, setSyncedSubjectsKey] = useState(subjectsKey);

  if (subjectsKey !== syncedSubjectsKey) {
    setSyncedSubjectsKey(subjectsKey);
    setSubjects(data?.subjects ?? []);
  }

  if (isLoading || !data) {
    return <SkeletonTable />;
  }

  return (
    <div className="flex flex-col gap-6">
      <SubjectCatalogSection
        scope={SCOPE}
        subjects={subjects}
        onSubjectsChange={setSubjects}
        onSubjectDeleted={(subjectId) => {
          removeSubjectFromCapabilitiesCache(queryClient, SCOPE, subjectId);
        }}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Mentor subject capabilities
          </h2>
          <p className="text-sm text-muted-foreground">
            Toggle which mentor subjects each mentor can teach. Changes save
            immediately.
          </p>
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-xl border px-4 py-10 text-center text-sm text-muted-foreground">
            Create a mentor subject first.
          </div>
        ) : (
          <SubjectCapabilitiesMatrix
            scope={SCOPE}
            rows={mentors}
            subjects={subjects}
            initialCapabilities={data.capabilities}
            canUpdate={canUpdateCapabilities}
          />
        )}
      </section>
    </div>
  );
}
