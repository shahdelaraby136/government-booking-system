import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import {
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  IdCard,
  CheckCircle,
} from "lucide-react";
import { createAppointment } from "../lib/api";
import { useTranslation } from "../lib/i18n";
import ErrorMessage from "../components/ErrorMessage";

const PHONE_RE = /^01[0125]\d{8}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const NID_RE = /^\d{14}$/;

export default function ConfirmPage() {
  const router = useRouter();
  const { t, dateLocale } = useTranslation();
  const {
    serviceId,
    serviceName,
    branchId,
    branchName,
    branchCity,
    slotId,
    slotDate,
    slotStart,
    slotEnd,
  } = router.query;

  const [form, setForm] = useState({
    citizenName: "",
    citizenEmail: "",
    citizenPhone: "",
    nationalId: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const formattedDate = useMemo(() => {
    if (!slotDate) return "";
    return new Date(slotDate).toLocaleDateString(dateLocale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [slotDate, dateLocale]);

  if (!serviceId || !branchId || !slotId) {
    return <ErrorMessage message={t("confirm.missing")} onRetry={() => router.push("/")} />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.citizenName.trim() || form.citizenName.trim().length < 2) {
      next.citizenName = t("confirm.errName");
    }
    if (!EMAIL_RE.test(form.citizenEmail)) {
      next.citizenEmail = t("confirm.errEmail");
    }
    if (!PHONE_RE.test(form.citizenPhone)) {
      next.citizenPhone = t("confirm.errPhone");
    }
    if (!NID_RE.test(form.nationalId)) {
      next.nationalId = t("confirm.errNationalId");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    try {
      setSubmitting(true);
      const result = await createAppointment({
        serviceId,
        branchId,
        slotId,
        citizenName: form.citizenName.trim(),
        citizenEmail: form.citizenEmail.trim(),
        citizenPhone: form.citizenPhone.trim(),
        nationalId: form.nationalId.trim(),
      });
      const appt = result?.data;
      router.push({
        pathname: "/success",
        query: {
          ref: appt.bookingReference,
          serviceName: appt.serviceId?.name || serviceName,
          branchName: appt.branchId?.name || branchName,
          branchCity: appt.branchId?.city || branchCity,
          slotDate: appt.slotId?.date || slotDate,
          slotStart: appt.slotId?.startTime || slotStart,
          slotEnd: appt.slotId?.endTime || slotEnd,
          citizenName: appt.citizenName,
        },
      });
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.msg ||
        t("confirm.error");
      setServerError(apiMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-navy-500 hover:text-gold-600 mb-4 transition"
      >
        <ArrowRight className="h-4 w-4" strokeWidth={1.75} /> {t("confirm.back")}
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-navy-500">{t("confirm.title")}</h2>
        <p className="text-slate-500 mt-1">{t("confirm.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking summary */}
        <aside className="lg:col-span-1">
          <div className="card-standard bg-navy-50 border border-gold-200">
            <h3 className="font-semibold text-navy-600 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" strokeWidth={1.75} />
              {t("confirm.summary")}
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">{t("confirm.service")}</dt>
                <dd className="font-medium text-navy-600 mt-0.5">{serviceName}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("confirm.branch")}
                </dt>
                <dd className="font-medium text-navy-600 mt-0.5">{branchName}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">{t("confirm.city")}</dt>
                <dd className="font-medium text-navy-600 mt-0.5">{branchCity}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("confirm.date")}
                </dt>
                <dd className="font-medium text-navy-600 mt-0.5">{formattedDate}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.75} /> {t("confirm.time")}
                </dt>
                <dd className="font-medium text-navy-600 mt-0.5" dir="ltr">
                  {slotStart} - {slotEnd}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        {/* Form */}
        <section className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card-standard space-y-5" noValidate>
            <h3 className="font-semibold text-navy-600 mb-1">{t("confirm.formTitle")}</h3>

            <Field
              label={t("confirm.name")}
              icon={User}
              name="citizenName"
              value={form.citizenName}
              onChange={handleChange}
              placeholder={t("confirm.namePlaceholder")}
              error={errors.citizenName}
              autoComplete="name"
            />

            <Field
              label={t("confirm.email")}
              icon={Mail}
              name="citizenEmail"
              type="email"
              value={form.citizenEmail}
              onChange={handleChange}
              placeholder={t("confirm.emailPlaceholder")}
              error={errors.citizenEmail}
              autoComplete="email"
              dir="ltr"
            />

            <Field
              label={t("confirm.phone")}
              icon={Phone}
              name="citizenPhone"
              type="tel"
              value={form.citizenPhone}
              onChange={handleChange}
              placeholder={t("confirm.phonePlaceholder")}
              error={errors.citizenPhone}
              autoComplete="tel"
              inputMode="numeric"
              dir="ltr"
            />

            <Field
              label={t("confirm.nationalId")}
              icon={IdCard}
              name="nationalId"
              value={form.nationalId}
              onChange={handleChange}
              placeholder={t("confirm.nationalIdPlaceholder")}
              error={errors.nationalId}
              inputMode="numeric"
              maxLength={14}
              dir="ltr"
            />

            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary inline-flex items-center gap-2"
              >
                {submitting ? t("confirm.submitting") : t("confirm.submit")}
                {!submitting && <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, name, error, dir, ...rest }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 pointer-events-none">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
        <input
          id={name}
          name={name}
          dir={dir}
          className={`input-standard ps-9 ${error ? "border-red-400 focus:border-red-500" : ""}`}
          {...rest}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
