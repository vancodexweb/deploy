import { addClient, removeClient } from "@/lib/eventBus";
import { readSiteState } from "@/lib/siteState";
import { withServerTime } from "@/lib/sitePayload";

export const dynamic = "force-dynamic";

const PING_INTERVAL_MS = 25_000;

export async function GET() {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval>;
  let listener: (data: string) => void;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // stream already closed, ignore
        }
      };

      listener = send;
      addClient(listener);

      const initial = await readSiteState();
      send(JSON.stringify(withServerTime(initial)));

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // stream already closed, ignore
        }
      }, PING_INTERVAL_MS);
    },
    cancel() {
      clearInterval(heartbeat);
      removeClient(listener);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
