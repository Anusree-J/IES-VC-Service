import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/allowed-users/[id] - Remove an allowed user (admin only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if allowed user exists
    const allowedUser = await prisma.allowedUser.findUnique({
      where: { id },
    });

    if (!allowedUser) {
      return NextResponse.json(
        { error: "Allowed user not found" },
        { status: 404 }
      );
    }

    // Delete the allowed user
    await prisma.allowedUser.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing allowed user:", error);
    return NextResponse.json(
      { error: "Failed to remove allowed user" },
      { status: 500 }
    );
  }
}
