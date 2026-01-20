"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  QrCode,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  ShieldCheck,
  ShieldX,
  Clock,
  User,
  FileText,
  ExternalLink,
} from "lucide-react";

interface VerificationResult {
  verified: boolean;
  credentialId: string;
  status: string;
  checks: {
    proof: boolean;
    status: boolean;
  };
  credential?: {
    id: string;
    credentialType: string;
    subjectName: string;
    subjectData: Record<string, unknown>;
    issuedAt: string;
    status: string;
  };
  error?: string;
}

export default function VerifyPage() {
  const [credentialId, setCredentialId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setShowScanner(true);
      setError(null);
    } catch {
      setError(
        "Unable to access camera. Please ensure camera permissions are granted."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
  };

  const verifyCredential = async (id: string) => {
    if (!id.trim()) {
      setError("Please enter a credential ID");
      return;
    }

    setIsVerifying(true);
    setResult(null);
    setError(null);

    try {
      // First, try to find the credential in our database
      const credentialResponse = await fetch(
        `/api/credentials?search=${encodeURIComponent(id)}&limit=1`
      );

      let localCredential = null;
      if (credentialResponse.ok) {
        const data = await credentialResponse.json();
        if (data.credentials && data.credentials.length > 0) {
          localCredential = data.credentials[0];
        }
      }

      // Then verify with the credential service
      const verifyResponse = await fetch(
        `/api/credentials/${localCredential?.id || id}/verify`
      );

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "Verification failed");
      }

      const verifyData = await verifyResponse.json();

      setResult({
        verified: verifyData.verified,
        credentialId: id,
        status: verifyData.status,
        checks: verifyData.checks,
        credential: localCredential
          ? {
              id: localCredential.id,
              credentialType: localCredential.credentialType,
              subjectName: localCredential.subjectName,
              subjectData: localCredential.subjectData,
              issuedAt: localCredential.issuedAt,
              status: localCredential.status,
            }
          : undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to verify credential"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCredential(credentialId);
  };

  const formatCredentialType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-3 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Verify Credential
            </h1>
            <p className="text-gray-500">
              Verify the authenticity of a credential by ID or QR code
            </p>
          </div>
        </div>
      </div>

      {/* Verification Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enter Credential ID</CardTitle>
          <CardDescription>
            Enter the credential ID (DID) to verify its authenticity and
            revocation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credentialId">Credential ID</Label>
              <div className="flex gap-2">
                <Input
                  id="credentialId"
                  placeholder="did:rcw:..."
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button type="submit" disabled={isVerifying}>
                  {isVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <div className="text-center">
              {!showScanner ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Scan QR Code
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-square max-w-sm mx-auto">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-white rounded-lg opacity-50" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Position the QR code within the frame
                  </p>
                  <Button type="button" variant="outline" onClick={stopCamera}>
                    Cancel Scan
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg mb-6">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Verification Result */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {result.verified ? (
                <div className="bg-green-100 p-2 rounded-full">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="bg-red-100 p-2 rounded-full">
                  <ShieldX className="h-6 w-6 text-red-600" />
                </div>
              )}
              <div>
                <CardTitle
                  className={result.verified ? "text-green-800" : "text-red-800"}
                >
                  {result.verified
                    ? "Credential Verified"
                    : "Verification Failed"}
                </CardTitle>
                <CardDescription>
                  {result.verified
                    ? "This credential is valid and has not been revoked"
                    : "This credential could not be verified"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Verification Checks */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Verification Checks</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>Cryptographic Proof</span>
                  </div>
                  {result.checks.proof ? (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-300"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>Revocation Status</span>
                  </div>
                  {result.checks.status ? (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-300"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Revoked
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Credential Details */}
            {result.credential && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">
                  Credential Details
                </h4>
                <div className="border rounded-lg divide-y">
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-gray-500">Type</span>
                    <Badge variant="secondary">
                      {formatCredentialType(result.credential.credentialType)}
                    </Badge>
                  </div>
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-gray-500">Subject</span>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {result.credential.subjectName || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-gray-500">Status</span>
                    <Badge
                      variant={
                        result.credential.status === "ISSUED"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {result.credential.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-gray-500">Issued</span>
                    <span>
                      {new Date(result.credential.issuedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Button variant="outline" asChild className="w-full">
                  <Link href={`/credentials`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Credentials List
                  </Link>
                </Button>
              </div>
            )}

            {/* Credential ID */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Credential ID</h4>
              <p className="font-mono text-sm bg-gray-100 p-3 rounded-lg break-all">
                {result.credentialId}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      {!result && !error && (
        <div className="text-center text-gray-500 mt-8">
          <QrCode className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>
            Enter a credential ID or scan a QR code to verify its authenticity
          </p>
        </div>
      )}
    </div>
  );
}
