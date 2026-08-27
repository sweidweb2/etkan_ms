"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  loadInstructorCapabilitiesAction,
  setInstructorCapabilityAction,
} from "@/app/manager/instructors/actions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type {
  ManagerInstructorCapabilityPair,
  ManagerInstructorRow,
  ManagerMentorSubjectColumn,
} from "@/types/manager-instructor";

export const INSTRUCTOR_CAPABILITIES_QUERY_KEY = [
  "manager-instructor-capabilities",
] as const;

function pairKey(userId: string, mentorSubjectId: string) {
  return `${userId}:${mentorSubjectId}`;
}

function toCapabilitySet(pairs: ManagerInstructorCapabilityPair[]) {
  return new Set(
    pairs.map((pair) => pairKey(pair.user_id, pair.mentor_subject_id))
  );
}

type CapabilityToggleVars = {
  user_id: string;
  mentor_subject_id: string;
  enabled: boolean;
};

type InstructorCapabilitiesMatrixProps = {
  instructors: ManagerInstructorRow[];
  mentorSubjects: ManagerMentorSubjectColumn[];
  initialCapabilities: ManagerInstructorCapabilityPair[];
  canUpdate: boolean;
  disabled?: boolean;
};

function applyPairState(
  pairs: ManagerInstructorCapabilityPair[],
  userId: string,
  mentorSubjectId: string,
  enabled: boolean
) {
  const key = pairKey(userId, mentorSubjectId);
  const next = pairs.filter(
    (pair) => pairKey(pair.user_id, pair.mentor_subject_id) !== key
  );
  if (enabled) {
    next.push({ user_id: userId, mentor_subject_id: mentorSubjectId });
  }
  return next;
}

export function InstructorCapabilitiesMatrix({
  instructors,
  mentorSubjects,
  initialCapabilities,
  canUpdate,
  disabled = false,
}: InstructorCapabilitiesMatrixProps) {
  const queryClient = useQueryClient();
  const generationByKeyRef = useRef(new Map<string, number>());
  const pendingKeysRef = useRef(new Set<string>());

  const { data: capabilityPairs = initialCapabilities } = useQuery({
    queryKey: INSTRUCTOR_CAPABILITIES_QUERY_KEY,
    queryFn: () => loadInstructorCapabilitiesAction(),
    initialData: initialCapabilities,
    staleTime: Infinity,
  });

  const capabilityKeys = useMemo(
    () => toCapabilitySet(capabilityPairs),
    [capabilityPairs]
  );

  const initialKey = useMemo(
    () => [...toCapabilitySet(initialCapabilities)].sort().join("|"),
    [initialCapabilities]
  );
  const syncedInitialKeyRef = useRef(initialKey);

  useEffect(() => {
    if (initialKey === syncedInitialKeyRef.current) {
      return;
    }
    syncedInitialKeyRef.current = initialKey;
    queryClient.setQueryData(
      INSTRUCTOR_CAPABILITIES_QUERY_KEY,
      initialCapabilities
    );
  }, [initialCapabilities, initialKey, queryClient]);

  const toggleMutation = useMutation({
    mutationFn: async (vars: CapabilityToggleVars) => {
      const result = await setInstructorCapabilityAction(vars);
      if (!result.success) {
        throw new Error(result.error || "Unable to update capability.");
      }
      return result;
    },
    onMutate: async (vars) => {
      const key = pairKey(vars.user_id, vars.mentor_subject_id);
      const generation = (generationByKeyRef.current.get(key) ?? 0) + 1;
      generationByKeyRef.current.set(key, generation);

      await queryClient.cancelQueries({
        queryKey: INSTRUCTOR_CAPABILITIES_QUERY_KEY,
      });

      const previous =
        queryClient.getQueryData<ManagerInstructorCapabilityPair[]>(
          INSTRUCTOR_CAPABILITIES_QUERY_KEY
        ) ?? [];
      const previousEnabled = previous.some(
        (pair) => pairKey(pair.user_id, pair.mentor_subject_id) === key
      );

      queryClient.setQueryData(
        INSTRUCTOR_CAPABILITIES_QUERY_KEY,
        applyPairState(
          previous,
          vars.user_id,
          vars.mentor_subject_id,
          vars.enabled
        )
      );

      pendingKeysRef.current.add(key);

      return { key, generation, previousEnabled };
    },
    onError: (error, vars, context) => {
      if (!context) {
        showErrorToast(
          error instanceof Error
            ? error.message
            : "Unable to update capability."
        );
        return;
      }

      const latest = generationByKeyRef.current.get(context.key);
      if (latest === context.generation) {
        const current =
          queryClient.getQueryData<ManagerInstructorCapabilityPair[]>(
            INSTRUCTOR_CAPABILITIES_QUERY_KEY
          ) ?? [];
        queryClient.setQueryData(
          INSTRUCTOR_CAPABILITIES_QUERY_KEY,
          applyPairState(
            current,
            vars.user_id,
            vars.mentor_subject_id,
            context.previousEnabled
          )
        );
      }

      showErrorToast(
        error instanceof Error ? error.message : "Unable to update capability."
      );
    },
    onSuccess: (result, _vars, context) => {
      if (!context || !result.user_id || !result.mentor_subject_id) {
        return;
      }
      if (typeof result.enabled !== "boolean") {
        return;
      }

      const latest = generationByKeyRef.current.get(context.key);
      if (latest !== context.generation) {
        return;
      }

      const current =
        queryClient.getQueryData<ManagerInstructorCapabilityPair[]>(
          INSTRUCTOR_CAPABILITIES_QUERY_KEY
        ) ?? [];
      queryClient.setQueryData(
        INSTRUCTOR_CAPABILITIES_QUERY_KEY,
        applyPairState(
          current,
          result.user_id,
          result.mentor_subject_id,
          result.enabled
        )
      );
      showSuccessToast(result.message || "Capability updated.");
    },
    onSettled: (_data, _error, _vars, context) => {
      if (!context) {
        return;
      }

      const latest = generationByKeyRef.current.get(context.key);
      if (latest !== context.generation) {
        return;
      }

      pendingKeysRef.current.delete(context.key);

      if (pendingKeysRef.current.size === 0) {
        queueMicrotask(() => {
          void queryClient.invalidateQueries({
            queryKey: INSTRUCTOR_CAPABILITIES_QUERY_KEY,
          });
        });
      }
    },
  });

  return (
    <div className="overflow-x-auto rounded-xl border [scrollbar-width:auto] [&::-webkit-scrollbar]:h-4 [&::-webkit-scrollbar-thumb]:rounded-full">
      <table className="w-max min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="sticky left-0 z-10 min-w-[10rem] bg-muted/40 px-4 py-3 font-medium backdrop-blur">
              Instructor
            </th>
            {mentorSubjects.map((subject) => (
              <th
                key={subject.id}
                className="min-w-[8rem] max-w-[10rem] px-3 py-3 text-center font-medium"
                title={subject.name}
              >
                <span className="line-clamp-2">{subject.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {instructors.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(mentorSubjects.length + 1, 2)}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                Add instructors to edit capabilities.
              </td>
            </tr>
          ) : (
            instructors.map((instructor) => (
              <tr
                key={instructor.id}
                className="border-b last:border-b-0 hover:bg-muted/20"
              >
                <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">
                  {instructor.username ?? instructor.email}
                </td>
                {mentorSubjects.map((subject) => {
                  const key = pairKey(instructor.id, subject.id);
                  const checked = capabilityKeys.has(key);

                  return (
                    <td key={subject.id} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${instructor.username ?? instructor.email} — ${subject.name}`}
                        checked={checked}
                        disabled={disabled || !canUpdate}
                        onChange={(event) => {
                          if (!canUpdate || disabled) {
                            return;
                          }
                          toggleMutation.mutate({
                            user_id: instructor.id,
                            mentor_subject_id: subject.id,
                            enabled: event.target.checked,
                          });
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function removeMentorSubjectFromCapabilitiesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  mentorSubjectId: string
) {
  queryClient.setQueryData<ManagerInstructorCapabilityPair[]>(
    INSTRUCTOR_CAPABILITIES_QUERY_KEY,
    (current) =>
      (current ?? []).filter(
        (pair) => pair.mentor_subject_id !== mentorSubjectId
      )
  );
}

export function removeInstructorFromCapabilitiesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
) {
  queryClient.setQueryData<ManagerInstructorCapabilityPair[]>(
    INSTRUCTOR_CAPABILITIES_QUERY_KEY,
    (current) => (current ?? []).filter((pair) => pair.user_id !== userId)
  );
}
