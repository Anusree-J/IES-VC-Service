import { NextResponse } from "next/server";

export async function GET() {
  const CREDENTIAL_SERVICE_URL = process.env.CREDENTIAL_SERVICE_URL || "http://35.244.45.209";

  console.log("=== TEST CONNECTION ===");
  console.log("CREDENTIAL_SERVICE_URL from env:", process.env.CREDENTIAL_SERVICE_URL);
  console.log("Using URL:", CREDENTIAL_SERVICE_URL);

  try {
    const url = `${CREDENTIAL_SERVICE_URL}/identity/did/generate`;
    console.log("Fetching:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: [{ alg: "Ed25519", method: "rcw" }] }),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      console.log("Error response:", text);
      return NextResponse.json({
        success: false,
        status: response.status,
        error: text
      }, { status: 500 });
    }

    const data = await response.json();
    console.log("Success! DID:", data[0]?.id);

    return NextResponse.json({
      success: true,
      url: CREDENTIAL_SERVICE_URL,
      did: data[0]?.id
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({
      success: false,
      url: CREDENTIAL_SERVICE_URL,
      error: error instanceof Error ? error.message : "Unknown error",
      cause: error instanceof Error ? String(error.cause) : undefined
    }, { status: 500 });
  }
}
