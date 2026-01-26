import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/issuers - Get all issuers with their statistics (admin only)
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

    const issuers = await prisma.issuer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            credentials: true,
          },
        },
      },
    });

    // Get credential counts by status for each issuer
    const issuerStats = await Promise.all(
      issuers.map(async (issuer) => {
        const [issuedCount, revokedCount] = await Promise.all([
          prisma.credential.count({
            where: { issuerId: issuer.id, status: "ISSUED" },
          }),
          prisma.credential.count({
            where: { issuerId: issuer.id, status: "REVOKED" },
          }),
        ]);

        return {
          ...issuer,
          stats: {
            total: issuer._count.credentials,
            issued: issuedCount,
            revoked: revokedCount,
          },
        };
      })
    );

    return NextResponse.json({ issuers: issuerStats });
  } catch (error) {
    console.error("Error fetching issuers:", error);
    return NextResponse.json(
      { error: "Failed to fetch issuers" },
      { status: 500 }
    );
  }
}
