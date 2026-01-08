import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // TẠM THỜI CHỈ TEST FLOW
    if (contentType.includes("multipart/form-data")) {
      return NextResponse.json({
        text: "seller amazon, seller etsy, hà nội, thanh xuân",
        source: "mock-pdf",
      });
    }

    const body = await req.json();

    if (body.cvLink) {
      return NextResponse.json({
        text: "designer, design leader, hồ chí minh, quận 1",
        source: "mock-link",
      });
    }

    return NextResponse.json(
      { error: "No CV data" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
