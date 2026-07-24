import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GlobeIcon,
  MenuIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Container } from "@/components/ui/container";
import { TOPIC_CHIPS } from "@/lib/mock-articles";

const NAV_ITEMS = [
  { label: "Home", href: "/", notification: false },
  { label: "For You", href: "#", notification: true },
  { label: "Local", href: "#", notification: false },
  { label: "Blindspot", href: "#", notification: false },
] as const;

type SiteHeaderProps = {
  showTopics?: boolean;
  activeNav?: "Home" | "For You" | "Local" | "Blindspot" | null;
};

export function SiteHeader({
  showTopics = true,
  activeNav = "Home",
}: SiteHeaderProps) {
  return (
    <header className="border-b border-divider bg-bg-primary">
      <div className="border-b border-divider bg-surface">
        <Container className="flex h-9 items-center justify-between gap-4 text-caption text-text-secondary">
          <div className="flex min-w-0 items-center gap-4">
            <a href="#" className="hidden hover:text-text-primary sm:inline">
              Browser Extension
            </a>
            <div className="flex items-center gap-1.5" aria-label="Theme">
              <span className="hidden sm:inline">Theme:</span>
              <span className="font-medium text-text-primary">Light</span>
              <span className="text-border" aria-hidden="true">
                |
              </span>
              <button type="button" className="hover:text-text-primary">
                Dark
              </button>
              <span className="text-border" aria-hidden="true">
                |
              </span>
              <button type="button" className="hover:text-text-primary">
                Auto
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <time dateTime="2026-06-01" className="hidden md:inline">
              Monday, June 1, 2026
            </time>
            <a href="#" className="hidden hover:text-text-primary sm:inline">
              Set Location
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 hover:text-text-primary"
            >
              <GlobeIcon />
              <span className="hidden sm:inline">International Edition</span>
              <span className="sm:hidden">Edition</span>
              <ChevronDownIcon />
            </button>
          </div>
        </Container>
      </div>

      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-primary hover:bg-surface"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>

          <Link href="/" className="shrink-0">
            <Logo variant="header" />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 md:flex"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.label;
              const className = [
                "relative text-body-md font-medium transition-colors",
                isActive
                  ? "text-text-primary after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:bg-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ");

              const content = (
                <>
                  {item.label}
                  {item.notification ? (
                    <span
                      className="absolute -right-2 -top-0.5 h-1.5 w-1.5 rounded-full bg-bias-left"
                      aria-label="New updates"
                    />
                  ) : null}
                </>
              );

              if (item.href === "/") {
                return (
                  <Link key={item.label} href="/" className={className}>
                    {content}
                  </Link>
                );
              }

              return (
                <a key={item.label} href={item.href} className={className}>
                  {content}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button variant="primary" className="px-3 sm:px-4">
            Subscribe
          </Button>
          <Button variant="outline" className="px-3 sm:px-4">
            Login
          </Button>
        </div>
      </Container>

      {showTopics ? (
        <div className="border-t border-divider bg-bg-primary">
          <Container className="flex items-center gap-2 py-3">
            <button
              type="button"
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary hover:bg-surface sm:inline-flex"
              aria-label="Scroll topics left"
            >
              <ChevronLeftIcon />
            </button>

            <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 scrollbar-none">
              {TOPIC_CHIPS.map((topic) => (
                <Chip
                  key={topic}
                  showPlus
                  plusPosition="trailing"
                  className="h-9 min-h-9"
                >
                  {topic}
                </Chip>
              ))}
            </div>

            <button
              type="button"
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary hover:bg-surface sm:inline-flex"
              aria-label="Scroll topics right"
            >
              <ChevronRightIcon />
            </button>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
