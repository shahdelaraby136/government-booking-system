const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function formatArabicDate(isoDate) {
  try {
    return new Date(isoDate).toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(isoDate);
  }
}

function buildHtml(appt) {
  const dateLabel = formatArabicDate(appt.slotId?.date);
  const timeLabel = `${appt.slotId?.startTime} - ${appt.slotId?.endTime}`;
  const serviceName = appt.serviceId?.name || "";
  const branchName = appt.branchId?.name || "";
  const branchCity = appt.branchId?.city || "";
  const branchAddress = appt.branchId?.address || "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>تأكيد حجز موعد</title>
</head>
<body style="margin:0;padding:24px;background:#F8FAFC;font-family:Tajawal,Arial,sans-serif;color:#1E293B;direction:rtl;">
  <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:#0A2540;padding:24px 28px;color:#ffffff;">
        <div style="display:inline-block;width:40px;height:40px;background:#C5A059;border-radius:8px;text-align:center;line-height:40px;font-weight:bold;color:#0A2540;font-size:20px;vertical-align:middle;">ح</div>
        <span style="display:inline-block;margin-right:12px;vertical-align:middle;">
          <div style="font-size:18px;font-weight:bold;line-height:1.2;">بوابة الحجز الحكومية</div>
          <div style="font-size:12px;color:#C5A059;">بوابة خدمات المواطنين</div>
        </span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px 8px;text-align:center;">
        <div style="display:inline-block;width:64px;height:64px;background:#dcfce7;border-radius:50%;line-height:64px;font-size:32px;color:#16A34A;">✓</div>
        <h1 style="margin:16px 0 4px;font-size:22px;color:#0A2540;">تم تأكيد حجزك بنجاح</h1>
        <p style="margin:0;color:#64748B;font-size:14px;">احتفظ برقم الحجز التالي للرجوع إليه عند الحضور</p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px 0;text-align:center;">
        <div style="display:inline-block;background:#F8FAFC;border:1px solid #C5A059;border-radius:12px;padding:14px 24px;">
          <div style="font-size:11px;color:#64748B;">رقم الحجز</div>
          <div style="font-size:22px;font-weight:bold;color:#0A2540;letter-spacing:2px;direction:ltr;">${appt.bookingReference}</div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E2E8F0;border-radius:12px;">
          ${row("الاسم", appt.citizenName)}
          ${row("الخدمة", serviceName)}
          ${row("الفرع", branchName)}
          ${row("المدينة", branchCity)}
          ${branchAddress ? row("العنوان", branchAddress) : ""}
          ${row("التاريخ", dateLabel)}
          ${row("الوقت", timeLabel, true)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 24px;">
        <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;font-size:13px;color:#92400E;">
          يرجى الحضور قبل الموعد بـ <strong>15 دقيقة</strong> ومعك بطاقة الرقم القومي.
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#0A2540;color:#94A3B8;font-size:12px;text-align:center;padding:16px;">
        © ${new Date().getFullYear()} بوابة الحجز الحكومية. جميع الحقوق محفوظة.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function row(label, value, isLtr = false) {
  return `<tr>
    <td style="padding:10px 14px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;width:35%;">${label}</td>
    <td style="padding:10px 14px;border-bottom:1px solid #E2E8F0;font-size:14px;color:#0A2540;font-weight:600;${isLtr ? "direction:ltr;text-align:right;" : ""}">${value}</td>
  </tr>`;
}

function buildText(appt) {
  return [
    "تم تأكيد حجزك بنجاح",
    "",
    `رقم الحجز: ${appt.bookingReference}`,
    `الاسم: ${appt.citizenName}`,
    `الخدمة: ${appt.serviceId?.name || ""}`,
    `الفرع: ${appt.branchId?.name || ""} - ${appt.branchId?.city || ""}`,
    `التاريخ: ${formatArabicDate(appt.slotId?.date)}`,
    `الوقت: ${appt.slotId?.startTime} - ${appt.slotId?.endTime}`,
    "",
    "يرجى الحضور قبل الموعد بـ 15 دقيقة ومعك بطاقة الرقم القومي.",
    "",
    "بوابة الحجز الحكومية",
  ].join("\n");
}

async function sendBookingConfirmation(appt) {
  const t = getTransporter();
  if (!t) {
    console.warn("[mailer] SMTP not configured — skipping email for", appt.bookingReference);
    return { sent: false, reason: "smtp-not-configured" };
  }

  const from = process.env.SMTP_FROM || `"بوابة الحجز الحكومية" <${process.env.SMTP_USER}>`;

  try {
    const info = await t.sendMail({
      from,
      to: appt.citizenEmail,
      subject: `تأكيد حجز موعد - ${appt.bookingReference}`,
      text: buildText(appt),
      html: buildHtml(appt),
    });
    console.log("[mailer] sent", appt.bookingReference, "->", appt.citizenEmail, "messageId:", info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error("[mailer] send failed for", appt.bookingReference, "-", err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendBookingConfirmation };
