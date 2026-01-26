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
// Templates use flat field paths (e.g., {{fullName}}, {{qrCode}}, {{issuerName}}) because
// SunbirdRC Handlebar context is flattened to the credentialSubject level
// Regenerated with: npm run regenerate-templates
const TEMPLATE_IDS: Record<CredentialType, string> = {
  CONSUMPTION: "cmkoi3ywn0038qf0mfxbqyzd1",
  UTILITY_CUSTOMER: "cmkoi3yzo003aqf0mw61yv4mu",
  GENERATION: "cmkoi3z3s003cqf0mke3jn02a",
  STORAGE: "cmkoi3z5c003eqf0m3brr2nyc",
};

/**
 * Convert external image URLs to base64 data URLs server-side
 * This bypasses CORS restrictions that prevent client-side capture
 */
async function embedImagesAsDataURLs(html: string): Promise<string> {
  // Find all img src attributes
  const imgSrcRegex = /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi;
  let match;
  const replacements: Array<{ original: string; replacement: string }> = [];

  while ((match = imgSrcRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const beforeSrc = match[1];
    const src = match[2];
    const afterSrc = match[3];

    // Skip if already a data URL
    if (src.startsWith("data:")) {
      continue;
    }

    try {
      // Fetch the image server-side (no CORS restrictions)
      const response = await fetch(src);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = response.headers.get("content-type") || "image/png";
        const dataUrl = `data:${contentType};base64,${base64}`;

        const newTag = `<img${beforeSrc}src="${dataUrl}"${afterSrc}>`;
        replacements.push({ original: fullTag, replacement: newTag });
      }
    } catch (err) {
      console.error(`Failed to embed image ${src}:`, err);
      // Keep original src if fetch fails
    }
  }

  // Apply all replacements
  let result = html;
  for (const { original, replacement } of replacements) {
    result = result.replace(original, replacement);
  }

  return result;
}

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
      let html = await getCredentialHTML(credential.credentialId, templateId);

      // Embed all images as data URLs server-side to avoid CORS issues on client
      html = await embedImagesAsDataURLs(html);

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
