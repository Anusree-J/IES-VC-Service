import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats - Get system-wide statistics (admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all statistics in parallel
    const [
      totalUsers,
      totalIssuers,
      totalCredentials,
      totalAllowedUsers,
      credentialsByStatus,
      credentialsByType,
      recentCredentials,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.issuer.count(),
      prisma.credential.count(),
      prisma.allowedUser.count(),
      prisma.credential.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.credential.groupBy({
        by: ["credentialType"],
        _count: true,
      }),
      prisma.credential.findMany({
        take: 10,
        orderBy: { issuedAt: "desc" },
        include: {
          issuer: {
            select: {
              issuerName: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          issuer: {
            select: {
              id: true,
              issuerName: true,
            },
          },
        },
      }),
    ]);

    // Format credentials by status
    const statusCounts = {
      ISSUED: 0,
      REVOKED: 0,
    };
    credentialsByStatus.forEach((item) => {
      statusCounts[item.status] = item._count;
    });

    // Format credentials by type
    const typeCounts = {
      CONSUMPTION: 0,
      UTILITY_CUSTOMER: 0,
      GENERATION: 0,
      STORAGE: 0,
    };
    credentialsByType.forEach((item) => {
      typeCounts[item.credentialType] = item._count;
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalIssuers,
        totalCredentials,
        totalAllowedUsers,
        issuedCredentials: statusCounts.ISSUED,
        revokedCredentials: statusCounts.REVOKED,
        credentialsByType: typeCounts,
      },
      recentCredentials,
      recentUsers,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
