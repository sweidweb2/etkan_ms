import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export function createSaveBoardSchema(options: {
  unassignedId: string;
  columnNotFoundMessage: string;
  itemNotFoundMessage: string;
}) {
  const columnIdSchema = z.union([
    z.literal(options.unassignedId),
    z.string().uuid({ message: options.columnNotFoundMessage }),
  ]);

  return z.object({
    columns: z.record(
      columnIdSchema,
      z.array(z.string().uuid({ message: options.itemNotFoundMessage }))
    ),
  });
}

export function parseSaveBoardFormData<TSchema extends z.ZodType>(
  schema: TSchema,
  formData: FormData
) {
  let columns: unknown = {};
  const raw = formData.get("columns");
  if (typeof raw === "string" && raw.trim()) {
    try {
      columns = JSON.parse(raw);
    } catch {
      columns = {};
    }
  }

  return safeParseFormData(schema, {
    columns,
  });
}

export function createReorderColumnsSchema(options: {
  columnNotFoundMessage: string;
  emptyMessage: string;
}) {
  return z.object({
    ordered_ids: z
      .array(z.string().uuid({ message: options.columnNotFoundMessage }))
      .min(1, { message: options.emptyMessage }),
  });
}

export function parseReorderColumnsFormData<TSchema extends z.ZodType>(
  schema: TSchema,
  formData: FormData
) {
  let orderedIds: unknown = [];
  const raw = formData.get("ordered_ids");
  if (typeof raw === "string" && raw.trim()) {
    try {
      orderedIds = JSON.parse(raw);
    } catch {
      orderedIds = [];
    }
  }

  return safeParseFormData(schema, {
    ordered_ids: orderedIds,
  });
}
