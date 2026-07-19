import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", key: "dashboard" },
  { href: "/customers", label: "Customers", key: "customers" },
] as const;

export function AppHeader({ active }: { active: "dashboard" | "customers" }) {
  return (
    <header className="sticky top-0 z-10 border-b border-navy-900/10 bg-beige-page/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="w-7 h-7 text-navy-900" />
            <span className="font-serif text-lg text-navy-950 tracking-tight">AR Assistant</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`text-sm transition-colors ${
                  active === item.key ? "text-navy-900 font-medium" : "text-navy-700/60 hover:text-navy-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <UserButton />
      </div>
    </header>
  );
}
