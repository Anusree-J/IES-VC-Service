import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/issuer/debug - Debug endpoint to check issuer data
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
      return NextResponse.json({ error: "No issuer found" }, { status: 404 });
    }

    return NextResponse.json({
      issuer: {
        id: issuer.id,
        issuerName: issuer.issuerName,
        issuerDid: issuer.issuerDid,
        schemas: {
          consumption: issuer.consumptionSchemaId,
          utility_customer: issuer.utilityCustomerSchemaId,
          generation: issuer.generationSchemaId,
          storage: issuer.storageSchemaId,
        },
        templates: {
          consumption: issuer.consumptionTemplateId,
          utility_customer: issuer.utilityCustomerTemplateId,
          generation: issuer.generationTemplateId,
          storage: issuer.storageTemplateId,
        },
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Failed to fetch issuer data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
