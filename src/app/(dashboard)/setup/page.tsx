"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  CheckCircle2,
  Loader2,
  Key,
  FileText,
  Zap,
  User,
  Sun,
  Battery,
  AlertCircle,
} from "lucide-react";

const credentialTypes = [
  { name: "Consumption Profile", icon: Zap, color: "bg-blue-500" },
  { name: "Utility Customer", icon: User, color: "bg-purple-500" },
  { name: "Generation Profile", icon: Sun, color: "bg-yellow-500" },
  { name: "Storage Profile", icon: Battery, color: "bg-green-500" },
];

type SetupStep = "name" | "generating" | "complete";

interface SetupResult {
  issuer: {
    id: string;
    issuerDid: string;
    issuerName: string;
    schemas: Record<string, { schemaId: string; templateId: string }>;
  };
}

export default function SetupPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [step, setStep] = useState<SetupStep>("name");
  const [issuerName, setIssuerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");

  const handleSetup = async () => {
    if (!issuerName.trim() || issuerName.trim().length < 2) {
      setError("Please enter a valid issuer name (minimum 2 characters)");
      return;
    }

    setError(null);
    setStep("generating");
    setProgress(0);
    setCurrentTask("Generating your DID...");

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) {
            // Update task description based on progress
            if (prev < 20) {
              setCurrentTask("Generating your DID...");
            } else if (prev < 40) {
              setCurrentTask("Creating Consumption Profile schema...");
            } else if (prev < 55) {
              setCurrentTask("Creating Utility Customer schema...");
            } else if (prev < 70) {
              setCurrentTask("Creating Generation Profile schema...");
            } else if (prev < 85) {
              setCurrentTask("Creating Storage Profile schema...");
            } else {
              setCurrentTask("Finalizing setup...");
            }
            return prev + 5;
          }
          return prev;
        });
      }, 500);

      const response = await fetch("/api/issuer/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerName: issuerName.trim() }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set up issuer");
      }

      const data: SetupResult = await response.json();
      setResult(data);
      setProgress(100);
      setCurrentTask("Setup complete!");
      setStep("complete");

      // Update the session to reflect the new issuer status
      await updateSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("name");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Issuer Setup</h1>

      {step === "name" && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Your Issuer Profile</CardTitle>
            <CardDescription>
              Set up your issuer identity to start issuing IES Energy Verifiable
              Credentials. This will generate your unique Decentralized
              Identifier (DID) and create the required credential schemas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="issuerName">Issuer Name</Label>
              <Input
                id="issuerName"
                placeholder="e.g., Karnataka Power Utility"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                className="max-w-md"
              />
              <p className="text-sm text-gray-500">
                This name will appear on all credentials you issue
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-3">
                What will be created:
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Key className="h-4 w-4 text-blue-600" />
                  <span>
                    A unique Decentralized Identifier (DID) for your
                    organization
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>4 credential schemas with PDF templates:</span>
                </li>
              </ul>
              <div className="ml-6 mt-2 flex flex-wrap gap-2">
                {credentialTypes.map((type) => (
                  <Badge key={type.name} variant="secondary" className="text-xs">
                    {type.name}
                  </Badge>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button onClick={handleSetup} className="w-full sm:w-auto">
              <Key className="h-4 w-4 mr-2" />
              Generate DID & Create Schemas
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "generating" && (
        <Card>
          <CardHeader>
            <CardTitle>Setting Up Your Issuer Profile</CardTitle>
            <CardDescription>
              Please wait while we create your DID and credential schemas...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{currentTask}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {credentialTypes.map((type, index) => {
                const Icon = type.icon;
                const isCompleted = progress > (index + 1) * 20 + 10;
                const isActive =
                  progress > index * 20 + 10 && progress <= (index + 1) * 20 + 10;
                return (
                  <div
                    key={type.name}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isCompleted
                        ? "bg-green-50 border-green-200"
                        : isActive
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`${type.color} p-2 rounded-lg ${
                        !isCompleted && !isActive ? "opacity-40" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span
                      className={`flex-1 ${
                        isCompleted || isActive
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {type.name}
                    </span>
                    {isCompleted && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {isActive && (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && result && (
        <Card className="border-green-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-green-800">Setup Complete!</CardTitle>
                <CardDescription>
                  Your issuer profile has been created successfully
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-gray-500">Issuer Name</Label>
                <p className="font-medium text-gray-900">
                  {result.issuer.issuerName}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">Decentralized Identifier (DID)</Label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                  {result.issuer.issuerDid}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">Created Schemas</Label>
                <div className="mt-2 space-y-2">
                  {credentialTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.name}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <div className={`${type.color} p-1 rounded`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <span>{type.name}</span>
                        <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => router.push("/")} className="flex-1">
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/issue/consumption")}
              >
                Issue First Credential
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
