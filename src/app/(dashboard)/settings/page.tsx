"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AllowedUser {
  id: string;
  email: string;
  createdAt: string;
  addedBy: {
    name: string | null;
    email: string | null;
  } | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = session?.user?.isAdmin;

  useEffect(() => {
    if (isAdmin) {
      fetchAllowedUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchAllowedUsers = async () => {
    try {
      const response = await fetch("/api/allowed-users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch allowed users");
      }

      setAllowedUsers(data.allowedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAdding(true);

    try {
      const response = await fetch("/api/allowed-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add user");
      }

      setAllowedUsers((prev) => [data.allowedUser, ...prev]);
      setNewEmail("");
      setSuccess(`${newEmail} has been added to the allowed users list`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUser = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the allowed users list?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/allowed-users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove user");
      }

      setAllowedUsers((prev) => prev.filter((u) => u.id !== id));
      setSuccess(`${email} has been removed from the allowed users list`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Email:</span> {session?.user?.email}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Role:</span>{" "}
              {isAdmin ? (
                <Badge variant="default">Admin</Badge>
              ) : (
                <Badge variant="secondary">User</Badge>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Allowed Users</CardTitle>
            <CardDescription>
              Manage which email addresses can access this application. Users not on this list
              (and not admins) will be denied access when trying to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new user form */}
            <form onSubmit={handleAddUser} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={adding || !newEmail}>
                {adding ? "Adding..." : "Add User"}
              </Button>
            </form>

            {/* Error/Success messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                {success}
              </div>
            )}

            {/* Users list */}
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : allowedUsers.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">
                No allowed users yet. Add email addresses above to grant access.
              </p>
            ) : (
              <div className="border rounded-md divide-y">
                {allowedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-sm">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        Added {formatDate(user.createdAt)}
                        {user.addedBy && ` by ${user.addedBy.name || user.addedBy.email}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(user.id, user.email)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Info note */}
            <p className="text-xs text-gray-500 mt-4">
              Note: Admin emails (configured via ADMIN_EMAILS environment variable) can always
              access the application regardless of this list.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
