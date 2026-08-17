import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Answers",
};

export default function AnswersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
