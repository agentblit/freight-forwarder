import { Readable } from "node:stream";
import https from "node:https";
import http from "node:http";
import dns from "node:dns";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

function buildUpstream(): { url: URL; apiKey: string } | { error: string } {
  const raw = process.env.FORM_FILL_SSE_URL?.trim();
  const apiKey = process.env.FORM_FILL_API_KEY?.trim();
  if (!raw || !apiKey) {
    return {
      error:
        "FORM_FILL_SSE_URL and FORM_FILL_API_KEY must be set in the environment",
    };
  }
  return { url: new URL(raw), apiKey };
}

function openSse(
  target: URL,
  apiKey: string,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Readable }> {
  const lib = target.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === "http:" ? 80 : 443),
        path: `${target.pathname}${target.search}`,
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          "X-API-Key": apiKey,
          Connection: "keep-alive",
        },
        // Avoid IPv6 connect hangs on some networks.
        family: 4,
        timeout: 60_000,
      },
      (res) => {
        resolve({
          status: res.statusCode ?? 502,
          headers: res.headers,
          body: res,
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("Upstream SSE connect timed out after 60s"));
    });
    req.on("error", reject);
    req.end();
  });
}

async function connectWithRetry(target: URL, apiKey: string, attempts = 3) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await openSse(target, apiKey);
    } catch (error) {
      lastError = error;
      console.error(
        `form-fill SSE upstream connect failed (attempt ${i + 1}/${attempts})`,
        error,
      );
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 700 * (i + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Proxies form-filling-connector SSE (API key stays server-side).
 * Uses Node https with IPv4 + retries to avoid intermittent ConnectTimeout.
 */
export async function GET() {
  const config = buildUpstream();
  if ("error" in config) {
    return NextResponse.json({ error: config.error }, { status: 500 });
  }

  let upstream: Awaited<ReturnType<typeof connectWithRetry>>;
  try {
    upstream = await connectWithRetry(config.url, config.apiKey);
  } catch (error) {
    console.error("form-fill SSE upstream connect failed", error);
    return NextResponse.json(
      {
        error:
          "Failed to connect to form-fill SSE. Check network access to the connector host.",
      },
      { status: 502 },
    );
  }

  if (upstream.status >= 400) {
    const chunks: Buffer[] = [];
    for await (const chunk of upstream.body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString("utf8");
    console.error("form-fill SSE upstream error", upstream.status, text);
    return NextResponse.json(
      { error: "Form-fill SSE upstream error", status: upstream.status },
      { status: 502 },
    );
  }

  const webStream = Readable.toWeb(upstream.body) as ReadableStream;

  return new Response(webStream, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
