import { z } from "zod";
import { ROLE_VALUES } from "@/lib/constants/roles";

export const roleSchema = z.enum(ROLE_VALUES);

export type RoleInput = z.infer<typeof roleSchema>;
