import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 60 requests per minute per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"),
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
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Optional same-origin check
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  const origin = request.headers.get("origin");
  if (allowedOrigin && origin && origin !== allowedOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { success, limit, remaining, reset } = await ratelimit.limit(
    `nearest-image:${ip}`
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

  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing lat or lng parameters" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    fields: "id",
    limit: "1",
    access_token: token,
    // Mapillary expects closeto as lon,lat
    closeto: `${lng},${lat}`,
  });

  const url = `https://graph.mapillary.com/images?${params.toString()}`;

  try {
    const res = await fetch(url, { method: "GET" });
    
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from Mapillary" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const id = data?.data?.[0]?.id as string | undefined;
    
    return NextResponse.json(
      { imageId: id ?? null },
      {
        headers: {
          "RateLimit-Limit": String(limit),
          "RateLimit-Remaining": String(remaining),
          "RateLimit-Reset": String(reset),
          // Cache lightly to reduce upstream hits when same point is queried repeatedly
          "Cache-Control": "private, max-age=60",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
