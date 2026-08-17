import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: {
    default: "Resume Builder - Streamline Your Job Applications",
    template: "%s | Resume Builder",
  },
  description:
    "Build professional resumes, track job applications, and create tailored cover letters.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;

  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        {user ? (
          <div className="flex min-h-screen">
            <Sidebar
              user={{
                name: user.name ?? null,
                email: user.email ?? null,
                image: user.image ?? null,
              }}
            />
            <main className="flex-1 lg:ml-0">
              <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto pl-16 lg:pl-8">
                {children}
              </div>
            </main>
          </div>
        ) : (
          // Signed out: no navigation chrome, just the sign-in screen.
          <main className="min-h-screen px-4 py-8">{children}</main>
        )}
      </body>
    </html>
  );
}
