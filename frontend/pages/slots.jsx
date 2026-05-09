import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Clock, Calendar, ArrowRight, ArrowLeft, Check, CheckCircle } from "lucide-react";
import { getSlots } from "../lib/api";
import { useTranslation } from "../lib/i18n";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

export default function SlotsPage() {
  const router = useRouter();
  const { t, dateLocale } = useTranslation();
  const { serviceId, serviceName, branchId, branchName, branchCity } = router.query;
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const fetchSlots = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getSlots(branchId);
      setSlots(data);
    } catch (err) {
      setError(t("slots.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) fetchSlots();
  }, [branchId]);

  if (!branchId) return <ErrorMessage message={t("slots.noBranch")} />;
  if (loading) return <LoadingSpinner message={t("slots.loading")} />;
  if (error) return <ErrorMessage message={error} onRetry={fetchSlots} />;

  // Group slots by date for cleaner display
  const grouped = {};
  slots.forEach((slot) => {
    const dateKey = new Date(slot.date).toLocaleDateString(dateLocale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(slot);
  });

  const selectedDate = selectedSlot
    ? new Date(selectedSlot.date).toLocaleDateString(dateLocale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const handleContinue = () => {
    if (!selectedSlot) return;
    router.push({
      pathname: "/confirm",
      query: {
        serviceId,
        serviceName,
        branchId,
        branchName,
        branchCity,
        slotId: selectedSlot._id,
        slotDate: selectedSlot.date,
        slotStart: selectedSlot.startTime,
        slotEnd: selectedSlot.endTime,
      },
    });
  };

  return (
    <div>
      {/* Back + header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-navy-500 hover:text-gold-600 mb-4 transition"
      >
        <ArrowRight className="h-4 w-4" strokeWidth={1.75} /> {t("slots.back")}
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-navy-500">{t("slots.title")}</h2>
        <p className="text-slate-500 mt-1">
          <span className="font-medium text-gold-600">{branchName}</span> &mdash; {branchCity}
        </p>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-slate-400">{t("slots.empty")}</div>
      )}

      {Object.entries(grouped).map(([dateLabel, dateSlots]) => (
        <div key={dateLabel} className="mb-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <Calendar className="h-4 w-4 text-gold-500" strokeWidth={1.75} />
            {dateLabel}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {dateSlots.map((slot) => {
              const isSelected = selectedSlot?._id === slot._id;
              return (
                <button
                  key={slot._id}
                  onClick={() => setSelectedSlot(slot)}
                  className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all
                    ${
                      isSelected
                        ? "border-gold-500 bg-navy-500 text-white shadow-gov"
                        : "border-slate-200 bg-white text-slate-700 hover:border-gold-400 hover:bg-gold-50"
                    }
                    focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2`}
                >
                  <Clock className="h-4 w-4" strokeWidth={1.75} />
                  <span dir="ltr">{slot.startTime} - {slot.endTime}</span>
                  {isSelected && (
                    <Check
                      className="h-3.5 w-3.5 absolute top-1 end-1 text-gold-300"
                      strokeWidth={2.5}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selection summary + continue */}
      {selectedSlot && (
        <div className="card-standard mt-8 bg-navy-50 border border-gold-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-navy-600 mb-2">{t("slots.selected")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">{t("slots.branch")}:</span>{" "}
                  <span className="font-medium text-navy-600">{branchName}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t("slots.city")}:</span>{" "}
                  <span className="font-medium text-navy-600">{branchCity}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t("slots.date")}:</span>{" "}
                  <span className="font-medium text-navy-600">{selectedDate}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t("slots.time")}:</span>{" "}
                  <span className="font-medium text-navy-600" dir="ltr">
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleContinue}
              className="btn-primary inline-flex items-center gap-2"
            >
              {t("slots.continue")}
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
