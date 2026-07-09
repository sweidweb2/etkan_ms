import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import { getPreviewSessionPhaseLinkFromStore } from "@/lib/preview/manager-session-phase-store";
import type { ManagerSessionPhaseLink } from "@/types/manager-session-phase-link";

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash + character.charCodeAt(0)) % 997;
  }

  return hash;
}

function getPhaseById(phaseId: string): ManagerSessionPhaseLink | null {
  const phase = MANAGER_PHASES_MOCK.find((row) => row.id === phaseId);
  if (!phase) {
    return null;
  }

  return {
    phase_id: phase.id,
    phase_name: phase.name,
  };
}

export function getSessionPhaseLinkPreview(
  sessionId: string,
  nbOrder: number,
  classSemesterId: string | null
): ManagerSessionPhaseLink | null {
  const stored = getPreviewSessionPhaseLinkFromStore(sessionId);
  if (stored) {
    return stored;
  }

  const isPresetLinked = nbOrder % 4 === 0 || hashString(sessionId) % 5 === 0;
  if (!isPresetLinked) {
    return null;
  }

  if (classSemesterId) {
    return getPhaseById(classSemesterId);
  }

  const fallbackPhase = MANAGER_PHASES_MOCK[hashString(sessionId) % MANAGER_PHASES_MOCK.length];
  if (!fallbackPhase) {
    return null;
  }

  return {
    phase_id: fallbackPhase.id,
    phase_name: fallbackPhase.name,
  };
}

export function getManagerPhaseOptions() {
  return MANAGER_PHASES_MOCK.map((phase) => ({
    id: phase.id,
    name: phase.name,
    nb_courses: phase.nb_courses,
    amount: phase.amount,
  }));
}
