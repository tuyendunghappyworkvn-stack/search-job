import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export const runtime = "nodejs";

/* =========================
   READ PDF BUFFER
========================= */
async function readPdfFromBuffer(buffer: Buffer) {
  const data = await pdf(buffer);
  return data.text || "";
}

/* =========================
   POST: READ CV
========================= */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    /* =========================
       CASE 1: UPLOAD FILE
    ========================= */
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file uploaded" },
          { status: 400 }
        );
      }

      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Only PDF is supported" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const text = await readPdfFromBuffer(buffer);

      return NextResponse.json({
        source: "upload",
        text,
      });
    }

    /* =========================
       CASE 2: LINK PDF
    ========================= */
    const body = await req.json();
    const { link } = body;

    if (!link) {
      return NextResponse.json(
        { error: "Missing CV link" },
        { status: 400 }
      );
    }

    const res = await fetch(link);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Cannot fetch CV link" },
        { status: 400 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await readPdfFromBuffer(buffer);

    return NextResponse.json({
      source: "link",
      text,
    });
  } catch (err: any) {
    console.error("READ CV ERROR:", err);
    return NextResponse.json(
      { error: "Cannot read CV" },
      { status: 500 }
    );
  }
}
