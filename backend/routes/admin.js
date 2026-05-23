// Admin panel — covers section 5 (Yasmeen's simple CRUD) plus
// section 6 (Admin Advanced: stats / reports / slot capacity / logs).
// Mounted at /api/admin in server.js.

const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const Service = require("../models/Service");
const Branch = require("../models/Branch");
const Slot = require("../models/Slot");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { logAction, recentLogs } = require("../services/activityLog");

// ---------------------- Section 5: full CRUD ----------------------
//
// Original yasmeen endpoints (GET/POST /data) kept for backward compat —
// they push string items into an in-memory bucket. The real Manage UI now
// uses the proper /users, /services, /branches, /roles endpoints below.

const data = {
  "المستخدمين": [],
  "الخدمات": [],
  "الفروع": [],
  "الأدوار": [],
};

router.get("/data", (_req, res) => {
  res.json(data);
});

router.post("/data", (req, res) => {
  try {
    const { category, item } = req.body;
    if (data[category] !== undefined) {
      data[category].push(item);
      logAction("admin.manage.add", { category, item });
      res.json(data);
    } else {
      res.status(400).json({ message: "القسم غير موجود" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// -------- Users CRUD --------
router.get("/users", async (_req, res) => {
  try {
    const users = await User.find().select("-password -otp -otpExpire").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { firstName, lastName, email, nationalId, role, password, phone } = req.body;
    if (!firstName || !lastName || !email || !nationalId || !password) {
      return res.status(400).json({ success: false, message: "كل الحقول مطلوبة" });
    }
    const exists = await User.findOne({ $or: [{ email }, { nationalId }] });
    if (exists) {
      return res.status(409).json({ success: false, message: "البريد أو الرقم القومي مسجل" });
    }
    const user = await User.create({
      firstName,
      lastName,
      email,
      nationalId,
      role: role || "citizen",
      password,
      phone: phone || "",
    });
    logAction("admin.users.create", { id: user._id.toString(), email });
    const safe = user.toObject();
    delete safe.password;
    delete safe.otp;
    delete safe.otpExpire;
    res.status(201).json({ success: true, data: safe });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const update = {};
    ["firstName", "lastName", "email", "nationalId", "role", "phone"].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).select("-password -otp -otpExpire");
    if (!user) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    logAction("admin.users.update", { id: user._id.toString(), update });
    res.json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    logAction("admin.users.delete", { id: user._id.toString(), email: user.email });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// -------- Services CRUD --------
router.get("/services", async (_req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: 1 });
    res.json({ success: true, count: services.length, data: services });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/services", async (req, res) => {
  try {
    const { name, description, icon, nameEn, descriptionEn } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "الاسم مطلوب" });
    const service = await Service.create({
      name,
      description: description || "",
      icon: icon || "clipboard-list",
      nameEn: nameEn || "",
      descriptionEn: descriptionEn || "",
    });
    logAction("admin.services.create", { id: service._id.toString(), name });
    res.status(201).json({ success: true, data: service });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/services/:id", async (req, res) => {
  try {
    const update = {};
    ["name", "description", "icon", "nameEn", "descriptionEn", "isActive"].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    const service = await Service.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!service) return res.status(404).json({ success: false, message: "الخدمة غير موجودة" });
    logAction("admin.services.update", { id: service._id.toString(), update });
    res.json({ success: true, data: service });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/services/:id", async (req, res) => {
  try {
    const branches = await Branch.find({ serviceId: req.params.id }).select("_id");
    const branchIds = branches.map((b) => b._id);
    await Slot.deleteMany({ branchId: { $in: branchIds } });
    await Branch.deleteMany({ serviceId: req.params.id });
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "الخدمة غير موجودة" });
    logAction("admin.services.delete", {
      id: service._id.toString(),
      name: service.name,
      cascadedBranches: branches.length,
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// -------- Branches CRUD --------
router.get("/branches", async (_req, res) => {
  try {
    const branches = await Branch.find()
      .populate("serviceId", "name")
      .sort({ city: 1, name: 1 });
    res.json({ success: true, count: branches.length, data: branches });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/branches", async (req, res) => {
  try {
    const { name, city, address, serviceId, nameEn, cityEn, addressEn } = req.body;
    if (!name || !city || !address || !serviceId) {
      return res
        .status(400)
        .json({ success: false, message: "الاسم والمدينة والعنوان والخدمة مطلوبين" });
    }
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, message: "الخدمة غير موجودة" });
    const branch = await Branch.create({
      name,
      city,
      address,
      serviceId,
      nameEn: nameEn || "",
      cityEn: cityEn || "",
      addressEn: addressEn || "",
    });
    logAction("admin.branches.create", { id: branch._id.toString(), name });
    const populated = await Branch.findById(branch._id).populate("serviceId", "name");
    res.status(201).json({ success: true, data: populated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/branches/:id", async (req, res) => {
  try {
    const update = {};
    ["name", "city", "address", "serviceId", "nameEn", "cityEn", "addressEn", "isActive"].forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });
    const branch = await Branch.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate("serviceId", "name");
    if (!branch) return res.status(404).json({ success: false, message: "الفرع غير موجود" });
    logAction("admin.branches.update", { id: branch._id.toString(), update });
    res.json({ success: true, data: branch });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/branches/:id", async (req, res) => {
  try {
    await Slot.deleteMany({ branchId: req.params.id });
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: "الفرع غير موجود" });
    logAction("admin.branches.delete", { id: branch._id.toString(), name: branch.name });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// -------- Roles CRUD (in-memory) --------
const roles = [
  { id: "r1", name: "citizen", label: "مواطن" },
  { id: "r2", name: "employee", label: "موظف" },
  { id: "r4", name: "admin", label: "مسؤول النظام" },
];

router.get("/roles", (_req, res) => {
  res.json({ success: true, count: roles.length, data: roles });
});

router.post("/roles", (req, res) => {
  try {
    const { name, label } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "اسم الدور مطلوب" });
    if (roles.some((r) => r.name === name)) {
      return res.status(409).json({ success: false, message: "الدور موجود مسبقاً" });
    }
    const role = { id: `r${Date.now()}`, name, label: label || name };
    roles.push(role);
    logAction("admin.roles.create", role);
    res.status(201).json({ success: true, data: role });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/roles/:id", (req, res) => {
  const idx = roles.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "الدور غير موجود" });
  const { name, label } = req.body;
  if (name !== undefined) roles[idx].name = name;
  if (label !== undefined) roles[idx].label = label;
  logAction("admin.roles.update", roles[idx]);
  res.json({ success: true, data: roles[idx] });
});

router.delete("/roles/:id", (req, res) => {
  const idx = roles.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "الدور غير موجود" });
  const removed = roles.splice(idx, 1)[0];
  logAction("admin.roles.delete", removed);
  res.json({ success: true });
});

// ---------------------- Section 6: admin advanced ----------------------

// GET /api/admin/stats — totals + today's snapshot
router.get("/stats", async (_req, res) => {
  try {
    const [
      servicesCount,
      branchesCount,
      slotsCount,
      employeesCount,
      usersCount,
      appointmentsTotal,
      pending,
      verified,
      completed,
      cancelled,
    ] = await Promise.all([
      Service.countDocuments(),
      Branch.countDocuments(),
      Slot.countDocuments(),
      Employee.countDocuments(),
      User.countDocuments(),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: "confirmed" }),
      Appointment.countDocuments({ status: "verified" }),
      Appointment.countDocuments({ status: "completed" }),
      Appointment.countDocuments({ status: "cancelled" }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todaySlotIds = await Slot.find({ date: { $gte: today, $lt: tomorrow } }).distinct("_id");
    const todayAppointments = await Appointment.countDocuments({
      slotId: { $in: todaySlotIds },
    });

    res.json({
      success: true,
      data: {
        services: servicesCount,
        branches: branchesCount,
        slots: slotsCount,
        employees: employeesCount,
        users: usersCount,
        appointments: {
          total: appointmentsTotal,
          pending,
          verified,
          completed,
          cancelled,
          today: todayAppointments,
        },
      },
    });
  } catch (error) {
    console.error("admin/stats error:", error.message);
    res.status(500).json({ success: false, message: "تعذر جلب الإحصائيات" });
  }
});

// GET /api/admin/reports?days=7 — daily bookings breakdown
router.get("/reports", async (req, res) => {
  try {
    const days = Math.max(1, Math.min(parseInt(req.query.days, 10) || 7, 90));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const slots = await Slot.find({ date: { $gte: start } }).select("_id date");
    const slotById = new Map(slots.map((s) => [s._id.toString(), s.date]));
    const slotIds = slots.map((s) => s._id);

    const appts = await Appointment.find({ slotId: { $in: slotIds } }).select("slotId status");

    // Bucket by local YYYY-MM-DD
    const buckets = new Map();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = localDayKey(d);
      buckets.set(key, { date: key, total: 0, confirmed: 0, verified: 0, completed: 0, cancelled: 0 });
    }
    for (const a of appts) {
      const slotDate = slotById.get(a.slotId.toString());
      if (!slotDate) continue;
      const key = localDayKey(slotDate);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.total += 1;
      if (bucket[a.status] !== undefined) bucket[a.status] += 1;
    }

    res.json({
      success: true,
      data: {
        days,
        startDate: localDayKey(start),
        series: Array.from(buckets.values()),
      },
    });
  } catch (error) {
    console.error("admin/reports error:", error.message);
    res.status(500).json({ success: false, message: "تعذر جلب التقارير" });
  }
});

// GET /api/admin/slots?date=YYYY-MM-DD — capacity table for a date
router.get("/slots", async (req, res) => {
  try {
    let start;
    if (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      const [y, m, d] = req.query.date.split("-").map(Number);
      start = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
    }
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const slots = await Slot.find({ date: { $gte: start, $lt: end } })
      .populate("branchId", "name city")
      .sort({ "branchId.name": 1, startTime: 1 });

    res.json({
      success: true,
      date: localDayKey(start),
      count: slots.length,
      data: slots.map((s) => ({
        _id: s._id,
        branch: s.branchId,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        isActive: s.isActive,
        date: s.date,
      })),
    });
  } catch (error) {
    console.error("admin/slots error:", error.message);
    res.status(500).json({ success: false, message: "تعذر جلب المواعيد" });
  }
});

// PUT /api/admin/slots/:id — change capacity or active flag
router.put("/slots/:id", async (req, res) => {
  try {
    const { capacity, isActive } = req.body;
    const update = {};
    if (capacity !== undefined) {
      const cap = parseInt(capacity, 10);
      if (Number.isNaN(cap) || cap < 0 || cap > 50) {
        return res.status(400).json({ success: false, message: "السعة يجب أن تكون بين 0 و 50" });
      }
      update.capacity = cap;
    }
    if (isActive !== undefined) update.isActive = !!isActive;

    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: "الموعد غير موجود" });
    if (update.capacity !== undefined && update.capacity < slot.bookedCount) {
      return res.status(409).json({
        success: false,
        message: `لا يمكن خفض السعة لأقل من عدد المحجوزين (${slot.bookedCount})`,
      });
    }

    Object.assign(slot, update);
    await slot.save();
    logAction("admin.slots.update", { id: slot._id.toString(), update });
    res.json({ success: true, data: slot });
  } catch (error) {
    console.error("admin/slots PUT error:", error.message);
    res.status(500).json({ success: false, message: "تعذر تحديث الموعد" });
  }
});

// GET /api/admin/appointments?status=&limit= — admin-wide list (no branch scope)
router.get("/appointments", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const filter = {};
    if (req.query.status && ["confirmed", "verified", "completed", "cancelled"].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const appts = await Appointment.find(filter)
      .populate("serviceId", "name")
      .populate("branchId", "name city")
      .populate("slotId", "date startTime endTime")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, count: appts.length, data: appts });
  } catch (error) {
    console.error("admin/appointments error:", error.message);
    res.status(500).json({ success: false, message: "تعذر جلب الحجوزات" });
  }
});

// GET /api/admin/logs — activity log (in-memory ring buffer)
router.get("/logs", (_req, res) => {
  res.json({ success: true, data: recentLogs() });
});

function localDayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

module.exports = router;
