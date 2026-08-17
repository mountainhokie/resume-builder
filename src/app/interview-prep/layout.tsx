import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interview Prep",
};

export default function InterviewPrepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
