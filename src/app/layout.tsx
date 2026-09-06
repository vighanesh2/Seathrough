import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { QuestionAccessProvider } from "@/components/usage/QuestionAccess";
import { PageTransition } from "@/components/site/PageTransition";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SeeThrough",
  description:
    "Type a question. SeeThrough starts a visual lesson and draws each step while it explains.",
  icons: {
    icon: [{ url: "/SeeThrough_logo.png", type: "image/png" }],
    apple: [{ url: "/SeeThrough_logo.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        geist.variable,
        ibmPlexMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col font-sans text-ink">
        <AuthProvider>
          <QuestionAccessProvider>
            <TooltipProvider delayDuration={200}>
              <PageTransition>{children}</PageTransition>
            </TooltipProvider>
          </QuestionAccessProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
