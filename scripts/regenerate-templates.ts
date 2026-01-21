/**
 * Script to regenerate credential templates in SunbirdRC
 *
 * This script creates new templates for each credential type using the
 * createCredentialTemplate function which includes {{issuerName}} in the footer.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/regenerate-templates.ts
 *
 * Or add to package.json and run: npm run regenerate-templates
 *
 * Prerequisites:
 *   - CREDENTIAL_SERVICE_URL environment variable must be set
 *   - At least one issuer must exist in the database with schema IDs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Credential service URL
function getCredentialServiceUrl(): string {
  const url = process.env.CREDENTIAL_SERVICE_URL;
  if (!url) {
    throw new Error("CREDENTIAL_SERVICE_URL environment variable is required");
  }
  return url;
}

// Types
interface TemplateApiResponse {
  template: {
    templateId: string;
    schemaId: string;
  };
  warnings?: {
    message: string;
    hsbsFields: string[];
    requiredFields: string[];
  };
}

interface TemplateResponse {
  templateId: string;
}

type CredentialTypeKey = "consumption" | "utility_customer" | "generation" | "storage";

// Schema configurations
const CREDENTIAL_SCHEMAS: Record<CredentialTypeKey, {
  name: string;
  fields: Array<{ name: string; description: string }>;
}> = {
  consumption: {
    name: "Consumption Profile Credential",
    fields: [
      { name: "consumerNumber", description: "Full consumer account number" },
      { name: "fullName", description: "Consumer name" },
      { name: "premisesType", description: "Premises type" },
      { name: "connectionType", description: "Connection type" },
      { name: "sanctionedLoadKW", description: "Sanctioned Load (kW)" },
      { name: "tariffCategoryCode", description: "Tariff Category Code" },
      { name: "meterNumber", description: "Meter serial number" },
    ],
  },
  utility_customer: {
    name: "Utility Customer Credential",
    fields: [
      { name: "consumerNumber", description: "Consumer number" },
      { name: "maskedIdNumber", description: "Masked ID Number" },
      { name: "fullName", description: "Full name" },
      { name: "fullAddress", description: "Full Address" },
      { name: "meterNumber", description: "Meter Number" },
      { name: "serviceConnectionDate", description: "Service Connection Date" },
    ],
  },
  generation: {
    name: "Generation Profile Credential",
    fields: [
      { name: "consumerNumber", description: "Consumer account number" },
      { name: "fullName", description: "Consumer name" },
      { name: "meterNumber", description: "Meter serial number" },
      { name: "assetId", description: "Asset ID" },
      { name: "generationType", description: "Generation type" },
      { name: "capacityKW", description: "Capacity (kW)" },
      { name: "commissioningDate", description: "Commissioning Date" },
      { name: "manufacturer", description: "Manufacturer" },
      { name: "modelNumber", description: "Model Number" },
    ],
  },
  storage: {
    name: "Storage Profile Credential",
    fields: [
      { name: "consumerNumber", description: "Consumer account number" },
      { name: "fullName", description: "Consumer name" },
      { name: "meterNumber", description: "Meter serial number" },
      { name: "assetId", description: "Asset ID" },
      { name: "storageCapacityKWh", description: "Storage Capacity (kWh)" },
      { name: "powerRatingKW", description: "Power Rating (kW)" },
      { name: "commissioningDate", description: "Commissioning Date" },
      { name: "storageType", description: "Storage type" },
    ],
  },
};

// Template configurations
interface TemplateConfig {
  title: string;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  keyFields: string[];
}

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  "Consumption Profile Credential": {
    title: "Energy Consumption Profile",
    icon: "⚡",
    gradientFrom: "#667eea",
    gradientTo: "#764ba2",
    accentColor: "#667eea",
    keyFields: ["fullName", "consumerNumber", "sanctionedLoadKW"],
  },
  "Utility Customer Credential": {
    title: "Utility Customer",
    icon: "🏠",
    gradientFrom: "#11998e",
    gradientTo: "#38ef7d",
    accentColor: "#11998e",
    keyFields: ["fullName", "consumerNumber", "fullAddress"],
  },
  "Generation Profile Credential": {
    title: "Energy Generation Profile",
    icon: "☀️",
    gradientFrom: "#f093fb",
    gradientTo: "#f5576c",
    accentColor: "#f5576c",
    keyFields: ["fullName", "generationType", "capacityKW"],
  },
  "Storage Profile Credential": {
    title: "Energy Storage Profile",
    icon: "🔋",
    gradientFrom: "#4facfe",
    gradientTo: "#00f2fe",
    accentColor: "#4facfe",
    keyFields: ["fullName", "storageType", "storageCapacityKWh"],
  },
};

// Schema ID field mapping
const SCHEMA_ID_FIELDS: Record<CredentialTypeKey, string> = {
  consumption: "consumptionSchemaId",
  utility_customer: "utilityCustomerSchemaId",
  generation: "generationSchemaId",
  storage: "storageSchemaId",
};

async function createCredentialTemplate(
  schemaId: string,
  templateName: string,
  schemaFields: Array<{ name: string; description: string }>
): Promise<TemplateResponse> {
  const config = TEMPLATE_CONFIGS[templateName] || {
    title: templateName,
    icon: "📜",
    gradientFrom: "#667eea",
    gradientTo: "#764ba2",
    accentColor: "#667eea",
    keyFields: schemaFields.slice(0, 3).map(f => f.name),
  };

  // Separate key fields from other fields
  const keyFieldsData = schemaFields.filter(f => config.keyFields.includes(f.name));
  const otherFields = schemaFields.filter(f => !config.keyFields.includes(f.name));

  // Generate key fields HTML (prominent display)
  const keyFieldsHtml = keyFieldsData
    .map(
      (field) => `
      <div class="key-field">
        <div class="key-label">${field.description}</div>
        <div class="key-value">{{${field.name}}}</div>
      </div>
    `
    )
    .join("");

  // Generate other fields HTML (compact table)
  const otherFieldsHtml = otherFields.length > 0
    ? otherFields.map(
        (field) => `
        <div class="detail-row">
          <span class="detail-label">${field.description}</span>
          <span class="detail-value">{{${field.name}}}</span>
        </div>
      `
      ).join("")
    : "";

  const template = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .credential-card {
          width: 100%;
          max-width: 420px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        .card-header {
          background: linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%);
          padding: 28px 24px;
          text-align: center;
          position: relative;
        }

        .card-header::after {
          content: '';
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .header-title {
          color: white;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .header-subtitle {
          color: rgba(255, 255, 255, 0.85);
          font-size: 12px;
          font-weight: 500;
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .card-body {
          padding: 36px 24px 24px;
        }

        .key-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .key-field {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 12px;
          padding: 16px;
          border-left: 4px solid ${config.accentColor};
        }

        .key-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .key-value {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          word-break: break-word;
        }

        .details-section {
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          margin-bottom: 24px;
        }

        .details-title {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-size: 13px;
          color: #64748b;
        }

        .detail-value {
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          text-align: right;
          max-width: 60%;
          word-break: break-word;
        }

        .qr-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }

        .qr-wrapper {
          background: white;
          border-radius: 12px;
          padding: 12px;
          display: inline-block;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .qr-code {
          width: 140px;
          height: 140px;
          display: block;
        }

        .qr-label {
          margin-top: 12px;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
        }

        .qr-hint {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .card-footer {
          background: #f8fafc;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
        }

        .footer-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
        }

        .footer-label {
          font-weight: 500;
        }

        .footer-value {
          color: #64748b;
        }

      </style>
    </head>
    <body>
      <div class="credential-card">
        <div class="card-header">
          <div class="header-icon">${config.icon}</div>
          <div class="header-title">${config.title}</div>
          <div class="header-subtitle">Verifiable Credential</div>
        </div>

        <div class="card-body">
          <div class="key-fields">
            ${keyFieldsHtml}
          </div>

          ${otherFields.length > 0 ? `
          <div class="details-section">
            <div class="details-title">Additional Details</div>
            ${otherFieldsHtml}
          </div>
          ` : ""}

          <div class="qr-section">
            <div class="qr-wrapper">
              <img class="qr-code" src="{{qr}}" alt="Verification QR Code" />
            </div>
            <div class="qr-label">Scan to Verify</div>
            <div class="qr-hint">This credential is cryptographically signed</div>
          </div>
        </div>

        <div class="card-footer">
          <div class="footer-row">
            <span class="footer-label">Issued By</span>
            <span class="footer-value">{{issuerName}}</span>
          </div>
          <div class="footer-row" style="margin-top: 4px;">
            <span class="footer-label">Issued On</span>
            <span class="footer-value">{{issuanceDate}}</span>
          </div>
          <div class="footer-row" style="margin-top: 4px;">
            <span class="footer-label">Credential ID</span>
            <span class="footer-value" style="font-size: 10px;">{{id}}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const templateBody = {
    schemaId,
    schemaVersion: "1.0.0",
    template,
    type: "Handlebar",
  };

  const response = await fetch(`${getCredentialServiceUrl()}/credential-schema/template`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(templateBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create template: ${response.statusText} - ${errorText}`);
  }

  const data: TemplateApiResponse = await response.json();
  return { templateId: data.template.templateId };
}

async function main() {
  console.log("🔄 Starting template regeneration...\n");

  // Get the first issuer to get schema IDs
  const issuer = await prisma.issuer.findFirst();

  if (!issuer) {
    console.error("❌ No issuer found in the database. Please set up an issuer first.");
    process.exit(1);
  }

  console.log(`📋 Using issuer: ${issuer.issuerName} (${issuer.issuerDid})\n`);

  const results: Record<string, string> = {};

  for (const [credentialType, config] of Object.entries(CREDENTIAL_SCHEMAS) as [CredentialTypeKey, typeof CREDENTIAL_SCHEMAS[CredentialTypeKey]][]) {
    console.log(`\n🔧 Creating template for: ${config.name}`);

    try {
      // Get schema ID for this credential type
      const schemaIdField = SCHEMA_ID_FIELDS[credentialType] as keyof typeof issuer;
      const schemaId = issuer[schemaIdField] as string;

      if (!schemaId) {
        console.log(`  ⚠️  Skipping - no schema ID found for ${credentialType}`);
        continue;
      }

      console.log(`  📄 Schema ID: ${schemaId}`);

      // Prepare fields for template (only credential subject fields, not issuerName)
      // issuerName is handled separately in the footer via {{issuerName}}
      const schemaFields = config.fields;

      // Create the template
      const templateResponse = await createCredentialTemplate(
        schemaId,
        config.name,
        schemaFields
      );

      console.log(`  ✅ Template created: ${templateResponse.templateId}`);
      results[credentialType] = templateResponse.templateId;

    } catch (error) {
      console.error(`  ❌ Error creating template:`, error);
    }
  }

  console.log("\n\n📦 Generated Template IDs:\n");
  console.log("Copy these to src/app/api/credentials/[id]/pdf/route.ts:\n");
  console.log("const TEMPLATE_IDS: Record<CredentialType, string> = {");
  for (const [type, templateId] of Object.entries(results)) {
    const prismaType = type.toUpperCase().replace("_", "_");
    console.log(`  ${prismaType}: "${templateId}",`);
  }
  console.log("};");

  console.log("\n✅ Template regeneration complete!");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  prisma.$disconnect();
  process.exit(1);
});
