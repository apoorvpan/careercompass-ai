import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowPath | Grow beyond your next job",
  description: "Grow beyond your next job. Find remote jobs, assess your resume against job requirements, and plan your next career steps with an AI text coach.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="mt-auto border-t border-slate-800 bg-slate-950 px-6 py-6 text-center text-sm text-slate-400">
          <p>Built by <span className="font-medium text-slate-200">Apoorv</span></p>
          <a
            href="https://www.linkedin.com/in/apoorvprakash912/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block rounded text-teal-300 underline underline-offset-4 hover:text-teal-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300"
          >
            Connect with Apoorv on LinkedIn
          </a>
        </footer>
      </body>
    </html>
  );
}
