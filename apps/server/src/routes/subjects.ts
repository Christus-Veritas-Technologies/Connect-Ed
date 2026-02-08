import { Hono } from "hono";
import { db } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const subjects = new Hono();

// Apply auth middleware to all routes
subjects.use("*", requireAuth);

// GET /subjects - List subjects
subjects.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const subjectList = await db.subject.findMany({
      where: { schoolId },
      include: {
        _count: {
          select: {
            students: true,
            classes: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return successResponse(c, { subjects: subjectList });
  } catch (error) {
    console.error("List subjects error:", error);
    return errors.internalError(c);
  }
});

export default subjects;
