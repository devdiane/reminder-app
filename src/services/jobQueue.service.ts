import { prisma } from "../lib/prisma";

export async function addJob(type: string, payload: any, runAt: Date) {
  return prisma.job.create({
    data: {
      type,
      payload,
      runAt,
    },
  });
}
