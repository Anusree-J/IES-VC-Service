import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CREDENTIAL_SCHEMAS, CredentialTypeKey } from "@/lib/credential-service";

/**
 * GET /api/templates/[type]/csv - Download CSV template for bulk upload
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await params;
    const credentialType = type as CredentialTypeKey;

    // Validate credential type
    if (!CREDENTIAL_SCHEMAS[credentialType]) {
      return NextResponse.json(
        { error: "Invalid credential type" },
        { status: 400 }
      );
    }

    const schemaConfig = CREDENTIAL_SCHEMAS[credentialType];

    // Build CSV header from field names
    const headers = schemaConfig.fields.map((field) => field.name);

    // Create example row with sample data
    const exampleRow = schemaConfig.fields.map((field) => {
      // Provide meaningful example data based on field name
      switch (field.name) {
        case "consumerNumber":
          return `${credentialType.toUpperCase().replace("_", "-")}-2026-001`;
        case "fullName":
          return "John Doe";
        case "premisesType":
          return field.options?.[0] || "Residential";
        case "connectionType":
          return field.options?.[0] || "Single Phase";
        case "sanctionedLoadKW":
          return "5";
        case "tariffCategoryCode":
          return "RES-01";
        case "meterNumber":
          return "MET2026001";
        case "maskedIdNumber":
          return "XXXX-XXXX-1234";
        case "installationAddress":
          return "123 Main Street";
        case "serviceConnectionDate":
        case "commissioningDate":
          return "2024-01-15";
        case "generationType":
          return field.options?.[0] || "Solar PV";
        case "storageType":
          return field.options?.[0] || "Lithium-Ion Battery";
        case "capacityKW":
        case "powerRatingKW":
          return "10";
        case "storageCapacityKWh":
          return "13.5";
        case "assetId":
          return "ASSET-001";
        case "equipmentManufacturer":
          return "SunPower";
        case "equipmentModel":
          return "Maxeon 6 AC";
        default:
          return "";
      }
    });

    // Create a second example row
    const exampleRow2 = schemaConfig.fields.map((field) => {
      switch (field.name) {
        case "consumerNumber":
          return `${credentialType.toUpperCase().replace("_", "-")}-2026-002`;
        case "fullName":
          return "Jane Smith";
        case "premisesType":
          return field.options?.[1] || "Commercial";
        case "connectionType":
          return field.options?.[1] || "Three Phase";
        case "sanctionedLoadKW":
          return "25";
        case "tariffCategoryCode":
          return "COM-02";
        case "meterNumber":
          return "MET2026002";
        case "maskedIdNumber":
          return "XXXX-XXXX-5678";
        case "installationAddress":
          return "456 Business Ave";
        case "serviceConnectionDate":
        case "commissioningDate":
          return "2024-03-20";
        case "generationType":
          return field.options?.[1] || "Wind";
        case "storageType":
          return field.options?.[1] || "Lead-Acid Battery";
        case "capacityKW":
        case "powerRatingKW":
          return "50";
        case "storageCapacityKWh":
          return "100";
        case "assetId":
          return "ASSET-002";
        case "equipmentManufacturer":
          return "Vestas";
        case "equipmentModel":
          return "V110-2.0";
        default:
          return "";
      }
    });

    // Build CSV content
    const csvContent = [
      headers.join(","),
      exampleRow.map((val) => `"${val}"`).join(","),
      exampleRow2.map((val) => `"${val}"`).join(","),
    ].join("\n");

    // Return as downloadable CSV file
    const filename = `${credentialType}_template.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating CSV template:", error);
    return NextResponse.json(
      { error: "Failed to generate CSV template" },
      { status: 500 }
    );
  }
}
