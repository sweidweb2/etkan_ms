import { z } from "zod";
import { addPaymentSchema } from "@/lib/validators/manager/add-payment";

export const updatePaymentSchema = addPaymentSchema;

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
