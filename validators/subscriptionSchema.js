import { z } from "zod";

export const PLAN_IDS = [
  // Monthly
  "plan_T7QOKw1SWn3YA9",  // Pro Monthly
  "plan_T7QTobe7VSThyp",  // Premium Monthly
  // Yearly
  "plan_T7QPutFKX9ueS5",  // Pro Yearly
  "plan_T7QV7r2nId24Vo",  // Premium Yearly
];

export const createSubscriptionSchema = z.object({
  planId: z.enum(PLAN_IDS, {
    error: "Invalid plan selected.",
  }),
});
