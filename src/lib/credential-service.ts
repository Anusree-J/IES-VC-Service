/**
 * SunbirdRC Credential Service Client
 *
 * This module provides functions to interact with the SunbirdRC Credential Service API
 * for DID generation, schema management, and credential operations.
 */

function getCredentialServiceUrl(): string {
  const url = process.env.CREDENTIAL_SERVICE_URL;
  if (!url) {
    throw new Error("CREDENTIAL_SERVICE_URL environment variable is required");
  }
  return url;
}

// Types for API responses
export interface GenerateDIDResponse {
  id: string;
  type: string;
  publicKeyJwk?: object;
}

export interface CredentialSchema {
  type: string;
  version: string;
  id: string;
  name: string;
  author: string;
  authored: string;
  schema: {
    $id: string;
    $schema: string;
    description: string;
    type: string;
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: boolean;
  };
  proof?: object;
}

export interface TemplateResponse {
  templateId: string;
}

export interface IssuedCredential {
  credential: {
    "@context": string[];
    id: string;
    type: string[];
    issuer: string;
    issuanceDate: string;
    expirationDate?: string;
    credentialSubject: Record<string, unknown>;
    proof?: object;
  };
}

export interface VerifyCredentialResponse {
  status: string;
  checks: {
    proof: boolean;
    status: boolean;
  };
}

// Credential type definitions
export type CredentialTypeKey = "consumption" | "utility_customer" | "generation" | "storage";

export const CREDENTIAL_SCHEMAS: Record<CredentialTypeKey, {
  name: string;
  schemaName: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    options?: string[];
  }>;
}> = {
  consumption: {
    name: "Consumption Profile Credential",
    schemaName: "EnergyConsumptionProfile",
    fields: [
      { name: "id", type: "string", required: true, description: "Customer DID (links to customer)" },
      { name: "consumerNumber", type: "string", required: true, description: "Full consumer account number" },
      { name: "fullName", type: "string", required: true, description: "Consumer name" },
      { name: "premisesType", type: "string", required: true, description: "Premises type", options: ["Residential", "Commercial", "Industrial", "Agricultural"] },
      { name: "connectionType", type: "string", required: true, description: "Connection type", options: ["Single Phase", "Three Phase"] },
      { name: "sanctionedLoadKW", type: "string", required: true, description: "Allotted/approved electrical load in kW" },
      { name: "tariffCategoryCode", type: "string", required: true, description: "Billing category code" },
      { name: "meterNumber", type: "string", required: false, description: "Meter serial number (for linking to specific meter)" },
    ],
  },
  utility_customer: {
    name: "Utility Customer Credential",
    schemaName: "UtilityCustomer",
    fields: [
      { name: "consumerNumber", type: "string", required: true, description: "Full consumer account number assigned by the utility" },
      { name: "maskedIdNumber", type: "string", required: false, description: "Masked government ID (e.g., driving license, national ID)" },
      { name: "fullName", type: "string", required: true, description: "Full name as per ID proof" },
      { name: "fullAddress", type: "string", required: true, description: "Complete street address" },
      { name: "city", type: "string", required: false, description: "City name" },
      { name: "district", type: "string", required: false, description: "District or county name" },
      { name: "stateProvince", type: "string", required: false, description: "State, province, or region" },
      { name: "postalCode", type: "string", required: true, description: "Postal or ZIP code" },
      { name: "country", type: "string", required: true, description: "ISO 3166-1 alpha-2 country code" },
      { name: "meterNumber", type: "string", required: true, description: "Meter serial number" },
      { name: "serviceConnectionDate", type: "string", required: true, description: "Connection activation date (YYYY-MM-DD)" },
    ],
  },
  generation: {
    name: "Generation Profile Credential",
    schemaName: "EnergyGenerationProfile",
    fields: [
      { name: "id", type: "string", required: true, description: "Customer DID (links to customer)" },
      { name: "consumerNumber", type: "string", required: true, description: "Consumer account number" },
      { name: "fullName", type: "string", required: false, description: "Consumer name" },
      { name: "meterNumber", type: "string", required: false, description: "Meter serial number associated with this asset" },
      { name: "assetId", type: "string", required: false, description: "Unique identifier for this generation asset" },
      { name: "generationType", type: "string", required: true, description: "Generation type", options: ["Solar", "Wind", "MicroHydro", "Other"] },
      { name: "capacityKW", type: "string", required: true, description: "Installed generation capacity in kW" },
      { name: "commissioningDate", type: "string", required: true, description: "Date when generation was activated (YYYY-MM-DD)" },
      { name: "manufacturer", type: "string", required: false, description: "Equipment manufacturer" },
      { name: "modelNumber", type: "string", required: false, description: "Equipment model" },
    ],
  },
  storage: {
    name: "Storage Profile Credential",
    schemaName: "EnergyStorageProfile",
    fields: [
      { name: "id", type: "string", required: true, description: "Customer DID (links to customer)" },
      { name: "consumerNumber", type: "string", required: true, description: "Consumer account number" },
      { name: "fullName", type: "string", required: false, description: "Consumer name" },
      { name: "meterNumber", type: "string", required: false, description: "Meter serial number associated with this asset" },
      { name: "assetId", type: "string", required: false, description: "Unique identifier for this storage asset" },
      { name: "storageCapacityKWh", type: "string", required: true, description: "Battery storage capacity in kWh" },
      { name: "powerRatingKW", type: "string", required: true, description: "Charge/discharge power rating in kW" },
      { name: "commissioningDate", type: "string", required: true, description: "Date when storage was activated (YYYY-MM-DD)" },
      { name: "storageType", type: "string", required: false, description: "Storage type", options: ["LithiumIon", "LeadAcid", "FlowBattery", "Other"] },
    ],
  },
};

class CredentialServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "CredentialServiceError";
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getCredentialServiceUrl()}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      if (process.env.NODE_ENV === "development") {
        console.error("[credential-service] Error response:", errorData);
      }
      throw new CredentialServiceError(
        `API request failed: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return handleSuccessResponse<T>(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[credential-service] Fetch error:", error);
    }
    throw error;
  }
}

async function handleSuccessResponse<T>(response: Response): Promise<T> {
  // Handle PDF responses
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/pdf")) {
    return response.blob() as unknown as T;
  }

  return response.json();
}

/**
 * Generate a new DID for an issuer
 */
export async function generateDID(method: string = "rcw"): Promise<GenerateDIDResponse> {
  const response = await apiRequest<GenerateDIDResponse[]>("/identity/did/generate", {
    method: "POST",
    body: JSON.stringify({
      content: [{ alg: "Ed25519", method }],
    }),
  });

  return response[0];
}

/**
 * Create a credential schema
 */
export async function createCredentialSchema(
  authorDid: string,
  schemaName: string,
  schemaVersion: string,
  fields: Array<{ name: string; type: string; required: boolean }>
): Promise<CredentialSchema> {
  // Build the JSON schema properties
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  fields.forEach((field) => {
    properties[field.name] = {
      type: field.type === "string" ? "string" : field.type,
    };
    if (field.required) {
      required.push(field.name);
    }
  });

  // SunbirdRC expects a specific nested schema format
  const schemaBody = {
    tags: ["energy", schemaName.toLowerCase()],
    schema: {
      type: "https://w3c-ccg.github.io/vc-json-schemas/schema/2.0/schema.json",
      version: schemaVersion,
      id: schemaName,
      name: schemaName,
      author: authorDid,
      authored: new Date().toISOString(),
      schema: {
        $id: `${schemaName}-${schemaVersion}`,
        $schema: "https://json-schema.org/draft/2019-09/schema",
        description: `${schemaName} Verifiable Credential Schema`,
        type: "object",
        properties,
        required,
        additionalProperties: true,
      },
    },
  };

  const response = await apiRequest<{ schema: CredentialSchema }>("/credential-schema/credential-schema", {
    method: "POST",
    body: JSON.stringify(schemaBody),
  });

  // The API returns the schema nested inside a "schema" property
  return response.schema;
}

// Template configurations for each credential type
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
    keyFields: ["fullName", "consumerNumber", "installationAddress"],
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

/**
 * Create a PDF template for a credential schema
 */
export async function createCredentialTemplate(
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
              <img class="qr-code" src="{{qrCode}}" alt="Verification QR Code" />
            </div>
            <div class="qr-label">Scan to Verify</div>
            <div class="qr-hint">This credential is cryptographically signed</div>
          </div>
        </div>

        <div class="card-footer">
          <div class="footer-row">
            <span class="footer-label">Issued</span>
            <span class="footer-value">{{issuanceDate}}</span>
          </div>
          <div class="footer-row" style="margin-top: 4px;">
            <span class="footer-label">Credential ID</span>
            <span class="footer-value" style="font-size: 10px;">{{credentialId}}</span>
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

  return apiRequest<TemplateResponse>("/credential-schema/template", {
    method: "POST",
    body: JSON.stringify(templateBody),
  });
}

// Context URLs and types for each credential type
const CREDENTIAL_CONTEXTS: Record<CredentialTypeKey, {
  contextUrl: string;
  credentialType: string;
}> = {
  consumption: {
    contextUrl: "https://anusree-j.github.io/vc_context/energy/consumption-profile-context.json",
    credentialType: "ConsumptionProfileCredential",
  },
  utility_customer: {
    contextUrl: "https://anusree-j.github.io/vc_context/energy/utility-customer-context.json",
    credentialType: "UtilityCustomerCredential",
  },
  generation: {
    contextUrl: "https://anusree-j.github.io/vc_context/energy/generation-profile-context.json",
    credentialType: "GenerationProfileCredential",
  },
  storage: {
    contextUrl: "https://anusree-j.github.io/vc_context/energy/storage-profile-context.json",
    credentialType: "StorageProfileCredential",
  },
};

/**
 * Issue a credential
 */
export async function issueCredential(
  issuerDid: string,
  schemaId: string,
  subjectId: string,
  credentialSubject: Record<string, unknown>,
  credentialType: CredentialTypeKey,
  expirationDate?: string
): Promise<IssuedCredential> {
  const contextInfo = CREDENTIAL_CONTEXTS[credentialType];

  const credentialBody = {
    credential: {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        contextInfo.contextUrl,
      ],
      type: ["VerifiableCredential", contextInfo.credentialType],
      issuer: issuerDid,
      issuanceDate: new Date().toISOString(),
      expirationDate,
      credentialSubject: {
        id: subjectId,
        type: contextInfo.credentialType,
        ...credentialSubject,
      },
    },
    credentialSchemaId: schemaId,
    credentialSchemaVersion: "1.0.0",
    tags: ["energy", credentialType],
  };

  return apiRequest<IssuedCredential>("/credential/credentials/issue", {
    method: "POST",
    body: JSON.stringify(credentialBody),
  });
}

/**
 * Get a credential by ID (JSON format)
 */
export async function getCredential(credentialId: string): Promise<IssuedCredential> {
  return apiRequest<IssuedCredential>(`/credential/credentials/${credentialId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
}

/**
 * Get a credential as rendered HTML using a template
 */
export async function getCredentialHTML(
  credentialId: string,
  templateId: string
): Promise<string> {
  const url = `${getCredentialServiceUrl()}/credential/credentials/${credentialId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html",
      templateId: templateId,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.text();
    } catch {
      errorData = response.statusText;
    }
    throw new CredentialServiceError(
      `Failed to fetch rendered credential: ${response.statusText}`,
      response.status,
      errorData
    );
  }

  return response.text();
}

/**
 * Verify a credential
 */
export async function verifyCredential(credentialId: string): Promise<VerifyCredentialResponse> {
  return apiRequest<VerifyCredentialResponse>(`/credential/credentials/${credentialId}/verify`, {
    method: "GET",
  });
}

/**
 * Revoke a credential
 */
export async function revokeCredential(credentialId: string): Promise<void> {
  await apiRequest<void>(`/credential/credentials/${credentialId}`, {
    method: "DELETE",
  });
}

export { CredentialServiceError };
