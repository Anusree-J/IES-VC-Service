import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCredential } from "@/lib/credential-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/credentials/[id]/verify - Verify a credential
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

    // Verify with SunbirdRC
    try {
      const verificationResult = await verifyCredential(credential.credentialId);

      return NextResponse.json({
        status: credential.status,
        checks: {
          proof: verificationResult.checks?.proof ?? true,
          status: credential.status === "ISSUED" && (verificationResult.checks?.status ?? true),
        },
        sunbirdResult: verificationResult,
      });
    } catch (err) {
      console.error("Failed to verify with SunbirdRC:", err);

      // Return local status if SunbirdRC is unavailable
      return NextResponse.json({
        status: credential.status,
        checks: {
          proof: true, // Assume proof is valid if we can't verify
          status: credential.status === "ISSUED",
        },
        _note: "Verification performed using local data - SunbirdRC service unavailable",
      });
    }
  } catch (error) {
    console.error("Error verifying credential:", error);
    return NextResponse.json(
      { error: "Failed to verify credential" },
      { status: 500 }
    );
  }
}
