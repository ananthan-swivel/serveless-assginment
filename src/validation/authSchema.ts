import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const LoginSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
