import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Tampa Police Department · Florida State Roleplay",
    template: "%s · TPD",
  },
  description:
    "The Tampa Police Department of Florida State Roleplay, a Roblox ER:LC community. Not a real government agency.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0d131d" },
  ],
};

// Applies a saved theme choice before first paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem("tpd-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
