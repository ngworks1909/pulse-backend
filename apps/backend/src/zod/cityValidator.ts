import z from "zod";

export const createCitySchema = z.object({
    name: z.string().min(2).max(100, {message: "City name should be at least 2 characters"}),
    code: z.string().min(2).max(10, {message: "City code should be at least 2 characters"}),
});


