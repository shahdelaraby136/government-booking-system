import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { loginRequest } from "../../lib/api.js";
import { saveCitizenSession, getCitizenSession } from "../../lib/citizenAuth.js";
import { saveEmployeeSession, getEmployeeSession } from "../../lib/employeeAuth.js";
import { saveAdminSession, getAdminSession } from "../../lib/adminAuth.js";

export default function Login() {
  const navigate = useNavigate();
  const [isEmailMode, setIsEmailMode] = useState(true);
  const [form, setForm] = useState({ email: "", password: "", nationalId: "" });

  useEffect(() => {
    if (getCitizenSession()?.nationalId) navigate("/citizen/dashboard", { replace: true });
    else if (getEmployeeSession()?._id) navigate("/employee/dashboard", { replace: true });
    else if (getAdminSession()?._id) navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin(e) {
    e.preventDefault();
    const loginChoise = isEmailMode
      ? { email: form.email, password: form.password }
      : { nationalId: form.nationalId, password: form.password };

    try {
      const user = await loginRequest(loginChoise);
      toast.success("تم تسجيل الدخول بنجاح");

      if (user.role === "admin") {
        saveAdminSession({
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          nationalId: user.nationalId,
          role: user.role,
        });
        navigate("/admin/dashboard", { replace: true });
      } else if (user.role === "employee" || user.role === "manager") {
        if (!user.branch) {
          toast.error("الموظف غير مسجل في النظام. تواصل مع الإدارة.");
          return;
        }
        saveEmployeeSession({
          _id: user.employeeId,
          employeeCode: user.employeeCode,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          branch: user.branch,
        });
        navigate("/employee/dashboard", { replace: true });
      } else {
        saveCitizenSession({
          nationalId: user.nationalId,
          citizenName: `${user.firstName} ${user.lastName}`,
          citizenEmail: user.email,
          citizenPhone: user.phone || "",
        });
        navigate("/citizen/dashboard", { replace: true });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "تعذر تسجيل الدخول";
      toast.error(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 rtl">
      <div className="bg-white p-10 rounded-3xl shadow-lg border w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-slate-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border">
            <img src="/logo.svg" alt="Logo" className="w-14" />
          </div>

          <h2 className="text-[#002B5B] font-extrabold text-2xl">مرحبا بك</h2>

          <p className="text-slate-500 text-sm mt-1">سجل دخولك للمتابعة</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Switch */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setIsEmailMode(true)}
              className={`flex-1 py-2 rounded-lg font-semibold transition
                ${isEmailMode ? "bg-white text-[#002B5B] shadow" : "text-slate-500"}`}
            >
              البريد الالكتروني
            </button>

            <button
              type="button"
              onClick={() => setIsEmailMode(false)}
              className={`flex-1 py-2 rounded-lg font-semibold transition
                ${!isEmailMode ? "bg-white text-[#002B5B] shadow" : "text-slate-500"}`}
            >
              رقم الهوية
            </button>
          </div>

          {/* Email / National ID */}
          {isEmailMode ? (
            <div className="text-right">
              <label className="block text-[#002B5B] font-bold text-sm mb-1">
                البريد الالكتروني
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                placeholder="example@email.com"
                className="w-full p-3 rounded-xl border bg-slate-50 outline-none"
                required
              />
            </div>
          ) : (
            <div className="text-right">
              <label className="block text-[#002B5B] font-bold text-sm mb-1">
                الرقم القومي / رقم الهوية
              </label>
              <input
                name="nationalId"
                value={form.nationalId}
                onChange={handleChange}
                type="number"
                placeholder="ادخل الرقم القومي"
                className="w-full p-3 rounded-xl border bg-slate-50 outline-none"
                required
              />
            </div>
          )}

          {/* Password */}
          <div className="text-right">
            <label className="block text-[#002B5B] font-bold text-sm mb-1">
              كلمة المرور
            </label>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type="password"
              placeholder="********"
              className="w-full p-3 rounded-xl border bg-slate-50 outline-none"
              required
            />
          </div>

          {/* Forget Password */}
          <div className="text-left">
            <Link
              to="/auth/forget-password"
              className="text-[#C5A059] text-sm font-semibold"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full py-3 bg-[#002B5B] text-white rounded-xl font-bold text-lg shadow-md hover:opacity-90 transition"
          >
            تسجيل الدخول
          </button>

          {/* Register */}
          <div className="text-center text-sm text-slate-500">
            ليس لديك حساب؟
            <Link to="/auth/register" className="text-[#002B5B] font-bold mr-1">
              إنشاء حساب جديد
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
