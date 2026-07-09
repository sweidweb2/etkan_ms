import { z } from "zod";

export const connectSemesterClassSchema = z.object({
  classId: z
    .string()
    .trim()
    .min(1, { message: "Select a class to connect." }),
});

export type ConnectSemesterClassInput = z.infer<
  typeof connectSemesterClassSchema
>;
