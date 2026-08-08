import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";

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
