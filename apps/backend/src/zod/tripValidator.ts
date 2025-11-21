import z from 'zod';

export const createTripSchema = z.object({
    sourceId : z.string({message: "source city id is required"}),
    destinationId : z.string({message: "destination city id is required"}),
    targetPrice: z.number().min(1, {message: "target price should be at least 1"}),
    travelDate: z.preprocess(
        (arg) => {
          if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
        },
        z.date({ message: "Travel date must be a valid date" })
    )
})