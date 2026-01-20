"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Trash2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FieldConfig {
  name: string;
  type: string;
  required: boolean;
  description: string;
  options?: string[];
}

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  isValid: boolean;
  errors: string[];
}

interface IssuanceResult {
  rowNumber: number;
  success: boolean;
  credentialId?: string;
  error?: string;
}

interface BulkUploadProps {
  credentialType: string;
  fields: FieldConfig[];
}

export function BulkUpload({ credentialType, fields }: BulkUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issuanceProgress, setIssuanceProgress] = useState(0);
  const [issuanceResults, setIssuanceResults] = useState<IssuanceResult[]>([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validRows = parsedRows.filter((row) => row.isValid);
  const invalidRows = parsedRows.filter((row) => !row.isValid);

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    // Validate headers
    const fieldNames = fields.map((f) => f.name);
    const missingHeaders = fieldNames.filter((name) => !headers.includes(name));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
    }

    // Parse data rows
    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const data: Record<string, string> = {};

      headers.forEach((header, index) => {
        data[header] = values[index]?.trim() || "";
      });

      // Validate row
      const errors: string[] = [];
      fields.forEach((field) => {
        if (field.required && !data[field.name]?.trim()) {
          errors.push(`${field.description} is required`);
        }
        if (field.options && data[field.name] && !field.options.includes(data[field.name])) {
          errors.push(
            `${field.description} must be one of: ${field.options.join(", ")}`
          );
        }
      });

      rows.push({
        rowNumber: i + 1,
        data,
        isValid: errors.length === 0,
        errors,
      });
    }

    return rows;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  };

  const handleFile = useCallback(
    (selectedFile: File) => {
      if (!selectedFile.name.endsWith(".csv")) {
        setParseError("Please upload a CSV file");
        return;
      }

      if (selectedFile.size > 1024 * 1024) {
        setParseError("File size must be less than 1MB");
        return;
      }

      setFile(selectedFile);
      setParseError(null);
      setParsedRows([]);
      setIssuanceResults([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const rows = parseCSV(content);

          if (rows.length > 100) {
            setParseError("Maximum 100 rows allowed per upload");
            toast({
              title: "File too large",
              description: "Maximum 100 rows allowed per upload",
              variant: "destructive",
            });
            return;
          }

          setParsedRows(rows);
          const validCount = rows.filter((r) => r.isValid).length;
          const invalidCount = rows.filter((r) => !r.isValid).length;

          toast({
            title: "File parsed successfully",
            description: `${validCount} valid row${validCount !== 1 ? "s" : ""}${invalidCount > 0 ? `, ${invalidCount} with errors` : ""}`,
          });
        } catch (error) {
          setParseError(
            error instanceof Error ? error.message : "Failed to parse CSV"
          );
          toast({
            title: "Failed to parse CSV",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(selectedFile);
    },
    [fields, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
    },
    [handleFile]
  );

  const clearFile = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setIssuanceResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const issueCredentials = async () => {
    if (validRows.length === 0) return;

    setIsIssuing(true);
    setIssuanceProgress(0);
    setIssuanceResults([]);

    const results: IssuanceResult[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      try {
        const response = await fetch("/api/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credentialType,
            subjectData: row.data,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          results.push({
            rowNumber: row.rowNumber,
            success: false,
            error: errorData.error || "Failed to issue credential",
          });
        } else {
          const data = await response.json();
          results.push({
            rowNumber: row.rowNumber,
            success: true,
            credentialId: data.credential.credentialId,
          });
        }
      } catch (error) {
        results.push({
          rowNumber: row.rowNumber,
          success: false,
          error: error instanceof Error ? error.message : "Network error",
        });
      }

      setIssuanceProgress(Math.round(((i + 1) / validRows.length) * 100));
      setIssuanceResults([...results]);
    }

    setIsIssuing(false);
    setShowResultsDialog(true);

    // Show toast summary
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (failureCount === 0) {
      toast({
        title: "Bulk issuance complete",
        description: `Successfully issued ${successCount} credential${successCount !== 1 ? "s" : ""}`,
      });
    } else if (successCount === 0) {
      toast({
        title: "Bulk issuance failed",
        description: `All ${failureCount} credential${failureCount !== 1 ? "s" : ""} failed to issue`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bulk issuance partially complete",
        description: `${successCount} succeeded, ${failureCount} failed`,
        variant: "destructive",
      });
    }
  };

  const successCount = issuanceResults.filter((r) => r.success).length;
  const failureCount = issuanceResults.filter((r) => !r.success).length;

  return (
    <div className="space-y-6">
      {/* Step 1: Download Template */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            1
          </span>
          Download the CSV template
        </h3>
        <Button variant="outline" asChild>
          <Link href={`/api/templates/${credentialType}/csv`}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Link>
        </Button>
      </div>

      {/* Step 2: Upload File */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            2
          </span>
          Fill in the data and upload
        </h3>

        {!file ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              Drag and drop your CSV file here, or{" "}
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500">Maximum 100 rows per upload</p>
          </div>
        ) : (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                disabled={isIssuing}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {parseError && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{parseError}</span>
          </div>
        )}
      </div>

      {/* Step 3: Preview & Issue */}
      {parsedRows.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              3
            </span>
            Preview & Issue
          </h3>

          {/* Summary */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              {parsedRows.length} rows
            </Badge>
            <Badge
              variant="outline"
              className={`gap-1 ${
                validRows.length > 0 ? "text-green-600 border-green-300" : ""
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              {validRows.length} valid
            </Badge>
            {invalidRows.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {invalidRows.length} invalid
              </Badge>
            )}
          </div>

          {/* Preview Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50">
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    {fields.slice(0, 3).map((field) => (
                      <TableHead key={field.name}>{field.description}</TableHead>
                    ))}
                    {fields.length > 3 && (
                      <TableHead>+{fields.length - 3} more</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={!row.isValid ? "bg-red-50" : ""}
                    >
                      <TableCell className="font-mono text-sm">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-300"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                      {fields.slice(0, 3).map((field) => (
                        <TableCell key={field.name} className="max-w-[150px] truncate">
                          {row.data[field.name] || "-"}
                        </TableCell>
                      ))}
                      {fields.length > 3 && (
                        <TableCell className="text-gray-500 text-sm">
                          ...
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Invalid Rows Errors */}
          {invalidRows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">
                Validation Errors ({invalidRows.length} rows)
              </h4>
              <ul className="text-sm text-red-600 space-y-1">
                {invalidRows.slice(0, 5).map((row) => (
                  <li key={row.rowNumber}>
                    <span className="font-medium">Row {row.rowNumber}:</span>{" "}
                    {row.errors.join("; ")}
                  </li>
                ))}
                {invalidRows.length > 5 && (
                  <li className="text-red-500">
                    ... and {invalidRows.length - 5} more errors
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Progress Bar */}
          {isIssuing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Issuing credentials...</span>
                <span className="font-medium">{issuanceProgress}%</span>
              </div>
              <Progress value={issuanceProgress} className="h-2" />
              <p className="text-sm text-gray-500">
                {issuanceResults.length} of {validRows.length} processed
              </p>
            </div>
          )}

          {/* Issue Button */}
          <Button
            onClick={issueCredentials}
            disabled={validRows.length === 0 || isIssuing}
            className="w-full"
          >
            {isIssuing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Issuing {issuanceResults.length + 1} of {validRows.length}...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Issue {validRows.length} Valid Credential
                {validRows.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {failureCount === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Bulk Issuance Complete
                </>
              ) : successCount === 0 ? (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Bulk Issuance Failed
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Bulk Issuance Partially Complete
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {successCount} credential{successCount !== 1 ? "s" : ""} issued
              successfully
              {failureCount > 0 &&
                `, ${failureCount} failed`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Success Summary */}
            {successCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">
                  {successCount} credential{successCount !== 1 ? "s" : ""} issued
                </p>
              </div>
            )}

            {/* Failures List */}
            {failureCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-medium mb-2">
                  Failed rows:
                </p>
                <ul className="text-sm text-red-600 space-y-1 max-h-[200px] overflow-auto">
                  {issuanceResults
                    .filter((r) => !r.success)
                    .map((result) => (
                      <li key={result.rowNumber}>
                        <span className="font-medium">
                          Row {result.rowNumber}:
                        </span>{" "}
                        {result.error}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResultsDialog(false);
                clearFile();
              }}
            >
              Upload Another File
            </Button>
            <Button asChild>
              <Link href="/credentials">View All Credentials</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
