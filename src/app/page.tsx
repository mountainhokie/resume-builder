"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Briefcase,
  FileText,
  Mail,
  ArrowRight,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStats {
  hasProfile: boolean;
  profileName: string;
  jobCount: number;
  resumeCount: number;
  coverLetterCount: number;
  recentJobs: { id: string; title: string; status: string }[];
  jobDates: string[];
  resumeDates: string[];
  coverLetterDates: string[];
}

const statusColors: Record<string, "info" | "success" | "danger" | "warning" | "default"> = {
  Applied: "info",
  Interviewing: "success",
  Rejected: "danger",
  "Following Up": "warning",
  Ghosted: "default",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const profileRes = await fetch("/api/profile");
      const profile = await profileRes.json();

      if (profile && profile.id) {
        const [jobsRes, resumeRes, clRes] = await Promise.all([
          fetch("/api/jobs"),
          fetch("/api/resume"),
          fetch("/api/cover-letter"),
        ]);

        const jobs = await jobsRes.json();
        const resumes = await resumeRes.json();
        const coverLetters = await clRes.json();

        setStats({
          hasProfile: true,
          profileName: `${profile.firstName} ${profile.lastName}`,
          jobCount: jobs.length,
          resumeCount: resumes.length,
          coverLetterCount: coverLetters.length,
          recentJobs: jobs.slice(0, 5).map((j: { id: string; title: string; status: string }) => ({
            id: j.id,
            title: j.title,
            status: j.status,
          })),
          jobDates: jobs.map((j: { createdAt: string }) => j.createdAt),
          resumeDates: resumes.map((r: { createdAt: string }) => r.createdAt),
          coverLetterDates: coverLetters.map((c: { createdAt: string }) => c.createdAt),
        });
      } else {
        setStats({
          hasProfile: false,
          profileName: "",
          jobCount: 0,
          resumeCount: 0,
          coverLetterCount: 0,
          recentJobs: [],
          jobDates: [],
          resumeDates: [],
          coverLetterDates: [],
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({
        hasProfile: false,
        profileName: "",
        jobCount: 0,
        resumeCount: 0,
        coverLetterCount: 0,
        recentJobs: [],
        jobDates: [],
        resumeDates: [],
        coverLetterDates: [],
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {stats?.hasProfile
            ? `Welcome back, ${stats.profileName}`
            : "Welcome to Resume Builder"}
        </h1>
        <p className="text-gray-600 mt-1">
          Streamline your job applications with professional resumes and cover
          letters.
        </p>
      </div>

      {!stats?.hasProfile && (
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-blue-900">
                  Get Started - Create Your Profile
                </h2>
                <p className="text-sm text-blue-700">
                  Set up your professional profile to start building resumes and
                  cover letters.
                </p>
              </div>
              <Link href="/profile">
                <Button>
                  Create Profile
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/profile">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Profile</p>
                  <p className="text-lg font-bold text-gray-900">
                    {stats?.hasProfile ? "Complete" : "Not Set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jobs Tracked</p>
                  <p className="text-lg font-bold text-gray-900">
                    {stats?.jobCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/resume">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resumes</p>
                  <p className="text-lg font-bold text-gray-900">
                    {stats?.resumeCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/cover-letter">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cover Letters</p>
                  <p className="text-lg font-bold text-gray-900">
                    {stats?.coverLetterCount || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Activity at a Glance */}
      {stats?.hasProfile && (
        <ActivityAtGlance
          jobDates={stats.jobDates}
          resumeDates={stats.resumeDates}
          coverLetterDates={stats.coverLetterDates}
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Applications</h2>
            <Link href="/jobs">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <CardContent>
            {stats?.recentJobs && stats.recentJobs.length > 0 ? (
              <div className="space-y-3">
                {stats.recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700 truncate">
                      {job.title}
                    </span>
                    <Badge variant={statusColors[job.status] || "default"}>
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-3">
                  No jobs tracked yet
                </p>
                <Link href="/jobs">
                  <Button variant="outline" size="sm">
                    <Plus className="h-3 w-3 mr-1" />
                    Add First Job
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <CardContent>
            <div className="space-y-3">
              <Link href="/profile" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <User className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {stats?.hasProfile ? "Edit Profile" : "Create Profile"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Update your personal information and skills
                    </p>
                  </div>
                </div>
              </Link>
              <Link href="/resume" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Build a Resume
                    </p>
                    <p className="text-xs text-gray-500">
                      Create an ATS-friendly resume from your profile
                    </p>
                  </div>
                </div>
              </Link>
              <Link href="/cover-letter" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Write a Cover Letter
                    </p>
                    <p className="text-xs text-gray-500">
                      Create a tailored cover letter for a job application
                    </p>
                  </div>
                </div>
              </Link>
              <Link href="/jobs" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <Briefcase className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Track a Job
                    </p>
                    <p className="text-xs text-gray-500">
                      Add a new job application to your tracker
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type ViewMode = "week" | "month" | "year";

interface ColumnDef {
  label: string;
  start: Date;
  end: Date;
}

function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function countInRange(dates: string[] | undefined, start: Date, end: Date): number {
  if (!dates) return 0;
  return dates.filter((dateStr) => {
    const d = new Date(dateStr);
    return d >= start && d <= end;
  }).length;
}

function ActivityAtGlance({
  jobDates,
  resumeDates,
  coverLetterDates,
}: {
  jobDates: string[];
  resumeDates: string[];
  coverLetterDates: string[];
}) {
  const [view, setView] = useState<ViewMode>("week");
  const [offset, setOffset] = useState(0);

  useEffect(() => setOffset(0), [view]);

  const { columns, periodLabel } = useMemo(() => {
    const now = new Date();

    if (view === "week") {
      const monday = getMonday(now);
      monday.setDate(monday.getDate() + offset * 7);
      const cols: ColumnDef[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        cols.push({
          label: d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "numeric",
            day: "numeric",
          }),
          start: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
        });
      }
      const sun = cols[6].start;
      const label = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sun.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      return { columns: cols, periodLabel: label };
    }

    if (view === "month") {
      const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const year = target.getFullYear();
      const month = target.getMonth();
      const totalDays = new Date(year, month + 1, 0).getDate();

      const ranges: [number, number][] = [
        [1, 7],
        [8, 14],
        [15, 21],
        [22, 28],
      ];
      if (totalDays > 28) ranges.push([29, totalDays]);

      const cols: ColumnDef[] = ranges.map(([from, to]) => ({
        label: `${from}–${to}`,
        start: new Date(year, month, from),
        end: new Date(year, month, to, 23, 59, 59, 999),
      }));

      const label = target.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      return { columns: cols, periodLabel: label };
    }

    const targetYear = now.getFullYear() + offset;
    const cols: ColumnDef[] = [];
    for (let m = 0; m < 12; m++) {
      const lastDay = new Date(targetYear, m + 1, 0).getDate();
      cols.push({
        label: new Date(targetYear, m, 1).toLocaleDateString("en-US", {
          month: "short",
        }),
        start: new Date(targetYear, m, 1),
        end: new Date(targetYear, m, lastDay, 23, 59, 59, 999),
      });
    }
    return { columns: cols, periodLabel: `${targetYear}` };
  }, [view, offset]);

  const categories = [
    { label: "Jobs Added", dates: jobDates, color: "bg-orange-50 text-orange-700" },
    { label: "Resumes", dates: resumeDates, color: "bg-green-50 text-green-700" },
    { label: "Cover Letters", dates: coverLetterDates, color: "bg-blue-50 text-blue-700" },
  ];

  const data = categories.map((cat) => ({
    ...cat,
    counts: columns.map((col) => countInRange(cat.dates, col.start, col.end)),
  }));

  const rowTotals = data.map((cat) =>
    cat.counts.reduce((a, b) => a + b, 0)
  );

  return (
    <Card className="mb-8">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Activity at a Glance</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {(["week", "month", "year"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer capitalize",
                  view === v
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
            {periodLabel}
          </span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            disabled={offset >= 0}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              offset >= 0
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-gray-100 cursor-pointer"
            )}
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer ml-1"
            >
              Today
            </button>
          )}
        </div>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500 sticky left-0 bg-white z-10 min-w-[130px]">
                  Category
                </th>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className="text-center py-3 px-3 font-medium text-gray-500 whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50/80">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((cat, rowIdx) => (
                <tr key={rowIdx} className="border-b border-gray-50">
                  <td className="py-3 px-4 sticky left-0 bg-white z-10">
                    <span
                      className={cn(
                        "inline-flex px-2.5 py-1 rounded text-xs font-semibold",
                        cat.color
                      )}
                    >
                      {cat.label}
                    </span>
                  </td>
                  {cat.counts.map((count, i) => (
                    <td key={i} className="text-center py-3 px-3">
                      <span
                        className={cn(
                          "tabular-nums",
                          count > 0
                            ? "font-semibold text-gray-900"
                            : "text-gray-300"
                        )}
                      >
                        {count}
                      </span>
                    </td>
                  ))}
                  <td className="text-center py-3 px-4 font-bold text-gray-900 bg-gray-50/80 tabular-nums">
                    {rowTotals[rowIdx]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
