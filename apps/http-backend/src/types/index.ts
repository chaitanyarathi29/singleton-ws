import { z } from 'zod';

export const userSignupSchema = z.object({
    name: z.string(),
    username: z.string(),
    password: z.string(),
});

export const userSigninSchema = z.object({
    username: z.string(),
    password: z.string()
})
