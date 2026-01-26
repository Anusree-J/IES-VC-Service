"use client";

import { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialDetailsDialog } from "./credential-details-dialog";
import { RevokeCredentialDialog } from "./revoke-credential-dialog";
import { VerifyCredentialDialog } from "./verify-credential-dialog";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  CONSUMPTION: "Consumption Profile",
  UTILITY_CUSTOMER: "Utility Customer",
  GENERATION: "Generation Profile",
  STORAGE: "Storage Profile",
};

const CREDENTIAL_TYPE_COLORS: Record<string, string> = {
  CONSUMPTION: "bg-blue-100 text-blue-800",
  UTILITY_CUSTOMER: "bg-purple-100 text-purple-800",
  GENERATION: "bg-green-100 text-green-800",
  STORAGE: "bg-orange-100 text-orange-800",
};

export function CredentialsList() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dialogs
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await fetch(`/api/credentials?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch credentials");
      }

      setCredentials(data.credentials);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, typeFilter, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [typeFilter, statusFilter, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleViewDetails = (credential: Credential) => {
    setSelectedCredential(credential);
    setDetailsOpen(true);
  };

  const handleVerify = (credential: Credential) => {
    setSelectedCredential(credential);
    setVerifyOpen(true);
  };

  const handleRevoke = (credential: Credential) => {
    setSelectedCredential(credential);
    setRevokeOpen(true);
  };

  const handleDownloadJSON = async (credential: Credential) => {
    try {
      const response = await fetch(`/api/credentials/${credential.id}/json`);
      if (!response.ok) throw new Error("Failed to download");

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `credential-${credential.credentialId.split(":").pop()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleDownloadPDF = (credential: Credential) => {
    // Open in new tab - user can print/save as PDF from there
    window.open(`/api/credentials/${credential.id}/pdf`, "_blank");
  };

  const handleRevokeSuccess = () => {
    setRevokeOpen(false);
    setSelectedCredential(null);
    fetchCredentials();
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(credentials.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = credentials.length > 0 && selectedIds.size === credentials.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < credentials.length;

  // Bulk download handler
  const handleBulkDownload = async (format: "json" | "pdf") => {
    if (selectedIds.size === 0) return;

    setIsDownloading(true);
    const zip = new JSZip();

    try {
      const selectedCredentials = credentials.filter((c) => selectedIds.has(c.id));

      // Dynamically import html2pdf only when needed for PDF downloads
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let html2pdfModule: any = null;
      let pdfContainer: HTMLDivElement | null = null;

      if (format === "pdf") {
        html2pdfModule = (await import("html2pdf.js")).default;

        // Create a container for PDF rendering positioned off-screen
        // Must be visible (opacity: 1) for html2canvas to capture content properly
        pdfContainer = document.createElement("div");
        pdfContainer.style.cssText = `
          position: fixed;
          left: -9999px;
          top: 0;
          width: 210mm;
          pointer-events: none;
          background: white;
        `;
        document.body.appendChild(pdfContainer);
      }

      // Helper function to convert image URL to data URL
      const imageToDataURL = async (imgSrc: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/png"));
            } else {
              resolve(imgSrc);
            }
          };
          img.onerror = () => resolve(imgSrc);
          img.src = imgSrc;
        });
      };

      for (const credential of selectedCredentials) {
        try {
          if (format === "json") {
            const response = await fetch(`/api/credentials/${credential.id}/json`);
            if (response.ok) {
              const data = await response.json();
              const filename = `credential-${credential.credentialId.split(":").pop()}.json`;
              zip.file(filename, JSON.stringify(data, null, 2));
            }
          } else if (html2pdfModule && pdfContainer) {
            const response = await fetch(`/api/credentials/${credential.id}/pdf`);
            if (response.ok) {
              const htmlContent = await response.text();

              // Extract body content from the full HTML document
              const parser = new DOMParser();
              const doc = parser.parseFromString(htmlContent, "text/html");

              // Get all styles from head
              const styles = Array.from(doc.head.querySelectorAll("style"))
                .map(s => s.outerHTML)
                .join("");

              // Remove print buttons from body content
              const printButtons = doc.body.querySelectorAll(".print-button, .no-print, button");
              printButtons.forEach(btn => btn.remove());

              // Convert all images to data URLs to ensure they're captured
              const images = doc.body.querySelectorAll("img");
              for (const img of Array.from(images)) {
                if (img.src && !img.src.startsWith("data:")) {
                  const dataUrl = await imageToDataURL(img.src);
                  img.src = dataUrl;
                }
              }

              // Set content to the hidden container
              pdfContainer.innerHTML = `
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { background: white; }
                  .no-print, .print-button, button { display: none !important; }
                </style>
                ${styles}
                <div style="padding: 20px; background: white;">
                  ${doc.body.innerHTML}
                </div>
              `;

              // Wait for any newly added images to load
              const containerImages = pdfContainer.querySelectorAll("img");
              if (containerImages.length > 0) {
                await Promise.all(
                  Array.from(containerImages).map(
                    (img) =>
                      new Promise<void>((resolve) => {
                        if (img.complete && img.naturalHeight !== 0) {
                          resolve();
                        } else {
                          img.onload = () => resolve();
                          img.onerror = () => resolve();
                        }
                      })
                  )
                );
              }

              // Small delay to ensure rendering is complete
              await new Promise(resolve => setTimeout(resolve, 100));

              // Convert to PDF
              const pdfBlob = await html2pdfModule()
                .set({
                  margin: 10,
                  filename: `credential-${credential.credentialId.split(":").pop()}.pdf`,
                  image: { type: "jpeg", quality: 0.98 },
                  html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                  },
                  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                })
                .from(pdfContainer)
                .outputPdf("blob");

              const filename = `credential-${credential.credentialId.split(":").pop()}.pdf`;
              zip.file(filename, pdfBlob);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch credential ${credential.id}:`, err);
        }
      }

      // Clean up the hidden container
      if (pdfContainer) {
        document.body.removeChild(pdfContainer);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `credentials-${format}-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Clear selection after download
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Bulk download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateId = (id: string) => {
    if (id.length <= 20) return id;
    return `${id.substring(0, 10)}...${id.substring(id.length - 8)}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            {selectedIds.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={isDownloading} size="sm">
                    {isDownloading ? (
                      <>
                        <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Download Selected ({selectedIds.size})
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkDownload("json")}>
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Download as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkDownload("pdf")}>
                    <FileTextIcon className="mr-2 h-4 w-4" />
                    Download as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name or credential ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Credential Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="consumption">Consumption Profile</SelectItem>
                <SelectItem value="utility_customer">Utility Customer</SelectItem>
                <SelectItem value="generation">Generation Profile</SelectItem>
                <SelectItem value="storage">Storage Profile</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Credentials Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : credentials.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No credentials found. Issue your first credential from the dashboard.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Credential ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credentials.map((credential) => (
                    <TableRow key={credential.id} className={selectedIds.has(credential.id) ? "bg-blue-50" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(credential.id)}
                          onChange={(e) => handleSelectOne(credential.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {truncateId(credential.credentialId)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={CREDENTIAL_TYPE_COLORS[credential.credentialType]}
                        >
                          {CREDENTIAL_TYPE_LABELS[credential.credentialType]}
                        </Badge>
                      </TableCell>
                      <TableCell>{credential.subjectName || "-"}</TableCell>
                      <TableCell>{(credential.subjectData as Record<string, string>)?.issuerName || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={credential.status === "ISSUED" ? "default" : "destructive"}
                        >
                          {credential.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(credential.issuedAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(credential)}>
                              <EyeIcon className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadJSON(credential)}>
                              <DownloadIcon className="mr-2 h-4 w-4" />
                              Download JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPDF(credential)}>
                              <FileTextIcon className="mr-2 h-4 w-4" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVerify(credential)}>
                              <CheckCircleIcon className="mr-2 h-4 w-4" />
                              Verify
                            </DropdownMenuItem>
                            {credential.status === "ISSUED" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRevoke(credential)}
                                  className="text-red-600"
                                >
                                  <XCircleIcon className="mr-2 h-4 w-4" />
                                  Revoke
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} credentials
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CredentialDetailsDialog
        credential={selectedCredential}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <VerifyCredentialDialog
        credential={selectedCredential}
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
      />

      <RevokeCredentialDialog
        credential={selectedCredential}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onSuccess={handleRevokeSuccess}
      />
    </div>
  );
}

// Simple icon components
function MoreVerticalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
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

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
