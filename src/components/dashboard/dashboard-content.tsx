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
    color: "bg-yellow-500",
  },
  {
    id: "storage",
    key: "storage" as const,
    name: "Storage Profile",
    description: "Battery/energy storage systems",
    icon: Battery,
    color: "bg-green-500",
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
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user.name?.split(" ")[0] || "User"}
          </h1>
          <p className="text-gray-500 mt-1">
            Manage and issue IES Energy Verifiable Credentials
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Credentials Issued</p>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin inline" />
            ) : (
              totalCredentials
            )}
          </p>
        </div>
      </div>

      {/* Issuer Setup Banner (if not set up) */}
      {!user.hasIssuer && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-full">
                  <Zap className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-yellow-800">
                    Set up your Issuer Profile
                  </p>
                  <p className="text-sm text-yellow-600">
                    Generate your DID and configure schemas to start issuing
                    credentials
                  </p>
                </div>
              </div>
              <Button asChild className="bg-yellow-600 hover:bg-yellow-700">
                <Link href="/setup">Complete Setup</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credential Type Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Issue Credentials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {credentialTypeConfig.map((type) => {
            const Icon = type.icon;
            const count = getCredentialCount(type.key);
            const isDisabled = !user.hasIssuer;
            return (
              <Card
                key={type.id}
                className={`transition-shadow ${
                  isDisabled
                    ? "opacity-60"
                    : "hover:shadow-md cursor-pointer group"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`${type.color} p-2 rounded-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <Badge variant="secondary">
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
                    variant="outline"
                    className="w-full group-hover:bg-gray-50"
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
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/credentials">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {loading ? (
                <div className="py-8 text-center text-gray-500">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
                  <p>Loading activity...</p>
                </div>
              ) : !stats?.recentCredentials ||
                stats.recentCredentials.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No credentials issued yet</p>
                  <p className="text-sm">
                    {user.hasIssuer
                      ? "Start by issuing your first credential"
                      : "Complete the issuer setup first"}
                  </p>
                </div>
              ) : (
                stats.recentCredentials.map((credential) => (
                  <div
                    key={credential.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-sm text-gray-600 max-w-[100px] truncate">
                        {credential.credentialId.split(":").pop()?.slice(0, 8)}...
                      </div>
                      <Badge variant="outline">
                        {formatCredentialType(credential.credentialType)}
                      </Badge>
                      <span className="text-gray-900">
                        {credential.subjectName || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={
                          credential.status === "ISSUED"
                            ? "default"
                            : "destructive"
                        }
                        className={
                          credential.status === "ISSUED"
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : ""
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
