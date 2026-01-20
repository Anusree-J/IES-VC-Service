import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCredentialPDF } from "@/lib/credential-service";
import { Issuer } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Map credential types to template ID field names
const TEMPLATE_ID_MAP: Record<string, keyof Issuer> = {
  CONSUMPTION: "consumptionTemplateId",
  UTILITY_CUSTOMER: "utilityCustomerTemplateId",
  GENERATION: "generationTemplateId",
  STORAGE: "storageTemplateId",
};

/**
 * GET /api/credentials/[id]/pdf - Download credential as PDF
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const issuer = await prisma.issuer.findUnique({
      where: { userId: session.user.id },
    });

    if (!issuer) {
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 });
    }

    // Find the credential in our database
    const credential = await prisma.credential.findFirst({
      where: {
        id,
        issuerId: issuer.id,
      },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    // Get the template ID for this credential type
    const templateIdField = TEMPLATE_ID_MAP[credential.credentialType] as keyof Issuer;
    const templateId = templateIdField ? (issuer[templateIdField] as string | null) : null;

    if (!templateId) {
      return NextResponse.json(
        { error: "PDF template not found for this credential type" },
        { status: 400 }
      );
    }

    // Fetch the PDF from SunbirdRC
    try {
      const pdfBlob = await getCredentialPDF(credential.credentialId, templateId);

      // Convert blob to array buffer
      const arrayBuffer = await pdfBlob.arrayBuffer();

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="credential-${credential.credentialId.split(":").pop()}.pdf"`,
        },
      });
    } catch (err) {
      console.error("Failed to fetch PDF from SunbirdRC:", err);
      return NextResponse.json(
        { error: "Failed to generate PDF. The credential service may be unavailable." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Error downloading credential PDF:", error);
    return NextResponse.json(
      { error: "Failed to download credential PDF" },
      { status: 500 }
    );
  }
}
