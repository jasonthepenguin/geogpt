import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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
    
    return NextResponse.json({ imageId: id ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
