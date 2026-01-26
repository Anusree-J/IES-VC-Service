import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/credentials - Get all credentials system-wide (admin only)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const issuerId = searchParams.get("issuerId");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (type && type !== "all") {
      where.credentialType = type;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (issuerId) {
      where.issuerId = issuerId;
    }

    if (search) {
      where.OR = [
        { subjectName: { contains: search, mode: "insensitive" } },
        { credentialId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [credentials, total] = await Promise.all([
      prisma.credential.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: "desc" },
        include: {
          issuer: {
            select: {
              id: true,
              issuerName: true,
              issuerDid: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          revokedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.credential.count({ where }),
    ]);

    return NextResponse.json({
      credentials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}
