import { useEffect } from "react";

const TRANSLATIONS = {
  "app.title": "بوابة الحجز الحكومية",
  "app.subtitle": "بوابة خدمات المواطنين",
  "nav.services": "الخدمات",
  "nav.tagline": "احجز موعدك إلكترونياً",
  "footer.rights": "بوابة الحجز الحكومية. جميع الحقوق محفوظة.",
  "breadcrumb.services": "الخدمات",
  "breadcrumb.branches": "الفروع",
  "breadcrumb.slots": "المواعيد",
  "breadcrumb.confirm": "التأكيد",
  "breadcrumb.success": "تم الحجز",

  "services.title": "الخدمات الحكومية",
  "services.subtitle": "اختر الخدمة لحجز موعدك",
  "services.loading": "جاري تحميل الخدمات الحكومية...",
  "services.error": "تعذر تحميل الخدمات. حاول مجدداً.",
  "services.empty": "لا توجد خدمات متاحة حالياً.",

  "branches.back": "العودة إلى الخدمات",
  "branches.title": "اختر الفرع",
  "branches.subtitle": "الفروع المتاحة لـ",
  "branches.loading": "جاري تحميل الفروع...",
  "branches.error": "تعذر تحميل الفروع. حاول مجدداً.",
  "branches.empty": "لا توجد فروع متاحة لهذه الخدمة.",
  "branches.noService": "لم يتم اختيار خدمة. ارجع واختر خدمة أولاً.",

  "slots.back": "العودة إلى الفروع",
  "slots.title": "اختر الموعد",
  "slots.loading": "جاري تحميل المواعيد المتاحة...",
  "slots.error": "تعذر تحميل المواعيد. حاول مجدداً.",
  "slots.empty": "لا توجد مواعيد متاحة لهذا الفرع.",
  "slots.noBranch": "لم يتم اختيار فرع. ارجع واختر فرعاً أولاً.",
  "slots.selected": "تم اختيار الموعد",
  "slots.branch": "الفرع",
  "slots.city": "المدينة",
  "slots.date": "التاريخ",
  "slots.time": "الوقت",
  "slots.continue": "متابعة لتأكيد الحجز",

  "confirm.back": "العودة لاختيار الموعد",
  "confirm.title": "تأكيد بيانات الحجز",
  "confirm.subtitle": "راجع تفاصيل موعدك وأدخل بياناتك لإتمام الحجز",
  "confirm.summary": "ملخص الحجز",
  "confirm.service": "الخدمة",
  "confirm.branch": "الفرع",
  "confirm.city": "المدينة",
  "confirm.date": "التاريخ",
  "confirm.time": "الوقت",
  "confirm.formTitle": "بيانات المواطن",
  "confirm.name": "الاسم الكامل",
  "confirm.namePlaceholder": "مثال: محمد أحمد علي",
  "confirm.email": "البريد الإلكتروني",
  "confirm.emailPlaceholder": "name@example.com",
  "confirm.phone": "رقم الهاتف",
  "confirm.phonePlaceholder": "01012345678",
  "confirm.nationalId": "الرقم القومي",
  "confirm.nationalIdPlaceholder": "14 رقم",
  "confirm.submit": "تأكيد الحجز",
  "confirm.submitting": "جاري إتمام الحجز...",
  "confirm.missing": "بيانات الموعد ناقصة. ارجع واختر موعداً أولاً.",
  "confirm.error": "تعذر إتمام الحجز. حاول مجدداً.",
  "confirm.errName": "الاسم مطلوب (حرفين على الأقل).",
  "confirm.errEmail": "أدخل بريداً إلكترونياً صحيحاً.",
  "confirm.errPhone": "رقم هاتف مصري غير صحيح. ابدأ بـ 010 / 011 / 012 / 015.",
  "confirm.errNationalId": "الرقم القومي يجب أن يكون 14 رقماً.",

  "success.title": "تم تأكيد حجزك بنجاح",
  "success.subtitle": "احتفظ برقم الحجز الخاص بك للرجوع إليه",
  "success.reference": "رقم الحجز",
  "success.service": "الخدمة",
  "success.branch": "الفرع",
  "success.city": "المدينة",
  "success.date": "التاريخ",
  "success.time": "الوقت",
  "success.name": "الاسم",
  "success.note": "تم إرسال تأكيد إلى بريدك الإلكتروني. يرجى الحضور قبل الموعد بـ 15 دقيقة ومعك بطاقة الرقم القومي.",
  "success.newBooking": "حجز موعد جديد",
  "success.print": "طباعة التأكيد",

  "common.retry": "حاول مجدداً",
  "common.loading": "جاري التحميل...",
};

export function LanguageProvider({ children }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);
  return children;
}

export function useTranslation() {
  return {
    t: (key) => TRANSLATIONS[key] ?? key,
    dateLocale: "ar-EG",
  };
}
