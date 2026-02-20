import React, { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "../../components/common/Animations";
import {
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Search,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Printer,
  Calendar,
  User,
  MapPin,
  Download,
  AlertTriangle,
  Clock
} from "lucide-react";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCount: 0, totalRev: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL.replace("/api", "");

  useEffect(() => {
    fetchPayments(currentPage);
  }, [currentPage]);

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      // Fetch only "Paid" orders with pagination
      const { data } = await api.get(`/admin/orders?paymentStatus=Paid&page=${page}&limit=10`);
      
      setPayments(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
      
      const pageRev = (data.orders || []).reduce((acc, curr) => acc + curr.totalAmount, 0);
      setStats({ totalCount: data.totalOrders, totalRev: pageRev }); // This is page revenue, might be misleading but better than 0.

    } catch (e) {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };
  
   const handleZipDownload = async (orderId) => {
    try {
      const response = await api.get(`/admin/download-zip/${orderId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Order_${orderId.slice(-6).toUpperCase()}.zip`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("ZIP Generation Failed");
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="space-y-6 font-sans pb-20"
    >
      {/* 1. HEADER & STATS CARDS */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
             Financial Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
             Track revenue and payment status.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full lg:w-auto flex-1 max-w-3xl">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Transactions
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{stats.totalCount}</h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Page Revenue
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">₹{stats.totalRev}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <IndianRupee size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. PAYMENTS TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center gap-2">
            <CheckCircle2 className="text-slate-500" size={18} />
            <h3 className="font-bold text-slate-800">Successful Transactions</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3 text-center">Amount</th>
                <th className="px-6 py-3">Payment Method</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-center">Date</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20}/>
                    Loading transactions...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-500">
                        No transactions found.
                    </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs font-medium text-blue-600">
                      #{p._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {p.user?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.user?.email || "No Email"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900">
                      ₹{p.totalAmount}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {p.paymentMethod || "Online"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedOrder(p)}
                        className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
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

       {/* ORDER DETAILS MODAL */}
       <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Transaction Details
                  </h3>
                   <span className="text-xs font-mono text-slate-500">
                      Order #{selectedOrder._id}
                    </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* STATUS BAR */}
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-emerald-800">Payment Successful</p>
                            <p className="text-xs text-emerald-600">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-700">₹{selectedOrder.totalAmount}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Customer Details</h4>
                         <div className="flex items-start gap-3">
                            <User className="text-slate-400 mt-0.5" size={16} />
                            <div>
                                <p className="text-sm font-medium text-slate-900">{selectedOrder.user?.name}</p>
                                <p className="text-xs text-slate-500">{selectedOrder.user?.email}</p>
                                <p className="text-xs text-slate-500">{selectedOrder.user?.phone}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                         <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Payment Info</h4>
                         <div className="flex items-start gap-3">
                            <CreditCard className="text-slate-400 mt-0.5" size={16} />
                            <div>
                                <p className="text-sm font-medium text-slate-900">{selectedOrder.paymentMethod}</p>
                                <p className="text-xs text-slate-500 font-mono">Ref: {selectedOrder.paymentId || "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PRODUCT DETAILS COMPACT */}
                 <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Order Items</h4>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-2">
                                <FileText size={16} className="text-slate-500" />
                                <span className="text-sm font-medium text-slate-900">{selectedOrder.serviceType}</span>
                             </div>
                             <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-slate-600">
                                {selectedOrder.details?.copies} Copies
                             </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            {selectedOrder.details?.printType} • {selectedOrder.details?.size} • {selectedOrder.details?.pages} Pages
                        </p>
                    </div>
                 </div>
                 
                 {/* DOWNLOAD BUTTONS IF NEEDED */}
                 {!selectedOrder.filesDeleted && (
                    <div className="flex justify-end">
                       <button
                          onClick={() => handleZipDownload(selectedOrder._id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                          <Download size={14} /> Download Files
                        </button>
                    </div>
                 )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
