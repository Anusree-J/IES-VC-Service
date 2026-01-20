import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeCredential as revokeCredentialService } from "@/lib/credential-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/credentials/[id] - Get credential details
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

    const credential = await prisma.credential.findFirst({
      where: {
        id,
        issuerId: issuer.id,
      },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    return NextResponse.json(credential);
  } catch (error) {
    console.error("Error fetching credential:", error);
    return NextResponse.json(
      { error: "Failed to fetch credential" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/credentials/[id] - Revoke a credential
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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

    // Find the credential
    const credential = await prisma.credential.findFirst({
      where: {
        id,
        issuerId: issuer.id,
      },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    if (credential.status === "REVOKED") {
      return NextResponse.json(
        { error: "Credential is already revoked" },
        { status: 400 }
      );
    }

    // Revoke in SunbirdRC
    try {
      await revokeCredentialService(credential.credentialId);
    } catch (err) {
      console.error("Failed to revoke in SunbirdRC:", err);
      // Continue with local revocation even if SunbirdRC fails
    }

    // Update local database
    const updatedCredential = await prisma.credential.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      credential: {
        id: updatedCredential.id,
        status: updatedCredential.status,
        revokedAt: updatedCredential.revokedAt,
      },
    });
  } catch (error) {
    console.error("Error revoking credential:", error);
    return NextResponse.json(
      { error: "Failed to revoke credential" },
      { status: 500 }
    );
  }
}
