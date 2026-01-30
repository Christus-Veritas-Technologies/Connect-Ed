import { NextRequest } from "next/server";
import { successResponse, errors } from "../../../../lib/api-response";
import { sendFeeReminder } from "../../../../lib/messaging";
import { z } from "zod";

const sendRemindersSchema = z.object({
  feeIds: z.array(z.string()).min(1),
  channels: z.array(z.enum(["EMAIL", "WHATSAPP", "SMS"])).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return errors.unauthorized();
    }

    const body = await request.json();

    const result = sendRemindersSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const { feeIds, channels } = result.data;

    // Send reminders for each fee
    const results: Record<string, { results: Record<string, { success: boolean; error?: string }> }> = {};

    for (const feeId of feeIds) {
      results[feeId] = await sendFeeReminder(schoolId, feeId, channels as any[]);
    }

    // Count successes and failures
    let totalSent = 0;
    let totalFailed = 0;

    for (const feeResult of Object.values(results)) {
      for (const channelResult of Object.values(feeResult.results)) {
        if (channelResult.success) {
          totalSent++;
        } else {
          totalFailed++;
        }
      }
    }

    return successResponse({
      message: `Sent ${totalSent} reminders, ${totalFailed} failed`,
      results,
    });
  } catch (error) {
    console.error("Send reminders error:", error);
    return errors.internalError();
  }
}
