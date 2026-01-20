"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Credential {
  id: string;
  credentialId: string;
  credentialType: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectData: Record<string, unknown>;
  status: string;
  issuedAt: string;
  revokedAt: string | null;
}

interface VerifyCredentialDialogProps {
  credential: Credential | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VerificationResult {
  status: string;
  checks: {
    proof: boolean;
    status: boolean;
  };
}

export function VerifyCredentialDialog({
  credential,
  open,
  onOpenChange,
}: VerifyCredentialDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    if (open && credential) {
      verifyCredential();
    } else {
      setResult(null);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, credential]);

  const verifyCredential = async () => {
    if (!credential) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/credentials/${credential.id}/verify`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify credential");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!credential) return null;

  const isValid = result?.status === "ISSUED" && result?.checks?.proof && result?.checks?.status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credential Verification</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500">Verifying credential...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XIcon className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-red-600 font-medium">Verification Failed</p>
              <p className="text-gray-500 text-sm mt-2">{error}</p>
              <Button onClick={verifyCredential} className="mt-4">
                Retry
              </Button>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Overall Status */}
              <div className="text-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    isValid ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {isValid ? (
                    <CheckIcon className="w-10 h-10 text-green-600" />
                  ) : (
                    <XIcon className="w-10 h-10 text-red-600" />
                  )}
                </div>
                <h3 className={`text-xl font-semibold ${isValid ? "text-green-600" : "text-red-600"}`}>
                  {isValid ? "Credential Valid" : "Credential Invalid"}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  {isValid
                    ? "This credential has been verified successfully"
                    : "This credential failed verification checks"}
                </p>
              </div>

              {/* Verification Checks */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900 mb-3">Verification Checks</h4>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.checks?.proof ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm">Cryptographic Proof</span>
                  </div>
                  <Badge variant={result.checks?.proof ? "default" : "destructive"}>
                    {result.checks?.proof ? "Valid" : "Invalid"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.checks?.status ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm">Revocation Status</span>
                  </div>
                  <Badge variant={result.checks?.status ? "default" : "destructive"}>
                    {result.checks?.status ? "Not Revoked" : "Revoked"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <InfoIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm">Local Status</span>
                  </div>
                  <Badge variant={credential.status === "ISSUED" ? "default" : "destructive"}>
                    {credential.status}
                  </Badge>
                </div>
              </div>

              {/* Credential Info */}
              <div className="text-sm text-gray-500 space-y-1">
                <p>
                  <span className="font-medium">Credential ID:</span>{" "}
                  <span className="font-mono text-xs">{credential.credentialId}</span>
                </p>
                <p>
                  <span className="font-medium">Subject:</span> {credential.subjectName || "-"}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
