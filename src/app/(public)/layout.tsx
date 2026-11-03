import Link from "next/link";
import { Wordmark } from "@/components/brand/mark";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PublicMobileMenu } from "@/components/public/mobile-menu";
import { PUBLIC_NAV } from "@/lib/public-nav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md">
        Skip to content
      </a>
      <p className="bg-ink px-4 py-2 text-center text-2xs text-canvas">
        A roleplay department in the Florida State Roleplay community on Roblox. Not a real police agency. In a real
        emergency, call 911.
      </p>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="Tampa Police Department home">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="ml-auto hidden md:block">
            <ul className="flex items-center gap-1">
              {PUBLIC_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-sunken hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <ThemeToggle />
            <ButtonLink href="/hq" size="sm" variant="secondary" className="hidden sm:inline-flex">
              Member sign in
            </ButtonLink>
            <PublicMobileMenu />
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-sm text-xs text-muted">
              The Tampa Police Department is a fictional department in the Florida State Roleplay community on Roblox
              Emergency Response: Liberty County. It is not affiliated with the City of Tampa or any real agency. Please
              do not enter real-world personal information on this site.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ink">Department</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
              <li><Link className="hover:text-ink" href="/#divisions">Divisions</Link></li>
              <li><Link className="hover:text-ink" href="/#districts">Patrol districts</Link></li>
              <li><Link className="hover:text-ink" href="/#standards">Policies</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-ink">Members</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
              <li><Link className="hover:text-ink" href="/#join">Join TPD</Link></li>
              <li><Link className="hover:text-ink" href="/hq">Member sign in</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
