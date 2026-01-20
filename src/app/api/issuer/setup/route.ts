import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateDID,
  createCredentialSchema,
  createCredentialTemplate,
  CREDENTIAL_SCHEMAS,
  CredentialTypeKey,
} from "@/lib/credential-service";

interface SetupRequestBody {
  issuerName: string;
}

/**
 * POST /api/issuer/setup - Set up issuer profile with DID and schemas
 *
 * This endpoint:
 * 1. Generates a new DID for the issuer
 * 2. Creates all 4 credential schemas
 * 3. Creates PDF templates for each schema
 * 4. Stores everything in the database
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has an issuer
    const existingIssuer = await prisma.issuer.findUnique({
      where: { userId: session.user.id },
    });

    if (existingIssuer) {
      return NextResponse.json(
        { error: "Issuer already exists for this user" },
        { status: 400 }
      );
    }

    // Parse request body
    const body: SetupRequestBody = await request.json();

    if (!body.issuerName || body.issuerName.trim().length < 2) {
      return NextResponse.json(
        { error: "Issuer name is required (minimum 2 characters)" },
        { status: 400 }
      );
    }

    const issuerName = body.issuerName.trim();

    // Step 1: Generate DID
    console.log("Generating DID...");
    const didResponse = await generateDID();
    const issuerDid = didResponse.id;
    console.log("Generated DID:", issuerDid);

    // Step 2: Create schemas and templates for all credential types
    const schemaVersion = "1.0.0";
    const schemaResults: Record<
      CredentialTypeKey,
      { schemaId: string; templateId: string }
    > = {
      consumption: { schemaId: "", templateId: "" },
      utility_customer: { schemaId: "", templateId: "" },
      generation: { schemaId: "", templateId: "" },
      storage: { schemaId: "", templateId: "" },
    };

    for (const [typeKey, config] of Object.entries(CREDENTIAL_SCHEMAS)) {
      const credentialType = typeKey as CredentialTypeKey;
      console.log(`Creating schema for ${credentialType}...`);

      // Create schema
      const schema = await createCredentialSchema(
        issuerDid,
        config.schemaName,
        schemaVersion,
        config.fields.map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
        }))
      );
      console.log(`Created schema: ${schema.id}`);

      // Create template
      const template = await createCredentialTemplate(
        schema.id,
        config.name,
        config.fields.map((f) => ({
          name: f.name,
          description: f.description,
        }))
      );
      console.log(`Created template: ${template.templateId}`);

      schemaResults[credentialType] = {
        schemaId: schema.id,
        templateId: template.templateId,
      };
    }

    // Step 3: Store in database
    const issuer = await prisma.issuer.create({
      data: {
        userId: session.user.id,
        issuerDid,
        issuerName,
        consumptionSchemaId: schemaResults.consumption.schemaId,
        consumptionTemplateId: schemaResults.consumption.templateId,
        utilityCustomerSchemaId: schemaResults.utility_customer.schemaId,
        utilityCustomerTemplateId: schemaResults.utility_customer.templateId,
        generationSchemaId: schemaResults.generation.schemaId,
        generationTemplateId: schemaResults.generation.templateId,
        storageSchemaId: schemaResults.storage.schemaId,
        storageTemplateId: schemaResults.storage.templateId,
      },
    });

    return NextResponse.json({
      success: true,
      issuer: {
        id: issuer.id,
        issuerDid: issuer.issuerDid,
        issuerName: issuer.issuerName,
        schemas: schemaResults,
      },
    });
  } catch (error) {
    console.error("Error setting up issuer:", error);

    // Provide more specific error messages
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
      { error: "Failed to set up issuer" },
      { status: 500 }
    );
  }
}
