import React, { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "../../components/common/Animations";
import {
  Trash2,
  AlertTriangle,
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Search,
  Clock,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminDeleteFiles() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);

  // --- 1. CORE LOGIC: MULTI-TIMER ARCHITECTURE ---
  // timers: { [orderId]: secondsRemaining } for Visuals
  const [timers, setTimers] = useState({});
  // timeouts: { [orderId]: timeoutID } for Logic execution
  const timeouts = useRef({});

  useEffect(() => {
    fetchOrders(currentPage);
    // Cleanup on unmount: clear all pending timeouts
    return () => {
      Object.values(timeouts.current).forEach((id) => clearTimeout(id));
    };
  }, [currentPage]);

  // Debounce Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders(1);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Global Visual Ticker: Decrements all active visual timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        const hasChanges = Object.keys(next).some((id) => next[id] > 0);
        
        if (!hasChanges) return prev;

        Object.keys(next).forEach((id) => {
          if (next[id] > 0) {
            next[id] -= 1;
          }
        });
        return { ...next };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/orders-for-deletion?page=${page}&limit=10&search=${searchTerm}`);
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
      setTotalFiles(data.totalOrders || 0);
    } catch (e) {
      toast.error("Failed to load storage data");
    } finally {
      setLoading(false);
    }
  };

  const triggerDeletion = (id) => {
    // 1. Set Visual Timer
    setTimers((prev) => ({ ...prev, [id]: 7 }));
    toast("Deletion scheduled in 7s...", { icon: "⏳" });

    // 2. Schedule Execution (Independent of Render Cycle)
    if (timeouts.current[id]) clearTimeout(timeouts.current[id]);
    
    timeouts.current[id] = setTimeout(() => {
      commitDeletion(id);
    }, 7000);
  };

  const cancelDeletion = (id) => {
    // 1. Clear Execution
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
    // 2. Clear Visual
    setTimers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    toast.success("Deletion Cancelled", { icon: "🔄" });
  };

  const commitDeletion = async (id) => {
    try {
      // Clear local state first to update UI immediately
      setTimers((prev) => {
         const next = { ...prev };
         delete next[id];
         return next;
      });
      delete timeouts.current[id];

      await api.delete(`/admin/order/files/${id}`);
      toast.success("Files deleted successfully!");
      fetchOrders(currentPage);
    } catch (e) {
      toast.error(e.response?.data?.message || "Deletion failed");
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="space-y-6 pb-20 font-sans"
    >
      {/* HEADER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
             File Storage
           </h1>
           <p className="text-sm text-slate-500 mt-1">
             Manage temporary files and disk usage.
           </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by ID or Name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* STORAGE TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="text-white" size={18} />
            <h3 className="text-white font-bold text-base">
              Cleanup List
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-300 bg-white/10 px-3 py-1 rounded-full">
            Total: {totalFiles}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
             <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-slate-500 tracking-wide">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer / Payment</th>
                <th className="px-6 py-4 text-center">Age</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                   <td colSpan="5" className="p-12 text-center text-slate-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20}/>
                    Loading data...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500">
                        No orders found.
                    </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const daysOld = Math.floor(
                    (new Date() - new Date(o.createdAt)) /
                      (1000 * 60 * 60 * 24),
                  );
                  const isStale = daysOld >= 2; // Flag for older orders
                  const isCounting = timers[o._id] !== undefined;

                  return (
                    <tr
                      key={o._id}
                      className={`transition-colors ${o.filesDeleted ? "bg-gray-50/60 opacity-60" : "hover:bg-red-50/10"}`}
                    >
                      <td className="px-6 py-4 text-blue-600 font-mono text-xs font-medium">
                        #{o._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 text-sm">
                          {o.user?.name || "N/A"}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border inline-block mt-1 ${
                            o.paymentStatus === "Paid"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div
                          className={`flex flex-col items-center ${isStale ? "text-red-500" : "text-slate-400"}`}
                        >
                          <Calendar size={14} />
                          <span className="text-[10px] font-bold mt-1 uppercase">
                            {daysOld} Days
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 py-1.5 px-3 rounded-lg border border-slate-200 w-fit mx-auto">
                          <FileText size={12} />
                          <span className="text-[11px] font-medium">
                            {o.files?.length || 0} Files
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center">
                          {o.filesDeleted ? (
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                              <CheckCircle2 size={14} /> Deleted
                            </span>
                          ) : isCounting ? (
                            <button
                              onClick={() => cancelDeletion(o._id)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm animate-pulse"
                            >
                              <RotateCcw size={14} /> STOP ({timers[o._id]}s)
                            </button>
                          ) : (
                            <button
                              onClick={() => triggerDeletion(o._id)}
                              className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-white border border-gray-300 rounded-md text-slate-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white border border-gray-300 rounded-md text-slate-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* SYSTEM SECURITY NOTICE */}
      <div className="bg-orange-50 border border-orange-200 p-6 rounded-xl flex items-start gap-4 shadow-sm">
        <AlertCircle className="text-orange-600 shrink-0 mt-0.5" size={24} />
        <div className="space-y-1">
          <p className="text-sm font-bold text-orange-800">
            Data Retention Policy
          </p>
          <p className="text-xs text-orange-700 leading-relaxed">
            Manual deletion permanently removes file assets from the server. 
            Order details and transaction logs are preserved for audit purposes.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
