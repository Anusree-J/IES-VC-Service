"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface RevokeCredentialDialogProps {
  credential: Credential | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  CONSUMPTION: "Consumption Profile",
  UTILITY_CUSTOMER: "Utility Customer",
  GENERATION: "Generation Profile",
  STORAGE: "Storage Profile",
};

export function RevokeCredentialDialog({
  credential,
  open,
  onOpenChange,
  onSuccess,
}: RevokeCredentialDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!credential) return null;

  const handleRevoke = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/credentials/${credential.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to revoke credential");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600">Revoke Credential</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this credential? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Type</span>
              <span className="font-medium">
                {CREDENTIAL_TYPE_LABELS[credential.credentialType]}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subject</span>
              <span className="font-medium">
                {credential.subjectName || "-"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Credential ID</span>
              <span className="font-mono text-xs">
                {credential.credentialId.length > 30
                  ? `${credential.credentialId.substring(0, 15)}...${credential.credentialId.substring(credential.credentialId.length - 12)}`
                  : credential.credentialId}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={loading}
          >
            {loading ? "Revoking..." : "Revoke Credential"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
