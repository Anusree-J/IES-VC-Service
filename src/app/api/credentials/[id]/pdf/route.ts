import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCredentialHTML } from "@/lib/credential-service";
import { CredentialType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Pre-created template IDs from SunbirdRC - these are fixed and shared across all issuers
// Templates use flat field paths (e.g., {{fullName}}, {{qr}}) because SunbirdRC Handlebar
// context is flattened to the credentialSubject level, not the root credential level
const TEMPLATE_IDS: Record<CredentialType, string> = {
  CONSUMPTION: "cmknlcflr001qqf0mzv1pooxe",
  UTILITY_CUSTOMER: "cmknldlhd001sqf0mwe5iw1z3",
  GENERATION: "cmknle2dp001uqf0mnxkwrva0",
  STORAGE: "cmknlem37001wqf0mnectuq9t",
};


/**
 * GET /api/credentials/[id]/pdf - Get credential as printable HTML
 */
export async function GET(_request: Request, { params }: RouteParams) {
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

    // Always use the pre-created beautified template IDs
    const templateId = TEMPLATE_IDS[credential.credentialType];

    // Fetch the rendered HTML from SunbirdRC
    try {
      const html = await getCredentialHTML(credential.credentialId, templateId);

      // Wrap with print-friendly styles and auto-print script
      const printableHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Credential - ${credential.credentialId.split(":").pop()}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 10px 20px;
              background: #3182ce;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
            }
            .print-button:hover {
              background: #2c5282;
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
          ${html}
        </body>
        </html>
      `;

      return new NextResponse(printableHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      });
    } catch (err) {
      console.error("Failed to fetch credential from SunbirdRC:", err);
      return NextResponse.json(
        { error: "Failed to generate credential view. The credential service may be unavailable." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Error downloading credential:", error);
    return NextResponse.json(
      { error: "Failed to download credential" },
      { status: 500 }
    );
  }
}
