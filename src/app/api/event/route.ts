import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const event = await prisma.event.create({
    data: {
      title: body.title,
      type: body.type,
      startTime: new Date(body.startTime),
      userId: body.userId,
    },
  });

  return Response.json(event);
}
