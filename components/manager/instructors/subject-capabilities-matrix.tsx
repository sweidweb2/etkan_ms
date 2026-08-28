"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  loadSubjectCapabilitiesAction,
  setSubjectCapabilityAction,
} from "@/app/manager/instructors/actions";
import {
  SUBJECT_SCOPE_COPY,
  type SubjectScope,
} from "@/lib/constants/subject-scope";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type {
  ManagerSubjectCapabilityPair,
  ManagerSubjectColumn,
} from "@/types/manager-capability-subject";

/** Each scope keeps its own cache entry so the two matrices never share rows. */
export function subjectCapabilitiesQueryKey(scope: SubjectScope) {
  return ["manager-subject-capabilities", scope] as const;
}

function pairKey(userId: string, subjectId: string) {
  return `${userId}:${subjectId}`;
}

function toCapabilitySet(pairs: ManagerSubjectCapabilityPair[]) {
  return new Set(pairs.map((pair) => pairKey(pair.user_id, pair.subject_id)));
}

type CapabilityToggleVars = {
  user_id: string;
  subject_id: string;
  enabled: boolean;
};

/** A person row in the matrix (instructor or mentor). */
export type SubjectCapabilityRow = {
  id: string;
  username: string | null;
  email: string;
};

type SubjectCapabilitiesMatrixProps = {
  scope: SubjectScope;
  rows: SubjectCapabilityRow[];
  subjects: ManagerSubjectColumn[];
  initialCapabilities: ManagerSubjectCapabilityPair[];
  canUpdate: boolean;
  disabled?: boolean;
};

function applyPairState(
  pairs: ManagerSubjectCapabilityPair[],
  userId: string,
  subjectId: string,
  enabled: boolean
) {
  const key = pairKey(userId, subjectId);
  const next = pairs.filter(
    (pair) => pairKey(pair.user_id, pair.subject_id) !== key
  );
  if (enabled) {
    next.push({ user_id: userId, subject_id: subjectId });
  }
  return next;
}

export function SubjectCapabilitiesMatrix({
  scope,
  rows,
  subjects,
  initialCapabilities,
  canUpdate,
  disabled = false,
}: SubjectCapabilitiesMatrixProps) {
  const copy = SUBJECT_SCOPE_COPY[scope];
  const queryKey = useMemo(() => subjectCapabilitiesQueryKey(scope), [scope]);
  const queryClient = useQueryClient();
  const generationByKeyRef = useRef(new Map<string, number>());
  const pendingKeysRef = useRef(new Set<string>());

  const { data: capabilityPairs = initialCapabilities } = useQuery({
    queryKey,
    queryFn: () => loadSubjectCapabilitiesAction(scope),
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
    queryClient.setQueryData(queryKey, initialCapabilities);
  }, [initialCapabilities, initialKey, queryClient, queryKey]);

  const toggleMutation = useMutation({
    mutationFn: async (vars: CapabilityToggleVars) => {
      const result = await setSubjectCapabilityAction({ ...vars, scope });
      if (!result.success) {
        throw new Error(result.error || "Unable to update capability.");
      }
      return result;
    },
    onMutate: async (vars) => {
      const key = pairKey(vars.user_id, vars.subject_id);
      const generation = (generationByKeyRef.current.get(key) ?? 0) + 1;
      generationByKeyRef.current.set(key, generation);

      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<ManagerSubjectCapabilityPair[]>(queryKey) ?? [];
      const previousEnabled = previous.some(
        (pair) => pairKey(pair.user_id, pair.subject_id) === key
      );

      queryClient.setQueryData(
        queryKey,
        applyPairState(previous, vars.user_id, vars.subject_id, vars.enabled)
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
          queryClient.getQueryData<ManagerSubjectCapabilityPair[]>(queryKey) ??
          [];
        queryClient.setQueryData(
          queryKey,
          applyPairState(
            current,
            vars.user_id,
            vars.subject_id,
            context.previousEnabled
          )
        );
      }

      showErrorToast(
        error instanceof Error ? error.message : "Unable to update capability."
      );
    },
    onSuccess: (result, _vars, context) => {
      if (!context || !result.user_id || !result.subject_id) {
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
        queryClient.getQueryData<ManagerSubjectCapabilityPair[]>(queryKey) ?? [];
      queryClient.setQueryData(
        queryKey,
        applyPairState(
          current,
          result.user_id,
          result.subject_id,
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
          void queryClient.invalidateQueries({ queryKey });
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
              {copy.personSingular}
            </th>
            {subjects.map((subject) => (
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
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={Math.max(subjects.length + 1, 2)}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                Add {copy.personPluralLower} to edit capabilities.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-b last:border-b-0 hover:bg-muted/20"
              >
                <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">
                  {row.username ?? row.email}
                </td>
                {subjects.map((subject) => {
                  const key = pairKey(row.id, subject.id);
                  const checked = capabilityKeys.has(key);

                  return (
                    <td key={subject.id} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${row.username ?? row.email} — ${subject.name}`}
                        checked={checked}
                        disabled={disabled || !canUpdate}
                        onChange={(event) => {
                          if (!canUpdate || disabled) {
                            return;
                          }
                          toggleMutation.mutate({
                            user_id: row.id,
                            subject_id: subject.id,
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

export function removeSubjectFromCapabilitiesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: SubjectScope,
  subjectId: string
) {
  queryClient.setQueryData<ManagerSubjectCapabilityPair[]>(
    subjectCapabilitiesQueryKey(scope),
    (current) => (current ?? []).filter((pair) => pair.subject_id !== subjectId)
  );
}

export function removePersonFromCapabilitiesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: SubjectScope,
  userId: string
) {
  queryClient.setQueryData<ManagerSubjectCapabilityPair[]>(
    subjectCapabilitiesQueryKey(scope),
    (current) => (current ?? []).filter((pair) => pair.user_id !== userId)
  );
}
