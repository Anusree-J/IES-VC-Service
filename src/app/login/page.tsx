"use client";

import { Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const error = searchParams.get("error");

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="h-16 bg-[#FFF8E7] border-b border-[#E8E0D0]" />
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#E8F4FC] via-[#F0F4FF] to-[#E8F0FC]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Cream header bar like DeDi */}
      <header className="h-16 bg-[#FFF8E7] border-b border-[#E8E0D0] flex items-center px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-lg text-gray-900">Open VCs</span>
        </div>
      </header>

      {/* Main content with gradient background */}
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#E8F4FC] via-[#F0F4FF] to-[#E8F0FC] px-4 py-12">
        <div className="w-full max-w-md">
          {/* Hero text above card */}
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-1.5 bg-white/80 rounded-full text-sm font-medium text-gray-700 mb-4 shadow-sm">
              Introducing Open VCs
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-blue-600 mb-4">
              Verifiable Credentials
            </h1>
            <p className="text-gray-600 text-lg">
              Issue and manage trusted, tamper-proof credentials.
              <br />
              Built for the decentralized future.
            </p>
          </div>

          {/* Login card */}
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-semibold">Sign In</CardTitle>
              <CardDescription>
                Sign in to access your credential dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error === "AccessDenied" ? (
                    <>
                      <p className="font-medium">Access Denied</p>
                      <p className="mt-1">
                        Your email is not authorized to access this application.
                        Please contact an administrator.
                      </p>
                    </>
                  ) : (
                    <p>An error occurred during sign in. Please try again.</p>
                  )}
                </div>
              )}

              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#fff"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#fff"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#fff"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#fff"
                    />
                  </svg>
                )}
                Sign in with Google
              </Button>

              <p className="text-center text-sm text-gray-500">
                Only authorized users can access this application
              </p>
            </CardContent>
          </Card>

          {/* Feature badges below card */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Enterprise Ready</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Verifiable</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4">
        <div className="text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()}{" "}
          <a
            href="https://networksforhumanity.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Networks for Humanity
          </a>
          . All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <div className="h-16 bg-[#FFF8E7] border-b border-[#E8E0D0]" />
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#E8F4FC] via-[#F0F4FF] to-[#E8F0FC]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
