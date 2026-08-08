import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";

// PATCH /api/medical-history/[id]/notes/[noteId]  (admin — edit a text Doctor's Note)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id, noteId } = await params;
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const note = await prisma.doctorNote.findUnique({ where: { id: noteId } });
    if (!note || note.medicalHistoryId !== id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (note.type !== "TEXT") {
      return NextResponse.json({ error: "Only text notes can be edited" }, { status: 400 });
    }

    const updated = await prisma.doctorNote.update({
      where: { id: noteId },
      data: { content },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/medical-history/[id]/notes/[noteId]]", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

// DELETE /api/medical-history/[id]/notes/[noteId]  (admin — remove a Doctor's Note)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const { id, noteId } = await params;

    const note = await prisma.doctorNote.findUnique({ where: { id: noteId } });
    if (!note || note.medicalHistoryId !== id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await prisma.doctorNote.delete({ where: { id: noteId } });

    return NextResponse.json({ message: "Note deleted" });
  } catch (error) {
    console.error("[DELETE /api/medical-history/[id]/notes/[noteId]]", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
