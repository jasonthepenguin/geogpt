import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 30 requests per minute per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
});

function getClientIp(request: NextRequest): string {
  const direct = (request as any).ip as string | undefined;
  if (direct) return direct;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export async function GET(request: NextRequest) {
  // Optional same-origin check
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  const origin = request.headers.get("origin");
  if (allowedOrigin && origin && origin !== allowedOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { success, limit, remaining, reset } = await ratelimit.limit(
    `viewer-config:${ip}`
  );
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "RateLimit-Limit": String(limit),
          "RateLimit-Remaining": String(remaining),
          "RateLimit-Reset": String(reset),
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      }
    );
  }

  const token = process.env.MAPILLARY_TOKEN;
  
  if (!token) {
    return NextResponse.json(
      { error: "Mapillary token not configured" },
      { status: 500 }
    );
  }

  const res = NextResponse.json(
    { accessToken: token },
    {
      headers: {
        "RateLimit-Limit": String(limit),
        "RateLimit-Remaining": String(remaining),
        "RateLimit-Reset": String(reset),
        // Keep token responses private and short-lived in client caches
        "Cache-Control": "private, max-age=300",
      },
    }
  );
  return res;
}
