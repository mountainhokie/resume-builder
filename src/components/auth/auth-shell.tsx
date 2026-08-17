import Link from "next/link";
import { FileText } from "lucide-react";

/** Shared frame for the signed-out pages, so they read as one flow. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="mb-3">
            <FileText className="h-10 w-10 text-blue-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
        </div>
        {children}
        {footer && (
          <div className="mt-6 text-center text-sm text-gray-600">{footer}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Shown when no mail provider is configured: the API hands back the link it
 * would have emailed so local development is not a dead end. Never rendered
 * once RESEND_API_KEY is set, because the API stops returning the link.
 */
export function DevLinkNotice({ link }: { link: string }) {
  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
      <p className="font-medium text-amber-900">No email provider configured</p>
      <p className="mt-1 text-amber-800">
        Set <code className="rounded bg-amber-100 px-1">RESEND_API_KEY</code> to
        send this properly. For now, use this link:
      </p>
      <a
        href={link}
        className="mt-2 block break-all font-medium text-blue-600 hover:underline"
      >
        {link}
      </a>
    </div>
  );
}
