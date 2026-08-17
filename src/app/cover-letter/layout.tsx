import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cover Letters",
};

export default function CoverLetterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
