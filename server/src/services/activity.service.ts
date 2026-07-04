import { prisma } from "../lib/prisma.js";

interface LogActivityInput {
  userId: string;
  type: string; // e.g. "client.created", "invoice.paid"
  message: string;
  entityType?: string;
  entityId?: string;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({ data: input });
  } catch (err) {
    // Activity logging must never break the main flow.
    console.error("Failed to write activity log:", err);
  }
}
