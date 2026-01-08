import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* =========================
   LOAD pdf-parse (CommonJS)
========================= */
const pdfParse = require("pdf-parse");

/* =========================
   READ PDF BUFFER
========================= */
async function readPdfFromBuffer(buffer: Buffer) {
  const data = await pdfParse(buffer);
  return data?.text || "";
}

/* =========================
   POST: READ CV
========================= */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer | null = null;

    /* ===== CASE 1: UPLOAD FILE ===== */
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file uploaded" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    /* ===== CASE 2: LINK PDF ===== */
    if (!buffer) {
      const body = await req.json().catch(() => null);
      const link = body?.link;

      if (link) {
        const res = await fetch(link);
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    }

    if (!buffer) {
      return NextResponse.json(
        { error: "No CV file or link provided" },
        { status: 400 }
      );
    }

    const text = await readPdfFromBuffer(buffer);

    return NextResponse.json({ text });
  } catch (err) {
    console.error("READ CV ERROR:", err);
    return NextResponse.json(
      { error: "Cannot read CV PDF" },
      { status: 500 }
    );
  }
}
