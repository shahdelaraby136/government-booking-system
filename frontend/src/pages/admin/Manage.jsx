import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Pencil,
  Trash2,
  Plus,
  X,
  Search,
  Users,
  Briefcase,
  Building2,
  ShieldCheck,
  Settings,
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import {
  adminUsers,
  adminServices,
  adminBranches,
  adminRoles,
} from "../../lib/api.js";

const TABS = [
  { key: "users", label: "المستخدمين", icon: Users, api: adminUsers },
  { key: "services", label: "الخدمات", icon: Briefcase, api: adminServices },
  { key: "branches", label: "الفروع", icon: Building2, api: adminBranches },
  { key: "roles", label: "الأدوار", icon: ShieldCheck, api: adminRoles },
];

export default function Manage() {
  const [tab, setTab] = useState("users");
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const tabApi = TABS.find((t) => t.key === tab).api;
  const currentTab = TABS.find((t) => t.key === tab);

  async function load() {
    try {
      setLoading(true);
      const list = await tabApi.list();
      setItems(list || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  async function loadServices() {
    try {
      const list = await adminServices.list();
      setServices(list || []);
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    load();
    loadServices();
    setSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleSave(payload) {
    try {
      if (editing?._id || editing?.id) {
        const id = editing._id || editing.id;
        await tabApi.update(id, payload);
        toast.success("تم تحديث البيانات");
      } else {
        await tabApi.create(payload);
        toast.success("تم إضافة العنصر");
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "تعذر حفظ البيانات");
    }
  }

  async function handleDelete() {
    if (!confirmDel) return;
    try {
      const id = confirmDel._id || confirmDel.id;
      await tabApi.remove(id);
      toast.success("تم الحذف");
      setConfirmDel(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "تعذر الحذف");
    }
  }

  const filtered = items.filter((it) => {
    if (!search.trim()) return true;
    return JSON.stringify(it).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-500 flex items-center gap-2">
          <Settings className="h-6 w-6 text-gold-600" strokeWidth={1.75} />
          الإدارة الأساسية
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          إدارة كاملة (إضافة / تعديل / حذف) للمستخدمين والخدمات والفروع والأدوار
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                active
                  ? "bg-navy-500 text-white shadow-gov"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-gold-400 hover:text-gold-600"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="card-standard mb-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 pointer-events-none">
              <Search className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`ابحث في ${currentTab.label}...`}
              className="input-standard ps-9"
            />
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn-primary inline-flex items-center justify-center gap-2 sm:w-auto"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            إضافة {currentTab.label}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner message="جاري التحميل..." />
      ) : filtered.length === 0 ? (
        <div className="card-standard text-center py-12 text-slate-500">
          <currentTab.icon className="h-10 w-10 mx-auto mb-2 text-slate-300" strokeWidth={1.5} />
          لا توجد عناصر
        </div>
      ) : (
        <div className="card-standard p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                  {renderHeaders(tab)}
                  <th className="text-start py-3 px-4">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr
                    key={it._id || it.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                  >
                    {renderCells(tab, it)}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditing(it);
                            setShowForm(true);
                          }}
                          className="p-2 rounded-lg border border-slate-200 hover:border-gold-400 hover:bg-gold-50 text-gold-600 transition"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => setConfirmDel(it)}
                          className="p-2 rounded-lg border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 transition"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <FormModal
          tab={tab}
          initial={editing}
          services={services}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {confirmDel && (
        <Modal onClose={() => setConfirmDel(null)} title="تأكيد الحذف">
          <p className="text-slate-600 text-sm mb-5">
            هل أنت متأكد من حذف هذا العنصر؟ هذا الإجراء لا يمكن التراجع عنه.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmDel(null)}
              className="btn-secondary"
            >
              إلغاء
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition"
            >
              حذف نهائي
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function renderHeaders(tab) {
  if (tab === "users") {
    return (
      <>
        <th className="text-start py-3 px-4">الاسم</th>
        <th className="text-start py-3 px-4 hidden md:table-cell">البريد</th>
        <th className="text-start py-3 px-4 hidden lg:table-cell">الرقم القومي</th>
        <th className="text-start py-3 px-4">الدور</th>
      </>
    );
  }
  if (tab === "services") {
    return (
      <>
        <th className="text-start py-3 px-4">الاسم</th>
        <th className="text-start py-3 px-4 hidden md:table-cell">الوصف</th>
        <th className="text-start py-3 px-4 hidden sm:table-cell">الأيقونة</th>
      </>
    );
  }
  if (tab === "branches") {
    return (
      <>
        <th className="text-start py-3 px-4">اسم الفرع</th>
        <th className="text-start py-3 px-4 hidden sm:table-cell">المدينة</th>
        <th className="text-start py-3 px-4 hidden md:table-cell">العنوان</th>
        <th className="text-start py-3 px-4 hidden lg:table-cell">الخدمة</th>
      </>
    );
  }
  if (tab === "roles") {
    return (
      <>
        <th className="text-start py-3 px-4">الاسم العربي</th>
        <th className="text-start py-3 px-4">الاسم البرمجي</th>
      </>
    );
  }
  return null;
}

function renderCells(tab, it) {
  if (tab === "users") {
    return (
      <>
        <td className="py-3 px-4 font-medium text-navy-600">
          {it.firstName} {it.lastName}
        </td>
        <td className="py-3 px-4 text-slate-600 hidden md:table-cell" dir="ltr">
          {it.email}
        </td>
        <td className="py-3 px-4 text-slate-600 hidden lg:table-cell" dir="ltr">
          {it.nationalId}
        </td>
        <td className="py-3 px-4">
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold border bg-gold-50 text-gold-700 border-gold-200">
            {roleLabel(it.role)}
          </span>
        </td>
      </>
    );
  }
  if (tab === "services") {
    return (
      <>
        <td className="py-3 px-4 font-medium text-navy-600">{it.name}</td>
        <td className="py-3 px-4 text-slate-600 hidden md:table-cell">
          {it.description || "—"}
        </td>
        <td className="py-3 px-4 text-slate-500 hidden sm:table-cell text-xs font-mono" dir="ltr">
          {it.icon || "—"}
        </td>
      </>
    );
  }
  if (tab === "branches") {
    return (
      <>
        <td className="py-3 px-4 font-medium text-navy-600">{it.name}</td>
        <td className="py-3 px-4 text-slate-600 hidden sm:table-cell">{it.city}</td>
        <td className="py-3 px-4 text-slate-600 hidden md:table-cell">{it.address}</td>
        <td className="py-3 px-4 text-slate-600 hidden lg:table-cell">
          {it.serviceId?.name || "—"}
        </td>
      </>
    );
  }
  if (tab === "roles") {
    return (
      <>
        <td className="py-3 px-4 font-medium text-navy-600">{it.label}</td>
        <td className="py-3 px-4 text-slate-500 text-xs font-mono" dir="ltr">
          {it.name}
        </td>
      </>
    );
  }
  return null;
}

function roleLabel(role) {
  return (
    { citizen: "مواطن", employee: "موظف", admin: "مسؤول" }[role] || role
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
      <div className="bg-white rounded-2xl shadow-gov-lg w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-bold text-navy-500">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormModal({ tab, initial, services, onClose, onSave }) {
  const [form, setForm] = useState(() => initialState(tab, initial));
  const isEdit = !!(initial && (initial._id || initial.id));
  const title = `${isEdit ? "تعديل" : "إضافة"} ${tabTitle(tab)}`;

  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    const cleaned = { ...form };
    if (tab === "users" && isEdit && !cleaned.password) delete cleaned.password;
    onSave(cleaned);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
      <div className="bg-white rounded-2xl shadow-gov-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-bold text-navy-500 text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {tab === "users" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="الاسم الأول">
                  <input
                    className="input-standard"
                    value={form.firstName}
                    onChange={(e) => change("firstName", e.target.value)}
                    required
                  />
                </Field>
                <Field label="الاسم الأخير">
                  <input
                    className="input-standard"
                    value={form.lastName}
                    onChange={(e) => change("lastName", e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="البريد الإلكتروني">
                <input
                  type="email"
                  className="input-standard"
                  value={form.email}
                  onChange={(e) => change("email", e.target.value)}
                  required
                  dir="ltr"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="الرقم القومي">
                  <input
                    className="input-standard"
                    value={form.nationalId}
                    onChange={(e) => change("nationalId", e.target.value)}
                    required
                    dir="ltr"
                    maxLength={14}
                  />
                </Field>
                <Field label="الدور">
                  <select
                    className="input-standard"
                    value={form.role}
                    onChange={(e) => change("role", e.target.value)}
                  >
                    <option value="citizen">مواطن</option>
                    <option value="employee">موظف</option>
                    <option value="admin">مسؤول</option>
                  </select>
                </Field>
              </div>
              <Field
                label={
                  isEdit
                    ? "كلمة المرور (اتركها فارغة للإبقاء على القديمة)"
                    : "كلمة المرور"
                }
              >
                <input
                  type="password"
                  className="input-standard"
                  value={form.password}
                  onChange={(e) => change("password", e.target.value)}
                  required={!isEdit}
                />
              </Field>
            </>
          )}

          {tab === "services" && (
            <>
              <Field label="اسم الخدمة">
                <input
                  className="input-standard"
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  required
                />
              </Field>
              <Field label="الوصف">
                <input
                  className="input-standard"
                  value={form.description}
                  onChange={(e) => change("description", e.target.value)}
                />
              </Field>
              <Field label="الأيقونة (passport, id-card, car, file-text, home, receipt)">
                <input
                  className="input-standard"
                  value={form.icon}
                  onChange={(e) => change("icon", e.target.value)}
                  dir="ltr"
                />
              </Field>
            </>
          )}

          {tab === "branches" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="اسم الفرع">
                  <input
                    className="input-standard"
                    value={form.name}
                    onChange={(e) => change("name", e.target.value)}
                    required
                  />
                </Field>
                <Field label="المدينة">
                  <input
                    className="input-standard"
                    value={form.city}
                    onChange={(e) => change("city", e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="العنوان">
                <input
                  className="input-standard"
                  value={form.address}
                  onChange={(e) => change("address", e.target.value)}
                  required
                />
              </Field>
              <Field label="الخدمة">
                <select
                  className="input-standard"
                  value={form.serviceId}
                  onChange={(e) => change("serviceId", e.target.value)}
                  required
                >
                  <option value="">— اختر الخدمة —</option>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {tab === "roles" && (
            <>
              <Field label="الاسم البرمجي">
                <input
                  className="input-standard"
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  required
                  dir="ltr"
                />
              </Field>
              <Field label="الاسم بالعربي">
                <input
                  className="input-standard"
                  value={form.label}
                  onChange={(e) => change("label", e.target.value)}
                  required
                />
              </Field>
            </>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              إلغاء
            </button>
            <button type="submit" className="btn-primary">
              {isEdit ? "حفظ التعديلات" : "إضافة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function tabTitle(tab) {
  return TABS.find((t) => t.key === tab)?.label || "عنصر";
}

function initialState(tab, initial) {
  if (tab === "users") {
    return {
      firstName: initial?.firstName || "",
      lastName: initial?.lastName || "",
      email: initial?.email || "",
      nationalId: initial?.nationalId || "",
      role: initial?.role || "citizen",
      password: "",
    };
  }
  if (tab === "services") {
    return {
      name: initial?.name || "",
      description: initial?.description || "",
      icon: initial?.icon || "clipboard-list",
    };
  }
  if (tab === "branches") {
    return {
      name: initial?.name || "",
      city: initial?.city || "",
      address: initial?.address || "",
      serviceId: initial?.serviceId?._id || initial?.serviceId || "",
    };
  }
  if (tab === "roles") {
    return { name: initial?.name || "", label: initial?.label || "" };
  }
  return {};
}
