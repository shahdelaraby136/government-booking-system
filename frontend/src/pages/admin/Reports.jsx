import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import ErrorMessage from "../../components/ErrorMessage.jsx";
import { getAdminAppointments, getAdminReports } from "../../lib/api.js";

const STATUS_AR = {
  confirmed: "في الانتظار",
  verified: "تم التحقق",
  completed: "منجز",
  cancelled: "ملغي",
};

const RANGES = [
  { value: 7, label: "آخر 7 أيام" },
  { value: 14, label: "آخر 14 يوماً" },
  { value: 30, label: "آخر 30 يوماً" },
];

export default function AdminReports() {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminReports(days);
      setReport(data);
    } catch (err) {
      setError(err?.response?.data?.message || "تعذر تحميل التقرير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const totals = useMemo(() => {
    const s = (report?.series || []).reduce(
      (acc, b) => ({
        total: acc.total + b.total,
        confirmed: acc.confirmed + b.confirmed,
        verified: acc.verified + b.verified,
        completed: acc.completed + b.completed,
        cancelled: acc.cancelled + b.cancelled,
      }),
      { total: 0, confirmed: 0, verified: 0, completed: 0, cancelled: 0 }
    );
    return s;
  }, [report]);

  const maxValue = Math.max(1, ...(report?.series || []).map((b) => b.total));

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const result = await getAdminAppointments({ limit: 500 });
      const appointments = result?.data || [];

      const summaryRows = [
        ["الفترة", `آخر ${days} يوماً`],
        ["تاريخ التصدير", new Date().toLocaleString("ar-EG")],
        [],
        ["البند", "العدد"],
        ["إجمالي الحجوزات", totals.total],
        ["في الانتظار", totals.confirmed],
        ["تم التحقق", totals.verified],
        ["منجز", totals.completed],
        ["ملغي", totals.cancelled],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet["!cols"] = [{ wch: 28 }, { wch: 22 }];
      summarySheet["!views"] = [{ RTL: true }];

      const dailyHeader = ["التاريخ", "الإجمالي", "في الانتظار", "تم التحقق", "منجز", "ملغي"];
      const dailyData = [
        dailyHeader,
        ...(report?.series || []).map((b) => [
          b.date,
          b.total,
          b.confirmed,
          b.verified,
          b.completed,
          b.cancelled,
        ]),
      ];
      const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
      dailySheet["!cols"] = [
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
      ];
      dailySheet["!views"] = [{ RTL: true }];

      const apptHeader = [
        "رقم الحجز",
        "اسم المواطن",
        "الرقم القومي",
        "الهاتف",
        "الخدمة",
        "الفرع",
        "المدينة",
        "التاريخ",
        "وقت البدء",
        "وقت الانتهاء",
        "الحالة",
        "تاريخ الإنشاء",
      ];
      const apptData = [
        apptHeader,
        ...appointments.map((a) => [
          a.bookingReference || "",
          a.citizenName || "",
          a.nationalId || "",
          a.phone || "",
          a.serviceId?.name || "",
          a.branchId?.name || "",
          a.branchId?.city || "",
          formatDateOnly(a.slotId?.date),
          a.slotId?.startTime || "",
          a.slotId?.endTime || "",
          STATUS_AR[a.status] || a.status || "",
          a.createdAt ? new Date(a.createdAt).toLocaleString("ar-EG") : "",
        ]),
      ];
      const apptSheet = XLSX.utils.aoa_to_sheet(apptData);
      apptSheet["!cols"] = [
        { wch: 16 },
        { wch: 22 },
        { wch: 18 },
        { wch: 14 },
        { wch: 22 },
        { wch: 22 },
        { wch: 14 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 22 },
      ];
      apptSheet["!views"] = [{ RTL: true }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, summarySheet, "الملخص");
      XLSX.utils.book_append_sheet(wb, dailySheet, "الحجوزات اليومية");
      XLSX.utils.book_append_sheet(wb, apptSheet, "كل الحجوزات");

      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `تقرير-الحجوزات-${stamp}.xlsx`);
      toast.success("تم تنزيل التقرير");
    } catch (err) {
      toast.error(err?.response?.data?.message || "تعذر تصدير التقرير");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-500 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-gold-600" strokeWidth={1.75} />
            التقارير والإحصائيات
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            تحليل الحجوزات على مدار الفترة المختارة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="input-standard w-auto"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button onClick={load} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            تحديث
          </button>
          <button
            onClick={exportToExcel}
            disabled={exporting || loading || !!error}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            {exporting ? "جاري التصدير..." : "تصدير Excel"}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="جاري تحميل التقرير..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <TotalCard label="إجمالي" value={totals.total} color="text-navy-500" />
            <TotalCard label="في الانتظار" value={totals.confirmed} color="text-amber-600" />
            <TotalCard label="تم التحقق" value={totals.verified} color="text-emerald-600" />
            <TotalCard label="منجز" value={totals.completed} color="text-green-600" />
            <TotalCard label="ملغي" value={totals.cancelled} color="text-red-600" />
          </div>

          <section className="card-standard">
            <h2 className="text-lg font-bold text-navy-500 mb-5">الحجوزات اليومية</h2>
            <div className="space-y-2">
              {(report?.series || []).map((b) => (
                <div key={b.date} className="flex items-center gap-3 text-sm">
                  <div className="w-24 text-slate-500 font-mono text-xs" dir="ltr">
                    {b.date}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-navy-400 to-gold-500 flex items-center justify-end pe-2 text-white text-xs font-semibold"
                      style={{ width: `${(b.total / maxValue) * 100}%` }}
                    >
                      {b.total > 0 && b.total}
                    </div>
                  </div>
                  <div className="w-12 text-end font-bold text-navy-500">{b.total}</div>
                </div>
              ))}
            </div>

            {totals.total === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">
                لا توجد حجوزات في هذه الفترة
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function formatDateOnly(d) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function TotalCard({ label, value, color }) {
  return (
    <div className="card-standard text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
