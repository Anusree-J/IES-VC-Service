import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createCredentialTemplate,
  CREDENTIAL_SCHEMAS,
  CredentialTypeKey,
} from "@/lib/credential-service";

/**
 * POST /api/issuer/regenerate-templates - Regenerate PDF templates for all credential types
 *
 * Use this if templates were not created during initial setup or need to be updated.
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

    // Schema ID mapping
    const schemaIdMap: Record<CredentialTypeKey, string | null> = {
      consumption: issuer.consumptionSchemaId,
      utility_customer: issuer.utilityCustomerSchemaId,
      generation: issuer.generationSchemaId,
      storage: issuer.storageSchemaId,
    };

    const templateResults: Record<string, string> = {};
    console.log("[regenerate-templates] Starting template regeneration...");
    console.log("[regenerate-templates] Schema IDs:", schemaIdMap);

    for (const [typeKey, config] of Object.entries(CREDENTIAL_SCHEMAS)) {
      const credentialType = typeKey as CredentialTypeKey;
      const schemaId = schemaIdMap[credentialType];

      if (!schemaId) {
        console.log(`[regenerate-templates] Skipping ${credentialType} - no schema ID found`);
        templateResults[credentialType] = "ERROR: No schema ID";
        continue;
      }

      console.log(`[regenerate-templates] Creating template for ${credentialType} with schema ${schemaId}...`);

      try {
        const template = await createCredentialTemplate(
          schemaId,
          config.name,
          config.fields.map((f) => ({
            name: f.name,
            description: f.description,
          }))
        );
        console.log(`[regenerate-templates] Created template: ${template.templateId}`);
        templateResults[credentialType] = template.templateId;
      } catch (err) {
        console.error(`[regenerate-templates] Failed to create template for ${credentialType}:`, err);
        templateResults[credentialType] = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    console.log("[regenerate-templates] Template results:", templateResults);

    // Update issuer with new template IDs
    await prisma.issuer.update({
      where: { id: issuer.id },
      data: {
        consumptionTemplateId: templateResults.consumption?.startsWith("ERROR") ? issuer.consumptionTemplateId : (templateResults.consumption || issuer.consumptionTemplateId),
        utilityCustomerTemplateId: templateResults.utility_customer?.startsWith("ERROR") ? issuer.utilityCustomerTemplateId : (templateResults.utility_customer || issuer.utilityCustomerTemplateId),
        generationTemplateId: templateResults.generation?.startsWith("ERROR") ? issuer.generationTemplateId : (templateResults.generation || issuer.generationTemplateId),
        storageTemplateId: templateResults.storage?.startsWith("ERROR") ? issuer.storageTemplateId : (templateResults.storage || issuer.storageTemplateId),
      },
    });

    return NextResponse.json({
      success: true,
      templates: templateResults,
    });
  } catch (error) {
    console.error("Error regenerating templates:", error);
    return NextResponse.json(
      { error: "Failed to regenerate templates", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
