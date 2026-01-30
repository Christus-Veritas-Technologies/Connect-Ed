import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { successResponse, errors } from "../../../../lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return errors.unauthorized();
    }

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        emailQuota: true,
        emailUsed: true,
        whatsappQuota: true,
        whatsappUsed: true,
        smsQuota: true,
        smsUsed: true,
        quotaResetDate: true,
      },
    });

    if (!school) {
      return errors.notFound("School");
    }

    return successResponse({
      email: { used: school.emailUsed, limit: school.emailQuota },
      whatsapp: { used: school.whatsappUsed, limit: school.whatsappQuota },
      sms: { used: school.smsUsed, limit: school.smsQuota },
      resetDate: school.quotaResetDate,
    });
  } catch (error) {
    console.error("Get quota error:", error);
    return errors.internalError();
  }
}
