import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/source-serif-4";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EasyThesis — draft your thesis from real sources",
    template: "%s · EasyThesis",
  },
  description:
    "EasyThesis helps social sciences and humanities students draft Chapters 1 to 5 of a thesis or dissertation, using literature retrieved from scholarly databases and citations checked against Crossref.",
};

export const viewport: Viewport = {
  themeColor: "#0f3d2e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
