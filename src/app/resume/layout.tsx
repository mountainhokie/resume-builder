import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Builder",
};

export default function ResumeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
