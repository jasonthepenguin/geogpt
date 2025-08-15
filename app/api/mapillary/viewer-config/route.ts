import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.MAPILLARY_TOKEN;
  
  if (!token) {
    return NextResponse.json(
      { error: "Mapillary token not configured" },
      { status: 500 }
    );
  }

  // In a production app, you might want to add additional security here:
  // - Rate limiting
  // - Request validation
  // - Session/auth checks
  // - CORS restrictions
  
  return NextResponse.json({
    accessToken: token
  });
}
