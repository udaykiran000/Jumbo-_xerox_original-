import React, { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
// import { AuthContext } from "../../context/AuthContext"; // Removed
import {
  ShieldCheck,
  Key,
  Lock,
  CheckCircle2,
  User,
  Mail,
  Save,
  Loader2,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, slideInLeft, slideInRight } from "../../components/common/Animations";

import { useSelector } from "react-redux";
import { selectUser } from "../../redux/slices/authSlice";

export default function AdminSettings() {
  const user = useSelector(selectUser);

  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  // Password State
  const [passData, setPassData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);

  // --- 1. ACTION: UPDATE ADMIN PROFILE ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    setLoadingProfile(true);
    try {
      await api.put("/admin/profile/update", profileData);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("[DEBUG-UI-ERR] Profile update failed:", err);
      toast.error(err.response?.data?.message || "Profile update failed");
    } finally {
      setLoadingProfile(false);
    }
  };

  // --- 2. ACTION: UPDATE ADMIN PASSWORD ---
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      return toast.error("New passwords do not match!");
    }


    setLoadingPass(true);
    try {
      await api.post("/admin/settings/change-password", passData);
      toast.success("Password changed successfully!");
      setPassData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Current password verification failed",
      );
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="max-w-6xl mx-auto space-y-6 font-sans pb-20 text-slate-800"
    >
      {/* HEADER SECTION */}
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
          <Settings size={28} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-0.5">
            System Settings
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Account Security
          </h1>
        </div>
      </div>

      {/* 1. PROFILE SECTION */}
      <motion.div 
        variants={slideInLeft}
        className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <User size={18} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Admin Profile</h3>
            <p className="text-sm font-medium text-slate-500">
              Update your basic account information and email address
            </p>
          </div>
        </div>

        <form
          onSubmit={handleUpdateProfile}
          className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end"
        >
          <div className="md:col-span-4 space-y-2 text-left">
            <label className="text-xs font-bold text-slate-600 ml-1">
              Full Name
            </label>
            <input
              required
              type="text"
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
              value={profileData.name}
              onChange={(e) =>
                setProfileData({ ...profileData, name: e.target.value })
              }
              placeholder="Enter full name"
            />
          </div>
          <div className="md:col-span-5 space-y-2 text-left">
            <label className="text-xs font-bold text-slate-600 ml-1">
              Email Address
            </label>
            <input
              required
              type="email"
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
              value={profileData.email}
              onChange={(e) =>
                setProfileData({ ...profileData, email: e.target.value })
              }
              placeholder="admin@jumboxerox.com"
            />
          </div>
          <div className="md:col-span-3">
            <button
              disabled={loadingProfile}
              type="submit"
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
            >
              {loadingProfile ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 2. PASSWORD UPDATE FORM */}
        <motion.div 
          variants={slideInLeft}
          className="lg:col-span-8 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Key size={20} />
            </div>
            <h3 className="font-bold text-lg text-slate-900 leading-none">
              Change Password
            </h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-600 ml-1">
                Current Password
              </label>
              <input
                required
                type="password"
                placeholder="Enter current password to verify"
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                value={passData.currentPassword}
                onChange={(e) =>
                  setPassData({ ...passData, currentPassword: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-600 ml-1">
                  New Password
                </label>
                <input
                  required
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                  value={passData.newPassword}
                  onChange={(e) =>
                    setPassData({ ...passData, newPassword: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-600 ml-1">
                  Confirm New Password
                </label>
                <input
                  required
                  type="password"
                  placeholder="Re-type new password"
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                  value={passData.confirmPassword}
                  onChange={(e) =>
                    setPassData({
                      ...passData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <button
              disabled={loadingPass}
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              {loadingPass ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
              Update Password
            </button>
          </form>
        </motion.div>

        {/* 3. SECURITY TIPS SECTION */}
        <motion.div 
          variants={slideInRight}
          className="lg:col-span-4 bg-slate-900 p-8 rounded-xl text-white space-y-8 relative overflow-hidden h-fit shadow-md"
        >
          <div className="relative z-10 text-left">
            <div className="bg-blue-500/20 text-blue-400 w-fit p-3 rounded-lg mb-6 border border-blue-500/20">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold mb-3 tracking-tight">
              Security Guidelines
            </h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-8">
              Protect your admin account to ensure store data and customer
              payment information remain secure.
            </p>

            <ul className="space-y-6">
              {[
                {
                  t: "Password Strength",
                  d: "Use a mix of letters, numbers and symbols for better security.",
                },
                {
                  t: "Confidentiality",
                  d: "Never share your admin credentials with anyone via chat or email.",
                },
                {
                  t: "Regular Updates",
                  d: "We recommend changing your password every 60-90 days.",
                },
                {
                  t: "Safe Sign-out",
                  d: "Always log out after finishing work, especially on shared computers.",
                },
              ].map((item, i) => (
                <li key={i} className="flex gap-3 items-start group">
                  <CheckCircle2
                    size={16}
                    className="text-emerald-500 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-100">{item.t}</p>
                    <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                      {item.d}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 pt-6 border-t border-white/5 flex items-center gap-2 opacity-50">
              <ShieldAlert size={14} />
              <p className="text-[10px] font-bold uppercase tracking-wider">
                Account Protection Active
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
