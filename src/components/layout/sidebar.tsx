"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions/auth";
import {
  User,
  Briefcase,
  FileText,
  Mail,
  LayoutDashboard,
  MessageSquareText,
  ClipboardList,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/jobs", label: "Job Tracker", icon: Briefcase },
  { href: "/resume", label: "Resume Builder", icon: FileText },
  { href: "/cover-letter", label: "Cover Letters", icon: Mail },
  { href: "/interview-prep", label: "Interview Prep", icon: MessageSquareText },
  { href: "/answers", label: "Application Answers", icon: ClipboardList },
];

const bottomNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export type SidebarUser = {
  name: string | null;
  email: string | null;
  image: string | null;
};

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white rounded-md p-2 shadow-md cursor-pointer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:z-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">
              ResumeBuilder
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <nav className="px-3 pb-2 space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 px-3 py-3">
          <div className="flex items-center gap-3 px-2 py-2">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                {(user.name || user.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {user.name || "Signed in"}
              </p>
              {user.email && (
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              )}
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
