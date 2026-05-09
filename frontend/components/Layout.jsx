import Link from "next/link";
import { useRouter } from "next/router";
import { Building2 } from "lucide-react";
import { useTranslation } from "../lib/i18n";

export default function Layout({ children }) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-navy-500 text-white shadow-gov-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
              <div className="w-10 h-10 rounded-lg bg-gold-500 flex items-center justify-center shadow-gov">
                <Building2 className="h-6 w-6 text-navy-500" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">{t("app.title")}</h1>
                <p className="text-xs text-gold-200">{t("app.subtitle")}</p>
              </div>
            </Link>

            <nav className="flex items-center gap-4 sm:gap-6 text-sm">
              <Link
                href="/"
                className={`hidden sm:inline transition ${
                  router.pathname === "/" ? "text-gold-400 font-semibold" : "text-white/80 hover:text-gold-300"
                }`}
              >
                {t("nav.services")}
              </Link>
              <span className="hidden sm:inline text-white/30">|</span>
              <span className="hidden md:inline text-white/70 text-xs">
                {t("nav.tagline")}
              </span>
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Breadcrumb pathname={router.pathname} />
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-navy-700 text-white/70 text-center py-4 text-sm">
        &copy; {new Date().getFullYear()} {t("footer.rights")}
      </footer>
    </div>
  );
}

function Breadcrumb({ pathname }) {
  const { t } = useTranslation();
  const steps = [
    { key: "breadcrumb.services", match: "/" },
    { key: "breadcrumb.branches", match: "/branches" },
    { key: "breadcrumb.slots", match: "/slots" },
    { key: "breadcrumb.confirm", match: "/confirm" },
    { key: "breadcrumb.success", match: "/success" },
  ];

  // Match longest prefix so "/" doesn't always win
  let currentIndex = -1;
  let bestLen = -1;
  steps.forEach((s, i) => {
    const isMatch = s.match === "/" ? pathname === "/" : pathname.startsWith(s.match);
    if (isMatch && s.match.length > bestLen) {
      bestLen = s.match.length;
      currentIndex = i;
    }
  });

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto">
      {steps.map((step, i) => (
        <span key={step.key} className="flex items-center gap-2 whitespace-nowrap">
          {i > 0 && <span className="text-slate-300">/</span>}
          <span
            className={
              i === currentIndex
                ? "text-gold-600 font-semibold"
                : i < currentIndex
                ? "text-green-600"
                : "text-slate-400"
            }
          >
            {i < currentIndex ? "✓ " : ""}
            {t(step.key)}
          </span>
        </span>
      ))}
    </div>
  );
}
