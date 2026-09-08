import type { Metadata } from "next";
import { Fraunces, Geist, IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SeeThrough",
  description:
    "Type a question. SeeThrough draws it while it explains: on a board, as a system map, or in 3D.",
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
        inter.variable,
        newsreader.variable,
        fraunces.variable,
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
