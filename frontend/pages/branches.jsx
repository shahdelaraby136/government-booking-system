import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MapPin, ArrowRight, ArrowLeft } from "lucide-react";
import { getBranches } from "../lib/api";
import { useTranslation } from "../lib/i18n";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

export default function BranchesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { serviceId, serviceName } = router.query;
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBranches = async () => {
    if (!serviceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getBranches(serviceId);
      setBranches(data);
    } catch (err) {
      setError(t("branches.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (serviceId) fetchBranches();
  }, [serviceId]);

  const handleSelect = (branch) => {
    router.push({
      pathname: "/slots",
      query: {
        serviceId,
        serviceName,
        branchId: branch._id,
        branchName: branch.name,
        branchCity: branch.city,
      },
    });
  };

  if (!serviceId) return <ErrorMessage message={t("branches.noService")} />;
  if (loading) return <LoadingSpinner message={t("branches.loading")} />;
  if (error) return <ErrorMessage message={error} onRetry={fetchBranches} />;

  return (
    <div>
      {/* Back + header */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-sm text-navy-500 hover:text-gold-600 mb-4 transition"
      >
        <ArrowRight className="h-4 w-4" strokeWidth={1.75} /> {t("branches.back")}
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-navy-500">{t("branches.title")}</h2>
        <p className="text-slate-500 mt-1">
          {t("branches.subtitle")}{" "}
          <span className="font-medium text-gold-600">{serviceName}</span>
        </p>
      </div>

      {/* Branches list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branches.map((branch) => (
          <button
            key={branch._id}
            onClick={() => handleSelect(branch)}
            className="group card-standard text-start
                       hover:shadow-gov-lg hover:-translate-y-0.5 transition-all duration-300
                       focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2
                       border border-transparent hover:border-gold-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-navy-500 group-hover:text-gold-600 transition-colors">
                  {branch.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4 text-navy-400 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{branch.address}</span>
                </div>
                <span className="inline-block mt-3 px-2.5 py-0.5 bg-gold-50 text-gold-700 text-xs rounded-full font-medium border border-gold-200">
                  {branch.city}
                </span>
              </div>
              <ArrowLeft
                className="h-5 w-5 text-slate-300 group-hover:text-gold-500 transition-all mt-1 shrink-0"
                strokeWidth={1.75}
              />
            </div>
          </button>
        ))}
      </div>

      {branches.length === 0 && !loading && (
        <div className="text-center py-16 text-slate-400">{t("branches.empty")}</div>
      )}
    </div>
  );
}
