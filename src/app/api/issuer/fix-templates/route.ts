import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Pre-created template IDs from SunbirdRC
const TEMPLATE_IDS = {
  consumption: "cmknii5ps000sqf0mo343rx8h",
  utility_customer: "cmknig41s000qqf0mwrqf98tx",
  generation: "cmknijsc5000uqf0mm7satm62",
  storage: "cmknik2xx000wqf0m0fh41h1u",
};

/**
 * POST /api/issuer/fix-templates - Update issuer with pre-created template IDs
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const issuer = await prisma.issuer.findUnique({
      where: { userId: session.user.id },
    });

    if (!issuer) {
      return NextResponse.json(
        { error: "Issuer not found. Please complete setup first." },
        { status: 404 }
      );
    }

    // Update with pre-created template IDs
    await prisma.issuer.update({
      where: { id: issuer.id },
      data: {
        consumptionTemplateId: TEMPLATE_IDS.consumption,
        utilityCustomerTemplateId: TEMPLATE_IDS.utility_customer,
        generationTemplateId: TEMPLATE_IDS.generation,
        storageTemplateId: TEMPLATE_IDS.storage,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Template IDs updated successfully",
      templates: TEMPLATE_IDS,
    });
  } catch (error) {
    console.error("Error fixing templates:", error);
    return NextResponse.json(
      { error: "Failed to fix templates", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
