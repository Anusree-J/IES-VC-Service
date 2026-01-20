/**
 * SunbirdRC Credential Service Client
 *
 * This module provides functions to interact with the SunbirdRC Credential Service API
 * for DID generation, schema management, and credential operations.
 */

const CREDENTIAL_SERVICE_URL = process.env.CREDENTIAL_SERVICE_URL || "http://35.244.45.209";

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
      { name: "consumerNumber", type: "string", required: true, description: "Unique consumer identifier" },
      { name: "fullName", type: "string", required: true, description: "Consumer full name" },
      { name: "premisesType", type: "string", required: false, description: "Residential/Commercial/Industrial", options: ["Residential", "Commercial", "Industrial"] },
      { name: "connectionType", type: "string", required: false, description: "Electrical connection type", options: ["Single Phase", "Three Phase"] },
      { name: "sanctionedLoadKW", type: "string", required: false, description: "Sanctioned load in kilowatts" },
      { name: "tariffCategoryCode", type: "string", required: false, description: "Tariff category code" },
      { name: "meterNumber", type: "string", required: false, description: "Meter serial number" },
    ],
  },
  utility_customer: {
    name: "Utility Customer Credential",
    schemaName: "UtilityCustomer",
    fields: [
      { name: "consumerNumber", type: "string", required: true, description: "Unique consumer identifier" },
      { name: "fullName", type: "string", required: true, description: "Customer full name" },
      { name: "maskedIdNumber", type: "string", required: false, description: "Masked government ID" },
      { name: "installationAddress", type: "string", required: false, description: "Service installation address" },
      { name: "meterNumber", type: "string", required: false, description: "Meter serial number" },
      { name: "serviceConnectionDate", type: "string", required: false, description: "Date of service connection (YYYY-MM-DD)" },
    ],
  },
  generation: {
    name: "Generation Profile Credential",
    schemaName: "EnergyGenerationProfile",
    fields: [
      { name: "consumerNumber", type: "string", required: true, description: "Prosumer identifier" },
      { name: "fullName", type: "string", required: true, description: "Prosumer full name" },
      { name: "generationType", type: "string", required: true, description: "Type of generation", options: ["Solar PV", "Wind", "Hydro", "Biomass", "Other"] },
      { name: "capacityKW", type: "string", required: false, description: "Generation capacity in kW" },
      { name: "commissioningDate", type: "string", required: false, description: "Date of commissioning (YYYY-MM-DD)" },
      { name: "meterNumber", type: "string", required: false, description: "Generation meter number" },
      { name: "assetId", type: "string", required: false, description: "Unique asset identifier" },
      { name: "equipmentManufacturer", type: "string", required: false, description: "Equipment manufacturer" },
      { name: "equipmentModel", type: "string", required: false, description: "Equipment model" },
    ],
  },
  storage: {
    name: "Storage Profile Credential",
    schemaName: "EnergyStorageProfile",
    fields: [
      { name: "consumerNumber", type: "string", required: true, description: "Consumer identifier" },
      { name: "fullName", type: "string", required: true, description: "Owner full name" },
      { name: "storageType", type: "string", required: true, description: "Type of storage", options: ["Lithium-Ion Battery", "Lead-Acid Battery", "Flow Battery", "Other"] },
      { name: "storageCapacityKWh", type: "string", required: false, description: "Storage capacity in kWh" },
      { name: "powerRatingKW", type: "string", required: false, description: "Power rating in kW" },
      { name: "commissioningDate", type: "string", required: false, description: "Date of commissioning (YYYY-MM-DD)" },
      { name: "meterNumber", type: "string", required: false, description: "Storage meter number" },
      { name: "assetId", type: "string", required: false, description: "Unique asset identifier" },
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
  const url = `${CREDENTIAL_SERVICE_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

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
    throw new CredentialServiceError(
      `API request failed: ${response.statusText}`,
      response.status,
      errorData
    );
  }

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

/**
 * Create a PDF template for a credential schema
 */
export async function createCredentialTemplate(
  schemaId: string,
  templateName: string,
  schemaFields: Array<{ name: string; description: string }>
): Promise<TemplateResponse> {
  // Generate a simple HTML template for the credential
  const fieldsHtml = schemaFields
    .map(
      (field) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${field.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">{{${field.name}}}</td>
      </tr>
    `
    )
    .join("");

  const template = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; color: #1a365d; }
        .subtitle { font-size: 14px; color: #4a5568; margin-top: 8px; }
        .credential-box { border: 2px solid #3182ce; border-radius: 8px; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        .qr-section { text-align: center; margin-top: 30px; }
        .qr-code { width: 150px; height: 150px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #718096; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">IES Energy Verifiable Credential</div>
        <div class="subtitle">${templateName}</div>
      </div>
      <div class="credential-box">
        <table>
          ${fieldsHtml}
        </table>
      </div>
      <div class="qr-section">
        <img class="qr-code" src="{{qrCode}}" alt="QR Code" />
        <p style="font-size: 12px; color: #718096;">Scan to verify this credential</p>
      </div>
      <div class="footer">
        <p>Issued on: {{issuanceDate}}</p>
        <p>Credential ID: {{credentialId}}</p>
      </div>
    </body>
    </html>
  `;

  const templateBody = {
    schemaId,
    template,
    type: "Handlebar",
  };

  return apiRequest<TemplateResponse>("/credential-schema/template", {
    method: "POST",
    body: JSON.stringify(templateBody),
  });
}

/**
 * Issue a credential
 */
export async function issueCredential(
  issuerDid: string,
  schemaId: string,
  subjectId: string,
  credentialSubject: Record<string, unknown>,
  expirationDate?: string
): Promise<IssuedCredential> {
  const credentialBody = {
    credential: {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://www.w3.org/2018/credentials/examples/v1",
      ],
      type: ["VerifiableCredential"],
      issuer: issuerDid,
      issuanceDate: new Date().toISOString(),
      expirationDate,
      credentialSubject: {
        id: subjectId,
        ...credentialSubject,
      },
    },
    credentialSchemaId: schemaId,
    tags: [],
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
 * Get a credential as PDF
 */
export async function getCredentialPDF(
  credentialId: string,
  templateId: string
): Promise<Blob> {
  return apiRequest<Blob>(`/credential/credentials/${credentialId}`, {
    method: "GET",
    headers: {
      Accept: "application/pdf",
      templateId,
    },
  });
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
