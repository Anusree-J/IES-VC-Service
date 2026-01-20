import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCredential } from "@/lib/credential-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/credentials/[id]/json - Download credential as JSON
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

    // Fetch the full credential from SunbirdRC
    try {
      const vcData = await getCredential(credential.credentialId);
      return NextResponse.json(vcData);
    } catch (err) {
      console.error("Failed to fetch from SunbirdRC:", err);

      // Fall back to local data if SunbirdRC is unavailable
      return NextResponse.json({
        credential: {
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://www.w3.org/2018/credentials/examples/v1",
          ],
          id: credential.credentialId,
          type: ["VerifiableCredential"],
          issuer: issuer.issuerDid,
          issuanceDate: credential.issuedAt.toISOString(),
          credentialSubject: {
            id: credential.subjectId,
            ...credential.subjectData as object,
          },
        },
        _note: "Retrieved from local cache - SunbirdRC service unavailable",
      });
    }
  } catch (error) {
    console.error("Error downloading credential JSON:", error);
    return NextResponse.json(
      { error: "Failed to download credential" },
      { status: 500 }
    );
  }
}
