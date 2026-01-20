import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  issueCredential,
  CREDENTIAL_SCHEMAS,
  CredentialTypeKey,
} from "@/lib/credential-service";
import { CredentialType } from "@prisma/client";

interface IssueCredentialRequest {
  credentialType: CredentialTypeKey;
  subjectData: Record<string, string>;
}

/**
 * GET /api/credentials - List credentials with pagination and filtering
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const issuer = await prisma.issuer.findUnique({
      where: { userId: session.user.id },
    });

    if (!issuer) {
      return NextResponse.json({ error: "Issuer not found" }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build where clause
    const where: Record<string, unknown> = { issuerId: issuer.id };

    if (type && type !== "all") {
      where.credentialType = type.toUpperCase() as CredentialType;
    }

    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    if (search) {
      where.OR = [
        { subjectName: { contains: search, mode: "insensitive" } },
        { credentialId: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await prisma.credential.count({ where });

    // Get credentials
    const credentials = await prisma.credential.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        credentialId: true,
        credentialType: true,
        subjectId: true,
        subjectName: true,
        subjectData: true,
        status: true,
        issuedAt: true,
        revokedAt: true,
      },
    });

    return NextResponse.json({
      credentials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credentials - Issue a new credential
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get issuer
    const issuer = await prisma.issuer.findUnique({
      where: { userId: session.user.id },
    });

    if (!issuer) {
      return NextResponse.json(
        { error: "Issuer not set up. Please complete issuer setup first." },
        { status: 400 }
      );
    }

    // Parse request body
    const body: IssueCredentialRequest = await request.json();
    const { credentialType, subjectData } = body;

    // Validate credential type
    if (!CREDENTIAL_SCHEMAS[credentialType]) {
      return NextResponse.json(
        { error: "Invalid credential type" },
        { status: 400 }
      );
    }

    const schemaConfig = CREDENTIAL_SCHEMAS[credentialType];

    // Validate required fields
    const missingFields: string[] = [];
    schemaConfig.fields.forEach((field) => {
      if (field.required && !subjectData[field.name]?.trim()) {
        missingFields.push(field.description);
      }
    });

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Get the schema ID for this credential type
    const schemaIdKey = `${credentialType === "utility_customer" ? "utilityCustomer" : credentialType}SchemaId` as keyof typeof issuer;
    const schemaId = issuer[schemaIdKey] as string;

    if (!schemaId) {
      return NextResponse.json(
        { error: "Schema not found for this credential type" },
        { status: 400 }
      );
    }

    // Generate subject ID
    const subjectId = `did:rcw:${credentialType}-${subjectData.consumerNumber}-${Date.now()}`;

    // Issue the credential via SunbirdRC
    console.log("Issuing credential...", {
      issuerDid: issuer.issuerDid,
      schemaId,
      subjectId,
    });

    const issuedCredential = await issueCredential(
      issuer.issuerDid,
      schemaId,
      subjectId,
      subjectData,
      credentialType
    );

    console.log("Credential issued:", issuedCredential.credential.id);

    // Map credential type to Prisma enum
    const credentialTypeMap: Record<CredentialTypeKey, CredentialType> = {
      consumption: "CONSUMPTION",
      utility_customer: "UTILITY_CUSTOMER",
      generation: "GENERATION",
      storage: "STORAGE",
    };

    // Store in database
    const credential = await prisma.credential.create({
      data: {
        issuerId: issuer.id,
        credentialId: issuedCredential.credential.id,
        credentialType: credentialTypeMap[credentialType],
        subjectId,
        subjectName: subjectData.fullName || null,
        subjectData,
        status: "ISSUED",
      },
    });

    return NextResponse.json({
      success: true,
      credential: {
        id: credential.id,
        credentialId: credential.credentialId,
        subjectName: credential.subjectName,
      },
    });
  } catch (error) {
    console.error("Error issuing credential:", error);

    if (error instanceof Error) {
      if (error.message.includes("API request failed")) {
        return NextResponse.json(
          {
            error: "Failed to communicate with credential service",
            details: error.message,
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to issue credential" },
      { status: 500 }
    );
  }
}
