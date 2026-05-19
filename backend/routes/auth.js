const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Branch = require("../models/Branch");
const { sendOtpEmail } = require("../services/mailer");

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
    return false;
  }
  return true;
}

function generateOtp(length = 6, expiresInMinutes = 5) {
  let otp = "";
  for (let i = 0; i < length; i++) otp += Math.floor(Math.random() * 10);
  const otpExpire = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  return { otp, otpExpire };
}

// POST /api/auth/register
router.post(
  "/register",
  [
    body("firstName").trim().notEmpty().withMessage("الاسم الأول مطلوب"),
    body("lastName").trim().notEmpty().withMessage("الاسم الأخير مطلوب"),
    body("email").trim().isEmail().withMessage("بريد إلكتروني غير صحيح").toLowerCase(),
    body("password").isLength({ min: 6 }).withMessage("كلمة المرور 6 أحرف على الأقل"),
    body("nationalId").matches(/^\d{14}$/).withMessage("الرقم القومي 14 رقم"),
    body("role").optional().isIn(["citizen", "employee", "admin"]).withMessage("الدور غير صالح"),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { firstName, lastName, email, password, nationalId, role } = req.body;
      const finalRole = role || "citizen";

      const exists = await User.findOne({ $or: [{ email }, { nationalId }] });
      if (exists) {
        const field = exists.email === email ? "البريد الإلكتروني" : "الرقم القومي";
        return res.status(409).json({ success: false, message: `${field} مسجل مسبقاً` });
      }

      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        nationalId,
        role: finalRole,
      });

      // Auto-create matching Employee record so the new employee can log in
      // and hit the dashboard right away. Assigned to the first active branch
      // by default — admins can reassign later if needed.
      if (finalRole === "employee") {
        const branch = await firstActiveBranch();
        if (branch) {
          const employeeCode = await nextEmployeeCode();
          await Employee.create({
            employeeCode,
            name: `${firstName} ${lastName}`.trim(),
            email,
            role: "employee",
            branchId: branch._id,
          });
        }
      }

      res.status(201).json({
        success: true,
        message: "تم إنشاء الحساب بنجاح",
        data: publicUser(user),
      });
    } catch (err) {
      console.error("register error:", err.message);
      res.status(500).json({ success: false, message: "تعذر إنشاء الحساب" });
    }
  }
);

async function firstActiveBranch() {
  return Branch.findOne({ isActive: true }).sort({ createdAt: 1 });
}

async function nextEmployeeCode() {
  // Find the highest existing EMP-XXX code and increment.
  // Codes look like "EMP-001"; we read the numeric suffix.
  const latest = await Employee.findOne({ employeeCode: /^EMP-\d+$/ })
    .sort({ employeeCode: -1 })
    .select("employeeCode");
  const lastNum = latest ? parseInt(latest.employeeCode.split("-")[1], 10) || 0 : 0;
  const next = (lastNum + 1).toString().padStart(3, "0");
  return `EMP-${next}`;
}

// POST /api/auth/login  (email+password OR nationalId+password)
router.post(
  "/login",
  [
    body("password").notEmpty().withMessage("كلمة المرور مطلوبة"),
    body("email").optional().isEmail().withMessage("بريد إلكتروني غير صحيح").toLowerCase(),
    body("nationalId").optional().matches(/^\d{14}$/).withMessage("الرقم القومي 14 رقم"),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { email, nationalId, password } = req.body;
      if (!email && !nationalId) {
        return res
          .status(400)
          .json({ success: false, message: "أدخل البريد الإلكتروني أو الرقم القومي" });
      }

      const user = await User.findOne(email ? { email } : { nationalId });
      if (!user) {
        return res.status(404).json({ success: false, message: "الحساب غير موجود" });
      }

      const ok = await user.comparePassword(password);
      if (!ok) {
        return res.status(401).json({ success: false, message: "كلمة المرور غير صحيحة" });
      }

      const payload = publicUser(user);

      // For employees, attach their branch info so the dashboard can render.
      if (user.role === "employee") {
        let employee = await Employee.findOne({ email: user.email, isActive: true })
          .populate("branchId", "name nameEn city cityEn address");

        // Self-heal: if a stuck employee account has no Employee record yet
        // (e.g. registered before we wired this up), auto-link to the first
        // active branch so login just works.
        if (!employee) {
          const branch = await firstActiveBranch();
          if (branch) {
            const employeeCode = await nextEmployeeCode();
            const created = await Employee.create({
              employeeCode,
              name: `${user.firstName} ${user.lastName}`.trim(),
              email: user.email,
              role: "employee",
              branchId: branch._id,
            });
            employee = await Employee.findById(created._id)
              .populate("branchId", "name nameEn city cityEn address");
          }
        }

        if (employee) {
          payload.employeeId = employee._id;
          payload.employeeCode = employee.employeeCode;
          payload.branch = employee.branchId;
          payload.role = employee.role;
        }
      }

      res.json({ success: true, message: "تم تسجيل الدخول بنجاح", data: payload });
    } catch (err) {
      console.error("login error:", err.message);
      res.status(500).json({ success: false, message: "تعذر تسجيل الدخول" });
    }
  }
);

// POST /api/auth/sendOtp  (forget-password step 1)
router.post(
  "/sendOtp",
  [body("nationalId").matches(/^\d{14}$/).withMessage("الرقم القومي 14 رقم")],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { nationalId } = req.body;
      const user = await User.findOne({ nationalId });
      if (!user) {
        return res.status(404).json({ success: false, message: "لا يوجد حساب بهذا الرقم القومي" });
      }

      const { otp, otpExpire } = generateOtp(6);
      user.otp = otp;
      user.otpExpire = otpExpire;
      await user.save();

      const result = await sendOtpEmail({ to: user.email, otp });

      res.json({
        success: true,
        message: result.sent
          ? `تم إرسال رمز التحقق إلى ${maskEmail(user.email)}`
          : `رمز التحقق: ${otp} (لم يتم إرسال البريد — تحقق من إعدادات SMTP)`,
        email: maskEmail(user.email),
      });
    } catch (err) {
      console.error("sendOtp error:", err.message);
      res.status(500).json({ success: false, message: "تعذر إرسال رمز التحقق" });
    }
  }
);

// POST /api/auth/resetpassword
router.post(
  "/resetpassword",
  [
    body("email").trim().isEmail().withMessage("بريد إلكتروني غير صحيح").toLowerCase(),
    body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("رمز التحقق 6 خانات"),
    body("newPassword").isLength({ min: 6 }).withMessage("كلمة المرور 6 أحرف على الأقل"),
  ],
  async (req, res) => {
    if (!validate(req, res)) return;
    try {
      const { email, otp, newPassword } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: "الحساب غير موجود" });
      }
      if (!user.otp || user.otp !== otp) {
        return res.status(400).json({ success: false, message: "رمز التحقق غير صحيح" });
      }
      if (!user.otpExpire || user.otpExpire.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: "انتهت صلاحية رمز التحقق" });
      }

      user.password = newPassword;
      user.otp = null;
      user.otpExpire = null;
      await user.save();

      res.json({ success: true, message: "تم تحديث كلمة المرور بنجاح" });
    } catch (err) {
      console.error("resetpassword error:", err.message);
      res.status(500).json({ success: false, message: "تعذر تحديث كلمة المرور" });
    }
  }
);

function publicUser(u) {
  return {
    _id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    nationalId: u.nationalId,
    role: u.role,
    phone: u.phone || "",
  };
}

function maskEmail(email) {
  const [name, domain] = String(email).split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

module.exports = router;
