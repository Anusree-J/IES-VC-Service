import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-[#E8F4FC] via-[#F0F4FF] to-[#E8F0FC]">
        <div className="container mx-auto px-4 py-8">{children}</div>
      </main>
      <footer className="border-t bg-white py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
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
