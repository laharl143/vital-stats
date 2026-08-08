import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DoctorNoteType } from "@prisma/client";
import { requireAdminSession } from "@/lib/require-admin";

// POST /api/medical-history/[id]/notes  (admin — add a Doctor's Note)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await req.json();
    const { type, content, imageUrl, publicId } = body;

    if (type !== "TEXT" && type !== "PHOTO") {
      return NextResponse.json({ error: "type must be TEXT or PHOTO" }, { status: 400 });
    }
    if (type === "TEXT" && !content) {
      return NextResponse.json({ error: "content is required for TEXT notes" }, { status: 400 });
    }
    if (type === "PHOTO" && (!imageUrl || !publicId)) {
      return NextResponse.json({ error: "imageUrl and publicId are required for PHOTO notes" }, { status: 400 });
    }

    const note = await prisma.doctorNote.create({
      data: {
        medicalHistoryId: id,
        type: type as DoctorNoteType,
        content: type === "TEXT" ? content : null,
        imageUrl: type === "PHOTO" ? imageUrl : null,
        publicId: type === "PHOTO" ? publicId : null,
      },
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/medical-history/[id]/notes]", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
