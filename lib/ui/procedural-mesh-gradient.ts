import {
  CLASS_CARD_GRADIENTS,
  normalizeClassCardGradientKey,
  type ClassCardGradientDefinition,
  type ClassCardGradientKey,
} from "@/lib/constants/class-card-gradients";

export type ProceduralMeshGradient = {
  backgroundColor: string;
  backgroundImage: string;
};

function buildMeshFromDefinition(
  definition: ClassCardGradientDefinition
): ProceduralMeshGradient {
  const layers = definition.blobs.map((blob) => {
    const soft = blob.soft ?? 0.52;
    const height = blob.size * 0.85;
    return `radial-gradient(ellipse ${blob.size}% ${height}% at ${blob.x}% ${blob.y}%, ${blob.color} 0%, transparent ${(soft * 100).toFixed(0)}%)`;
  });

  layers.push(definition.wash);

  return {
    backgroundColor: definition.base,
    backgroundImage: layers.join(", "),
  };
}

/**
 * Resolve a curated class-card gradient by directory key.
 * Unknown / missing keys fall back to the default palette.
 */
export function createClassCardMeshGradient(
  key: string | null | undefined
): ProceduralMeshGradient {
  const resolved: ClassCardGradientKey = normalizeClassCardGradientKey(key);
  return buildMeshFromDefinition(CLASS_CARD_GRADIENTS[resolved]);
}

/** @deprecated Prefer createClassCardMeshGradient(card_gradient). */
export function createProceduralMeshGradient(
  idOrKey: string
): ProceduralMeshGradient {
  return createClassCardMeshGradient(idOrKey);
}
