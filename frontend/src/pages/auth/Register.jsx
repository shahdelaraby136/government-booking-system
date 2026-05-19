import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { registerRequest } from "../../lib/api.js";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    nationalId: "",
    role: "citizen",
  });

  const ROLES = [
    { key: "citizen", label: "مواطن" },
    { key: "employee", label: "موظف" },
    { key: "admin", label: "مسؤول" },
  ];

  async function register(e) {
    e.preventDefault();
    try {
      await registerRequest(form);
      toast.success("تم إنشاء الحساب بنجاح");
      setTimeout(() => navigate("/auth/login", { replace: true }), 800);
    } catch (err) {
      const msg = err?.response?.data?.message || "تعذر إنشاء الحساب";
      toast.error(msg);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-5 rtl">
      <div className="bg-white p-10 rounded-3xl shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-slate-100 w-[70px] h-[70px] rounded-xl flex items-center justify-center mx-auto mb-4">
            <img src="/logo.svg" alt="Logo" className="w-11" />
          </div>

          <h2 className="text-[#002B5B] font-extrabold text-2xl">مرحبا بك</h2>
          <p className="text-slate-500 text-sm mt-1">سجل دخولك للمتابعة</p>
        </div>

        <form onSubmit={register} className="flex flex-col gap-4">
          {/* Role Switch */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setForm({ ...form, role: r.key })}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  form.role === r.key ? "bg-white text-[#002B5B] shadow" : "text-slate-500"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-right">
              <label className="block text-[#002B5B] font-bold text-sm mb-1">
                الاسم الأول
              </label>
              <input
                title="firstName"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border bg-slate-50 outline-none"
                required
              />
            </div>

            <div className="text-right">
              <label className="block text-[#002B5B] font-bold text-sm mb-1">
                الاسم الأخير
              </label>
              <input
                title="lastName"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border bg-slate-50 outline-none"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="text-right">
            <label className="block text-[#002B5B] font-bold text-sm mb-1">
              البريد الالكتروني
            </label>
            <input
              title="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              className="w-full p-3 rounded-xl border bg-slate-50 outline-none"
              required
            />
          </div>

          {/* National ID */}
          <div className="text-right">
            <label className="block text-[#002B5B] font-bold text-sm mb-1">
              الرقم القومي
            </label>
            <input
              title="nationalId"
              name="nationalId"
              value={form.nationalId}
              onChange={handleChange}
              type="number"
              className="w-full p-3 rounded-xl border bg-slate-50 outline-none"
              required
            />
          </div>

          {/* Password */}
          <div className="text-right">
            <label className="block text-[#002B5B] font-bold text-sm mb-1">
              كلمة المرور
            </label>
            <input
              title="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              type="password"
              className="w-full p-3 rounded-xl border bg-slate-50 outline-none"
              required
            />
          </div>

          {/* Button */}
          <button className="w-full py-3 bg-[#002B5B] text-white rounded-xl font-bold text-lg shadow-md hover:opacity-90 transition">
            إنشاء حساب
          </button>

          {/* Login Link */}
          <div className="text-center text-sm text-slate-500">
            لديك حساب بالفعل؟
            <Link to="/auth/login" className="text-[#C5A059] font-bold mr-1">
              تسجيل الدخول
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
