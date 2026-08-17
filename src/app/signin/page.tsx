import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { auth, signIn, enabledProviders } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { CredentialsForm } from "@/components/auth/credentials-form";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign In" };

type ProviderConfig = {
  id: string;
  label: string;
  enabled: boolean;
  icon: React.ReactNode;
};

const providerConfigs: ProviderConfig[] = [
  {
    id: "google",
    label: "Continue with Google",
    enabled: enabledProviders.google,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        />
      </svg>
    ),
  },
  {
    id: "github",
    label: "Continue with GitHub",
    enabled: enabledProviders.github,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.97.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.5 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"
        />
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "Continue with LinkedIn",
    enabled: enabledProviders.linkedin,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#0A66C2"
          d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"
        />
      </svg>
    ),
  },
];

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) redirect(callbackUrl || "/");

  const available = providerConfigs.filter((p) => p.enabled);

  return (
    <AuthShell
      title="Sign in"
      subtitle="Manage your applications, resumes and cover letters."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <CredentialsForm callbackUrl={callbackUrl || "/"} />

      {available.length > 0 && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs uppercase tracking-wide text-gray-400">
              or
            </span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-3">
            {available.map((provider) => (
              <form
                key={provider.id}
                action={async () => {
                  "use server";
                  await signIn(provider.id, {
                    redirectTo: callbackUrl || "/",
                  });
                }}
              >
                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {provider.icon}
                  {provider.label}
                </button>
              </form>
            ))}
          </div>
        </>
      )}
    </AuthShell>
  );
}
