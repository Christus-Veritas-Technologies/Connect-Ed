import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const onboardingProgress = new Hono();

// Apply auth middleware to all routes
onboardingProgress.use("*", requireAuth);

// Schema for progress updates
const progressSchema = z.object({
  currentStep: z.number().int().min(0).max(6),
  schoolName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  isLandline: z.boolean().optional(),
  cambridge: z.boolean().optional(),
  zimsec: z.boolean().optional(),
  hasPrimary: z.boolean().optional(),
  hasSecondary: z.boolean().optional(),
  subjectsData: z.any().optional(), // JSON data
  classesData: z.any().optional(), // JSON data
  termlyFee: z.number().optional(),
  currentTermNumber: z.number().int().optional(),
  currentTermYear: z.number().int().optional(),
  termStartMonth: z.number().int().optional(),
  termStartDay: z.number().int().optional(),
  gradesData: z.any().optional(), // JSON data - grades per subject
  completedSteps: z.array(z.number()).optional(),
});

// GET /onboarding-progress - Get current progress
onboardingProgress.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const progress = await db.onboardingProgress.findUnique({
      where: { schoolId },
    });

    if (!progress) {
      return successResponse(c, { progress: null });
    }

    return successResponse(c, { progress });
  } catch (error) {
    console.error("Get onboarding progress error:", error);
    return errors.internalError(c);
  }
});

// POST /onboarding-progress - Save/update progress
onboardingProgress.post("/", zValidator("json", progressSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const data = c.req.valid("json");

    console.log(`[POST /onboarding-progress] Saving progress for school: ${schoolId}`, {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
    });

    const progress = await db.onboardingProgress.upsert({
      where: { schoolId },
      create: {
        schoolId,
        ...data,
      },
      update: data,
    });

    console.log(`[POST /onboarding-progress] ✓ Progress saved successfully`);
    return successResponse(c, { progress });
  } catch (error) {
    console.error("Save onboarding progress error:", error);
    return errors.internalError(c);
  }
});

// DELETE /onboarding-progress - Clear progress (useful after completion)
onboardingProgress.delete("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    await db.onboardingProgress.delete({
      where: { schoolId },
    }).catch(() => {
      // Ignore if doesn't exist
    });

    return successResponse(c, { message: "Progress cleared" });
  } catch (error) {
    console.error("Delete onboarding progress error:", error);
    return errors.internalError(c);
  }
});

export default onboardingProgress;
