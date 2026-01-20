"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Zap,
  User,
  Sun,
  Battery,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Upload,
} from "lucide-react";
import { BulkUpload } from "@/components/bulk-upload";
import { useToast } from "@/hooks/use-toast";

type CredentialType = "consumption" | "utility_customer" | "generation" | "storage";

interface FieldConfig {
  name: string;
  type: string;
  required: boolean;
  description: string;
  options?: string[];
}

interface CredentialTypeConfig {
  name: string;
  schemaName: string;
  fields: FieldConfig[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const credentialConfigs: Record<CredentialType, CredentialTypeConfig> = {
  consumption: {
    name: "Consumption Profile Credential",
    schemaName: "EnergyConsumptionProfile",
    icon: Zap,
    color: "bg-blue-500",
    fields: [
      { name: "consumerNumber", type: "string", required: true, description: "Unique consumer identifier" },
      { name: "fullName", type: "string", required: true, description: "Consumer full name" },
      { name: "premisesType", type: "string", required: false, description: "Premises type", options: ["Residential", "Commercial", "Industrial"] },
      { name: "connectionType", type: "string", required: false, description: "Connection type", options: ["Single Phase", "Three Phase"] },
      { name: "sanctionedLoadKW", type: "string", required: false, description: "Sanctioned load in kilowatts" },
      { name: "tariffCategoryCode", type: "string", required: false, description: "Tariff category code" },
      { name: "meterNumber", type: "string", required: false, description: "Meter serial number" },
    ],
  },
  utility_customer: {
    name: "Utility Customer Credential",
    schemaName: "UtilityCustomer",
    icon: User,
    color: "bg-purple-500",
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
    icon: Sun,
    color: "bg-yellow-500",
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
    icon: Battery,
    color: "bg-green-500",
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

interface IssuedCredentialResult {
  credential: {
    id: string;
    credentialId: string;
    subjectName: string;
  };
}

export default function IssuePage() {
  const params = useParams();
  const router = useRouter();
  const credentialType = params.type as CredentialType;
  const { toast } = useToast();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [issuedCredential, setIssuedCredential] = useState<IssuedCredentialResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  const config = credentialConfigs[credentialType];

  useEffect(() => {
    // Initialize form data with empty strings
    if (config) {
      const initial: Record<string, string> = {};
      config.fields.forEach((field) => {
        initial[field.name] = "";
      });
      setFormData(initial);
    }
  }, [credentialType]);

  if (!config) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Invalid Credential Type
        </h1>
        <p className="text-gray-500 mb-6">
          The credential type &quot;{credentialType}&quot; is not recognized.
        </p>
        <Button asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const Icon = config.icon;

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    config.fields.forEach((field) => {
      if (field.required && !formData[field.name]?.trim()) {
        newErrors[field.name] = `${field.description} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreview = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialType,
          subjectData: formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to issue credential");
      }

      const result: IssuedCredentialResult = await response.json();
      setIssuedCredential(result);
      setShowPreview(false);
      setShowSuccess(true);

      toast({
        title: "Credential issued successfully",
        description: `Credential for ${result.credential.subjectName} has been created`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setSubmitError(errorMessage);
      toast({
        title: "Failed to issue credential",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    const initial: Record<string, string> = {};
    config.fields.forEach((field) => {
      initial[field.name] = "";
    });
    setFormData(initial);
    setErrors({});
    setShowSuccess(false);
    setIssuedCredential(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className={`${config.color} p-3 rounded-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Issue {config.name}
            </h1>
            <p className="text-gray-500">
              Fill in the details to issue a new credential
            </p>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "single"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("single")}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Single Entry
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "bulk"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("bulk")}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Bulk Upload
          </button>
        </div>
      </div>

      {activeTab === "single" ? (
        <Card>
          <CardHeader>
            <CardTitle>Credential Details</CardTitle>
            <CardDescription>
              Enter the subject information for this credential. Fields marked
              with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {submitError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{submitError}</span>
              </div>
            )}

            <div className="grid gap-4">
              {config.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.description}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  {field.options ? (
                    <Select
                      value={formData[field.name] || ""}
                      onValueChange={(value) =>
                        handleInputChange(field.name, value)
                      }
                    >
                      <SelectTrigger
                        className={errors[field.name] ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder={`Select ${field.description.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      placeholder={field.description}
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        handleInputChange(field.name, e.target.value)
                      }
                      className={errors[field.name] ? "border-red-500" : ""}
                    />
                  )}
                  {errors[field.name] && (
                    <p className="text-sm text-red-500">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handlePreview}>
                Preview
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Issue Credential
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Upload</CardTitle>
            <CardDescription>
              Upload a CSV file to issue multiple credentials at once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkUpload
              credentialType={credentialType}
              fields={config.fields}
            />
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview Credential</DialogTitle>
            <DialogDescription>
              Review the credential details before issuing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <div className={`${config.color} p-2 rounded`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <Badge variant="secondary">{config.name}</Badge>
            </div>
            <div className="border rounded-lg divide-y">
              {config.fields
                .filter((field) => formData[field.name]?.trim())
                .map((field) => (
                  <div
                    key={field.name}
                    className="flex justify-between px-4 py-2"
                  >
                    <span className="text-gray-500">{field.description}</span>
                    <span className="font-medium">{formData[field.name]}</span>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Edit
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm & Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-green-800">
                  Credential Issued Successfully!
                </DialogTitle>
                <DialogDescription>
                  The credential has been created and stored
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {issuedCredential && (
              <>
                <div>
                  <Label className="text-gray-500">Subject Name</Label>
                  <p className="font-medium">
                    {issuedCredential.credential.subjectName}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Credential ID</Label>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                    {issuedCredential.credential.credentialId}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/credentials")}>
              View All Credentials
            </Button>
            <Button onClick={resetForm}>
              Issue Another
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
