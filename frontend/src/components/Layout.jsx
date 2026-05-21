import { Link, Outlet, useLocation } from "react-router-dom";
import { UserCircle, ScanLine } from "lucide-react";
import { useTranslation } from "../lib/i18n.js";

export default function Layout() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-navy-500 text-white shadow-gov-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-gov p-1">
                <img src="/egypt-emblem.jpeg" alt="شعار الجمهورية" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">{t("app.title")}</h1>
                <p className="text-xs text-gold-200">{t("app.subtitle")}</p>
              </div>
            </Link>

            <nav className="flex items-center gap-3 sm:gap-5 text-sm">
              <Link
                to="/"
                className={`hidden sm:inline transition ${
                  location.pathname === "/" ? "text-gold-400 font-semibold" : "text-white/80 hover:text-gold-300"
                }`}
              >
                {t("nav.services")}
              </Link>
              <span className="hidden sm:inline text-white/30">|</span>
              <Link
                to="/citizen/dashboard"
                className="inline-flex items-center gap-1.5 text-white/90 hover:text-gold-300 transition border border-white/20 hover:border-gold-300 rounded-lg px-3 py-1.5"
              >
                <UserCircle className="h-4 w-4" strokeWidth={1.75} />
                <span>{t("nav.dashboard")}</span>
              </Link>
              <Link
                to="/auth/login"
                className="hidden md:inline-flex items-center gap-1.5 text-gold-300 hover:text-white transition border border-gold-500/40 hover:border-gold-300 rounded-lg px-3 py-1.5"
              >
                <ScanLine className="h-4 w-4" strokeWidth={1.75} />
                <span>{t("nav.login")}</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Breadcrumb pathname={location.pathname} />
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
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
