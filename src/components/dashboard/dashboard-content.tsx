"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  User,
  Sun,
  Battery,
  Plus,
  ArrowRight,
  Clock,
  Loader2,
  ShieldCheck,
  FileCheck,
  Users,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DashboardContentProps {
  user: {
    name?: string | null;
    email?: string | null;
    isAdmin: boolean;
    hasIssuer: boolean;
  };
}

interface StatsData {
  byType: {
    consumption: number;
    utility_customer: number;
    generation: number;
    storage: number;
  };
  byStatus: {
    issued: number;
    revoked: number;
  };
  total: number;
  recentCredentials: Array<{
    id: string;
    credentialId: string;
    credentialType: string;
    subjectName: string | null;
    status: string;
    issuedAt: string;
  }>;
}

const credentialTypeConfig = [
  {
    id: "consumption",
    key: "consumption" as const,
    name: "Consumption Profile",
    description: "Energy consumption profile for utility customers",
    icon: Zap,
    color: "bg-blue-500",
  },
  {
    id: "utility_customer",
    key: "utility_customer" as const,
    name: "Utility Customer",
    description: "Customer identity and service details",
    icon: User,
    color: "bg-purple-500",
  },
  {
    id: "generation",
    key: "generation" as const,
    name: "Generation Profile",
    description: "Renewable energy generation systems (prosumers)",
    icon: Sun,
    color: "bg-amber-500",
  },
  {
    id: "storage",
    key: "storage" as const,
    name: "Storage Profile",
    description: "Battery/energy storage systems",
    icon: Battery,
    color: "bg-emerald-500",
  },
];

export function DashboardContent({ user }: DashboardContentProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user.hasIssuer) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/issuer/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user.hasIssuer]);

  const totalCredentials = stats?.total ?? 0;

  const getCredentialCount = (key: keyof StatsData["byType"]) => {
    return stats?.byType[key] ?? 0;
  };

  const formatCredentialType = (type: string) => {
    const typeMap: Record<string, string> = {
      CONSUMPTION: "Consumption",
      UTILITY_CUSTOMER: "Utility",
      GENERATION: "Generation",
      STORAGE: "Storage",
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 rounded-full text-sm font-medium text-gray-700 mb-4 shadow-sm">
          <Activity className="h-4 w-4 text-blue-600" />
          Dashboard
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
          Welcome, {user.name?.split(" ")[0] || "User"}
        </h1>
        <p className="text-gray-600 text-lg">
          Issue and manage your Verifiable Credentials
        </p>
      </div>

      {/* Stats Cards */}
      {user.hasIssuer && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Credentials</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin inline" />
                    ) : (
                      totalCredentials
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin inline" />
                    ) : (
                      stats?.byStatus.issued ?? 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Revoked</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin inline" />
                    ) : (
                      stats?.byStatus.revoked ?? 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Credential Types</p>
                  <p className="text-2xl font-bold text-gray-900">4</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issuer Setup Banner (if not set up) */}
      {!user.hasIssuer && (
        <Card className="border-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    Set up your Issuer Profile
                  </p>
                  <p className="text-blue-100">
                    Generate your DID and configure schemas to start issuing
                    credentials
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <Link href="/setup">
                  Complete Setup
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credential Type Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Issue Credentials
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {credentialTypeConfig.map((type) => {
            const Icon = type.icon;
            const count = getCredentialCount(type.key);
            const isDisabled = !user.hasIssuer;
            return (
              <Card
                key={type.id}
                className={`bg-white border-0 shadow-sm transition-all ${
                  isDisabled
                    ? "opacity-60"
                    : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer group"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`${type.color} p-2.5 rounded-xl`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-700"
                    >
                      {loading ? "..." : count} VCs
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-3">{type.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    {type.description}
                  </p>
                  <Button
                    asChild={!isDisabled}
                    className={`w-full ${
                      isDisabled
                        ? ""
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                    disabled={isDisabled}
                  >
                    {isDisabled ? (
                      <span>
                        <Plus className="h-4 w-4 mr-2" />
                        Issue New
                      </span>
                    ) : (
                      <Link href={`/issue/${type.id}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Issue New
                      </Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Activity
          </h2>
          <Button asChild variant="ghost" size="sm" className="text-blue-600">
            <Link href="/credentials">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="py-12 text-center text-gray-500">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 text-blue-500 animate-spin" />
                  <p>Loading activity...</p>
                </div>
              ) : !stats?.recentCredentials ||
                stats.recentCredentials.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No credentials issued yet</p>
                  <p className="text-sm mt-1">
                    {user.hasIssuer
                      ? "Start by issuing your first credential"
                      : "Complete the issuer setup first"}
                  </p>
                </div>
              ) : (
                stats.recentCredentials.map((credential) => (
                  <div
                    key={credential.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {credential.credentialId.split(":").pop()?.slice(0, 8)}
                        ...
                      </div>
                      <Badge
                        variant="outline"
                        className="border-blue-200 text-blue-700"
                      >
                        {formatCredentialType(credential.credentialType)}
                      </Badge>
                      <span className="text-gray-900 font-medium">
                        {credential.subjectName || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        className={
                          credential.status === "ISSUED"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-red-100 text-red-700 hover:bg-red-100"
                        }
                      >
                        {credential.status.toLowerCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(credential.issuedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
