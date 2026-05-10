import type { APIRoute } from "astro";
import { parseDateRange } from "../../../lib/dateRange";

export const GET: APIRoute = async ({ request, url }) => {
  const range = parseDateRange(url);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let ticks = 0;

      const send = () => {
        ticks += 1;
        const payload = `data: ${JSON.stringify({ from: range.from, to: range.to, tick: ticks })}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      send();
      const timer = setInterval(send, 20000);

      request.signal.addEventListener("abort", () => {
        clearInterval(timer);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
};
