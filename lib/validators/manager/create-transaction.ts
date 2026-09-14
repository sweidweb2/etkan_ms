import { z } from "zod";
import {
  formValidationFailure,
  safeParseFormData,
} from "@/lib/validators/safe-parse-form-data";
import {
  PAYMENT_METHOD_VALUES,
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPE_VALUES,
  getTransactionCategoriesForType,
  type TransactionType,
} from "@/lib/manager/accounting/constants";

export const createTransactionFormSchema = z
  .object({
    transaction_date: z
      .string()
      .trim()
      .min(1, { message: "Date is required." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Date must be YYYY-MM-DD.",
      }),
    type: z.enum(TRANSACTION_TYPE_VALUES, {
      message: "Select credit or debit.",
    }),
    amount: z.coerce
      .number()
      .positive({ message: "Amount must be greater than zero." })
      .max(1_000_000, { message: "Amount must be at most 1,000,000." }),
    description: z
      .string()
      .trim()
      .min(1, { message: "Description is required." })
      .max(200, { message: "Description must be at most 200 characters." }),
    category: z.string().trim().min(1, { message: "Select a category." }),
    category_custom: z
      .string()
      .trim()
      .max(80, { message: "Custom category must be at most 80 characters." })
      .optional()
      .or(z.literal("")),
    payment_method: z
      .union([
        z.enum(PAYMENT_METHOD_VALUES),
        z.literal(""),
        z.literal("__none__"),
      ])
      .optional(),
    recorded_by: z
      .string()
      .trim()
      .min(1, { message: "Recorded by is required." })
      .max(120, { message: "Recorded by must be at most 120 characters." }),
    notes: z
      .string()
      .trim()
      .max(500, { message: "Notes must be at most 500 characters." })
      .optional()
      .or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    const allowed = getTransactionCategoriesForType(
      values.type as TransactionType
    ) as readonly string[];

    if (!allowed.includes(values.category)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["category"],
        message: "Select a category for this transaction type.",
      });
      return;
    }

    if (values.category === TRANSACTION_CATEGORIES.OTHER) {
      const custom = values.category_custom?.trim() ?? "";
      if (!custom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["category_custom"],
          message: "Enter a custom category.",
        });
      }
    }
  });

export type CreateTransactionFormInput = z.input<
  typeof createTransactionFormSchema
>;
export type CreateTransactionFormValues = z.output<
  typeof createTransactionFormSchema
>;

export type CreateTransactionInput = {
  transaction_date: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  payment_method: string | null;
  recorded_by: string;
  notes?: string | null;
};

export function resolveCreateTransactionInput(
  values: CreateTransactionFormValues
): CreateTransactionInput {
  const category =
    values.category === TRANSACTION_CATEGORIES.OTHER
      ? (values.category_custom?.trim() ?? "")
      : values.category;

  const paymentMethod =
    !values.payment_method || values.payment_method === "__none__"
      ? null
      : values.payment_method;

  return {
    transaction_date: values.transaction_date,
    type: values.type,
    amount: values.amount,
    description: values.description,
    category,
    payment_method: paymentMethod,
    recorded_by: values.recorded_by,
    notes: values.notes,
  };
}

function formDataToTransactionFields(formData: FormData) {
  return {
    transaction_date: formData.get("transaction_date"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    category: formData.get("category") ?? TRANSACTION_CATEGORIES.OTHER,
    category_custom: formData.get("category_custom") ?? "",
    payment_method: String(formData.get("payment_method") ?? ""),
    recorded_by: formData.get("recorded_by"),
    notes: formData.get("notes") ?? "",
  };
}

export function parseCreateTransactionFormData(formData: FormData) {
  const parsed = safeParseFormData(
    createTransactionFormSchema,
    formDataToTransactionFields(formData)
  );

  if (!parsed.success) {
    return parsed;
  }

  const data = resolveCreateTransactionInput(parsed.data);
  if (!data.category) {
    return formValidationFailure({
      category_custom: ["Enter a custom category."],
    });
  }

  return { success: true as const, data };
}

export const updateTransactionFormSchema = createTransactionFormSchema;

export type UpdateTransactionFormValues = CreateTransactionFormValues & {
  id: string;
};

export type UpdateTransactionInput = CreateTransactionInput & {
  id: string;
};

export function parseUpdateTransactionFormData(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    return formValidationFailure({ id: ["Invalid transaction."] });
  }

  const parsed = parseCreateTransactionFormData(formData);
  if (!parsed.success) {
    return parsed;
  }

  return {
    success: true as const,
    data: {
      id,
      ...parsed.data,
    },
  };
}
