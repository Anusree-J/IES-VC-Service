import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/allowed-users - List all allowed users (admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedUsers = await prisma.allowedUser.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        addedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ allowedUsers });
  } catch (error) {
    console.error("Error fetching allowed users:", error);
    return NextResponse.json(
      { error: "Failed to fetch allowed users" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/allowed-users - Add a new allowed user (admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already exists
    const existing = await prisma.allowedUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email is already in the allowed list" },
        { status: 409 }
      );
    }

    // Create allowed user
    const allowedUser = await prisma.allowedUser.create({
      data: {
        email: normalizedEmail,
        addedById: session.user.id,
      },
      include: {
        addedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ allowedUser }, { status: 201 });
  } catch (error) {
    console.error("Error adding allowed user:", error);
    return NextResponse.json(
      { error: "Failed to add allowed user" },
      { status: 500 }
    );
  }
}
