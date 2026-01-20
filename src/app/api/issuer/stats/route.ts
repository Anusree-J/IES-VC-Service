import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/issuer/stats - Get credential statistics for the current issuer
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const issuer = await prisma.issuer.findUnique({
      where: { userId: session.user.id },
    });

    if (!issuer) {
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 });
    }

    // Get counts by credential type
    const typeCounts = await prisma.credential.groupBy({
      by: ["credentialType"],
      where: {
        issuerId: issuer.id,
        status: "ISSUED",
      },
      _count: true,
    });

    // Get counts by status
    const statusCounts = await prisma.credential.groupBy({
      by: ["status"],
      where: { issuerId: issuer.id },
      _count: true,
    });

    // Get recent credentials
    const recentCredentials = await prisma.credential.findMany({
      where: { issuerId: issuer.id },
      orderBy: { issuedAt: "desc" },
      take: 10,
      select: {
        id: true,
        credentialId: true,
        credentialType: true,
        subjectName: true,
        status: true,
        issuedAt: true,
      },
    });

    // Format the response
    const stats = {
      byType: {
        consumption: 0,
        utility_customer: 0,
        generation: 0,
        storage: 0,
      },
      byStatus: {
        issued: 0,
        revoked: 0,
      },
      total: 0,
      recentCredentials,
    };

    // Map type counts
    typeCounts.forEach((item) => {
      const key = item.credentialType.toLowerCase() as keyof typeof stats.byType;
      stats.byType[key] = item._count;
      stats.total += item._count;
    });

    // Map status counts
    statusCounts.forEach((item) => {
      const key = item.status.toLowerCase() as keyof typeof stats.byStatus;
      stats.byStatus[key] = item._count;
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
