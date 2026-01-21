"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

interface CredentialDetailsDialogProps {
  credential: Credential | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  CONSUMPTION: "Consumption Profile Credential",
  UTILITY_CUSTOMER: "Utility Customer Credential",
  GENERATION: "Generation Profile Credential",
  STORAGE: "Storage Profile Credential",
};

const FIELD_LABELS: Record<string, string> = {
  issuerName: "Issued By",
  consumerNumber: "Consumer Number",
  fullName: "Full Name",
  premisesType: "Premises Type",
  connectionType: "Connection Type",
  sanctionedLoadKW: "Sanctioned Load (kW)",
  tariffCategoryCode: "Tariff Category Code",
  meterNumber: "Meter Number",
  maskedIdNumber: "Masked ID Number",
  fullAddress: "Full Address",
  serviceConnectionDate: "Service Connection Date",
  generationType: "Generation Type",
  capacityKW: "Capacity (kW)",
  commissioningDate: "Commissioning Date",
  assetId: "Asset ID",
  manufacturer: "Manufacturer",
  modelNumber: "Model Number",
  storageType: "Storage Type",
  storageCapacityKWh: "Storage Capacity (kWh)",
  powerRatingKW: "Power Rating (kW)",
};

export function CredentialDetailsDialog({
  credential,
  open,
  onOpenChange,
}: CredentialDetailsDialogProps) {
  if (!credential) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const subjectData = credential.subjectData as Record<string, string>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {CREDENTIAL_TYPE_LABELS[credential.credentialType]}
            <Badge
              variant={credential.status === "ISSUED" ? "default" : "destructive"}
            >
              {credential.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Credential Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Credential Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Credential ID</span>
                <span className="text-sm font-mono text-gray-900 break-all text-right max-w-[60%]">
                  {credential.credentialId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subject ID</span>
                <span className="text-sm font-mono text-gray-900 break-all text-right max-w-[60%]">
                  {credential.subjectId || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Issued At</span>
                <span className="text-sm text-gray-900">
                  {formatDate(credential.issuedAt)}
                </span>
              </div>
              {credential.revokedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revoked At</span>
                  <span className="text-sm text-red-600">
                    {formatDate(credential.revokedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Subject Data */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Credential Subject
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="space-y-3">
                {Object.entries(subjectData).map(([key, value]) => {
                  if (!value || value === "") return null;
                  return (
                    <div key={key} className="flex justify-between">
                      <dt className="text-sm text-gray-600">
                        {FIELD_LABELS[key] || key}
                      </dt>
                      <dd className="text-sm text-gray-900 font-medium">
                        {value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>

          <Separator />

          {/* Raw JSON Preview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Raw Data
            </h3>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
              {JSON.stringify(credential.subjectData, null, 2)}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
