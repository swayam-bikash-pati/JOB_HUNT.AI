import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobHunter AI — AI-Powered Job Discovery",
  description:
    "Discover, match, and prepare for AI/ML, Data Science, and Software Engineering jobs with AI-powered intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
