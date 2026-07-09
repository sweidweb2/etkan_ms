import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";

type UseZodFormProps<TSchema extends z.ZodTypeAny> = Omit<
  UseFormProps<
    z.input<TSchema> & FieldValues,
    unknown,
    z.output<TSchema>
  >,
  "resolver"
> & {
  schema: TSchema;
};

/** Zod 4–aware react-hook-form helper (input vs output types for coerced fields). */
export function useZodForm<TSchema extends z.ZodTypeAny>({
  schema,
  ...options
}: UseZodFormProps<TSchema>): UseFormReturn<
  z.input<TSchema> & FieldValues,
  unknown,
  z.output<TSchema>
> {
  return useForm<z.input<TSchema> & FieldValues, unknown, z.output<TSchema>>({
    resolver: zodResolver(schema as never) as unknown as Resolver<
      z.input<TSchema> & FieldValues,
      unknown,
      z.output<TSchema>
    >,
    ...options,
  });
}
