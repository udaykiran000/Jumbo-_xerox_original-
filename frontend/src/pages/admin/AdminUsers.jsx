import React, { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer, slideInUp, scaleIn } from "../../components/common/Animations";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    isActive: true,
  });

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const fetchUsers = async (page) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/users?page=${page}&limit=10`);
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (e) {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/admin/users", newUser);
      toast.success("Account Created!");
      setNewUser({ name: "", email: "", password: "", isActive: true });
      fetchUsers(1);
    } catch (e) {
      toast.error(e.response?.data?.message || "Add failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const { data } = await api.patch(`/admin/user/toggle/${id}`);
      setUsers(
        users.map((u) => (u._id === id ? { ...u, isActive: data.isActive } : u))
      );
      toast.success(`User updated!`);
    } catch (e) {
      toast.error("Update failed");
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="space-y-6 font-sans"
    >
      {/* RESPONSIVE HEADER & FORM */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
             Customer Directory
           </h1>
           <p className="text-sm text-slate-500 mt-1">
             Manage customer accounts and access levels.
           </p>
        </div>

        {/* ADD USER CARD */}
        <motion.div 
          variants={scaleIn}
          className="w-full lg:w-auto bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 max-w-3xl"
        >
          <h3 className="text-sm font-semibold text-slate-800 mb-3 block lg:hidden">Add New Customer</h3>
          <form
            onSubmit={handleAddUser}
            className="grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            <input
              required
              type="text"
              placeholder="Full Name"
              className="bg-white border border-gray-300 rounded-lg p-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
            <input
              required
              type="email"
              placeholder="Email Address"
              className="bg-white border border-gray-300 rounded-lg p-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
            />
            <input
              required
              type="password"
              placeholder="Password"
              className="bg-white border border-gray-300 rounded-lg p-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
            />
            <button
              disabled={isSubmitting}
              type="submit"
              className="bg-blue-600 text-white rounded-lg text-sm font-semibold py-2.5 px-4 flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm transition-all"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </motion.div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative w-full max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search customers..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* SCROLLABLE USER TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">User Info</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan="3"
                    className="p-12 text-center text-slate-500"
                  >
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600"/>
                    Loading directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-12 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                            {u.name.charAt(0)}
                         </div>
                         <div>
                            <p className="font-semibold text-slate-900">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}
                      >
                        {u.isActive ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}{" "}
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(u._id)}
                          className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-md text-xs font-medium text-slate-600 transition-colors"
                        >
                          {u.isActive ? "Disable" : "Enable"}
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
          <p className="text-xs text-slate-500 font-medium">
            Page <span className="font-bold text-slate-900">{currentPage}</span> of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1.5 bg-white border border-gray-300 rounded-md text-slate-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1.5 bg-white border border-gray-300 rounded-md text-slate-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
