"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, Shield, ShieldCheck } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 bg-[#FFF8E7] border-b border-[#E8E0D0]">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-lg text-gray-900">Open VCs</span>
        </Link>

        {session?.user && (
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/credentials"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Credentials
              </Link>
              <Link
                href="/verify"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                <ShieldCheck className="h-4 w-4" />
                Verify
              </Link>
              {session.user.isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Admin
                </Link>
              )}
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={session.user.image || undefined}
                      alt={session.user.name || "User"}
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {getInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {session.user.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
