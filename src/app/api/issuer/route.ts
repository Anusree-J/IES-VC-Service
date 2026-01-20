import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/issuer - Get current user's issuer profile
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const issuer = await prisma.issuer.findUnique({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: {
            credentials: true,
          },
        },
      },
    });

    if (!issuer) {
      return NextResponse.json({ issuer: null });
    }

    // Get credential counts by type and status
    const credentialStats = await prisma.credential.groupBy({
      by: ["credentialType", "status"],
      where: { issuerId: issuer.id },
      _count: true,
    });

    return NextResponse.json({
      issuer: {
        id: issuer.id,
        issuerDid: issuer.issuerDid,
        issuerName: issuer.issuerName,
        schemas: {
          consumption: {
            schemaId: issuer.consumptionSchemaId,
            templateId: issuer.consumptionTemplateId,
          },
          utility_customer: {
            schemaId: issuer.utilityCustomerSchemaId,
            templateId: issuer.utilityCustomerTemplateId,
          },
          generation: {
            schemaId: issuer.generationSchemaId,
            templateId: issuer.generationTemplateId,
          },
          storage: {
            schemaId: issuer.storageSchemaId,
            templateId: issuer.storageTemplateId,
          },
        },
        credentialStats,
        totalCredentials: issuer._count.credentials,
        createdAt: issuer.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching issuer:", error);
    return NextResponse.json(
      { error: "Failed to fetch issuer" },
      { status: 500 }
    );
  }
}
