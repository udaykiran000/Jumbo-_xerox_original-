import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  Clock,
  Search,
  X,
  RotateCcw,
  Eye,
  Lock,
  AlertTriangle,
  Truck,
  User,
  MapPin,
  CreditCard,
  Hash,
  ChevronDown,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { fetchDashboardStats } from "../../redux/slices/dashboardSlice";
import { fadeInUp, staggerContainer, slideInUp, scaleIn } from "../../components/common/Animations";

const AdminOrders = () => {
  const { state } = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [fileStatus, setFileStatus] = useState(null);

  const [timers, setTimers] = useState({});
  const [pendingStatuses, setPendingStatuses] = useState({});
  const timeouts = useRef({});

  const dispatch = useDispatch();

  const rawUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  // Fix for double slash issue if env var ends with /
  const API_BASE_URL = rawUrl.endsWith("/api") ? rawUrl.replace("/api", "") : rawUrl;

  useEffect(() => {
    fetchOrders(currentPage);
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

  useEffect(() => {
    if (orders.length > 0 && state?.openOrderId) {
      const target = orders.find((o) => o._id === state.openOrderId);
      if (target) setSelectedOrder(target);
    }
  }, [orders, state]);

  useEffect(() => {
    if (selectedOrder && !selectedOrder.filesDeleted) {
      const checkFiles = async () => {
        try {
          const { data } = await api.get(`/upload/check-files/${selectedOrder._id}`);
          setFileStatus(data);
        } catch (e) {
          console.error("File check failed", e);
          setFileStatus(null);
        }
      };
      checkFiles();
    } else {
      setFileStatus(null);
    }
  }, [selectedOrder]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let hasChanges = false;
        Object.keys(next).forEach((id) => {
          if (next[id] > 0) {
            next[id] -= 1;
            hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/orders?page=${page}&limit=10&search=${searchTerm}`);
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
    } catch (e) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id, status) => {
    const order = orders.find((o) => o._id === id);
    if (!order || order.status === status) return;

    if (status === "Completed" || status === "Cancelled") {
      setTimers((prev) => ({ ...prev, [id]: 7 }));
      setPendingStatuses((prev) => ({ ...prev, [id]: status }));
      toast(`Status updating in 7s...`, { icon: "⏳" });

      if (timeouts.current[id]) clearTimeout(timeouts.current[id]);

      timeouts.current[id] = setTimeout(() => {
        commitStatus(id, status);
      }, 7000);
    } else {
      commitStatus(id, status);
    }
  };

  const cancelTimer = (id) => {
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
    setTimers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPendingStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    toast.success("Update Cancelled");
  };

  const commitStatus = async (id, status) => {
    try {
      setTimers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete timeouts.current[id];

      await api.put(`/admin/order/${id}`, { status });
      toast.success(`Order status updated to ${status}`);
      fetchOrders(currentPage);
      dispatch(fetchDashboardStats());
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed");
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

  const getStatusBadge = (status) => {
    const styles = {
      Pending: "bg-blue-50 text-blue-700 border-blue-100",
      Processing: "bg-amber-50 text-amber-700 border-amber-100",
      Completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
      Cancelled: "bg-red-50 text-red-700 border-red-100",
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          styles[status] || "bg-gray-50 text-slate-500 border-gray-200"
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="space-y-6 font-sans pb-20"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Order Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage and track all customer orders.
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by ID, Name, Phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                     Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                    No orders found matching your search.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isLocked =
                    o.status === "Completed" ||
                    o.status === "Cancelled" ||
                    o.filesDeleted;
                  const canShip =
                    o.paymentStatus === "Paid" &&
                    o.status === "Completed" &&
                    o.deliveryMode === "Delivery";

                  return (
                    <tr
                      key={o._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          #{o._id.slice(-6).toUpperCase()}
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">
                          {o.user?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {o.user?.phone || "No Phone"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">
                          ₹{o.totalAmount}
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {o.paymentMethod}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(o.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {timers[o._id] !== undefined ? (
                            <button
                              onClick={() => cancelTimer(o._id)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-medium flex items-center gap-1.5 animate-pulse border border-red-100"
                            >
                              <RotateCcw size={14} /> Undo ({timers[o._id]}s)
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {!isLocked ? (
                                <div className="relative">
                                  <select
                                    value={o.status}
                                    onChange={(e) =>
                                      handleStatusChange(o._id, e.target.value)
                                    }
                                    className="appearance-none bg-white border border-gray-300 text-slate-700 text-xs rounded-lg pl-3 pr-8 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer font-medium hover:bg-gray-50 transition-colors"
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                  <ChevronDown
                                    size={14}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                                  />
                                </div>
                              ) : (
                                <div className="px-3 py-2 bg-gray-100 text-slate-500 rounded-lg text-xs font-medium border border-gray-200 flex items-center gap-1.5">
                                  <Lock size={12} /> Locked
                                </div>
                              )}
                              
                              <button
                                onClick={() => setSelectedOrder(o)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                title="View Details"
                              >
                                <Eye size={18} />
                              </button>
                              
                              {canShip && (
                                <button
                                  onClick={() => toast.success("Opening Shipment Assignment...")}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                                  title="Ship Order"
                                >
                                  <Truck size={18} />
                                </button>
                              )}
                            </div>
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

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Order Details
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-slate-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                      #{selectedOrder._id}
                    </span>
                    <span className="text-xs text-slate-500">
                      • {new Date(selectedOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-5 rounded-lg border border-gray-200 bg-gray-50">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                       Customer
                    </h4>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">
                        {selectedOrder.user?.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {selectedOrder.user?.phone}
                      </p>
                      <p className="text-sm text-slate-600">
                        {selectedOrder.user?.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-5 rounded-lg border border-gray-200 bg-gray-50">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                       Delivery
                    </h4>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded mb-2 ${
                        selectedOrder.deliveryMode === "Delivery" 
                        ? "bg-purple-50 text-purple-700 border border-purple-100" 
                        : "bg-orange-50 text-orange-700 border border-orange-100"
                    }`}>
                        {selectedOrder.deliveryMode}
                    </span>
                    {selectedOrder.deliveryMode === "Delivery" ? (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {selectedOrder.shippingAddress?.street}<br/>
                        {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.pincode}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-600">
                        Store Pickup: <span className="font-medium text-slate-900">{selectedOrder.pickupDetails?.name || "Main Branch"}</span>
                      </p>
                    )}
                  </div>

                  <div className="p-5 rounded-lg border border-gray-200 bg-gray-50">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                       Payment
                    </h4>
                    <p className="text-2xl font-bold text-slate-900 mb-1">
                      ₹{selectedOrder.totalAmount}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded border ${
                            selectedOrder.paymentStatus === "Paid" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-red-50 text-red-700 border-red-100"
                        }`}>
                            {selectedOrder.paymentStatus}
                        </span>
                        <span className="text-xs text-slate-500 border border-gray-200 px-2 py-0.5 rounded bg-white">
                            {selectedOrder.paymentMethod}
                        </span>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileText size={16} /> Job Specifications
                    </h4>
                  </div>
                  <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Service Type</p>
                      <p className="text-sm font-medium text-slate-900">{selectedOrder.serviceType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Details</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedOrder.details?.printType} • {selectedOrder.details?.size}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Finishing</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedOrder.details?.binding || "None"} / {selectedOrder.details?.lamination || "None"}
                      </p>
                    </div>
                     <div>
                      <p className="text-xs text-slate-500 mb-1">Quantity</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedOrder.details?.copies || 1} Copies • {selectedOrder.details?.pages || "?"} Pages
                      </p>
                    </div>
                    <div className="col-span-full">
                      <p className="text-xs text-slate-500 mb-1">Special Instructions</p>
                      <p className="text-sm text-slate-600 bg-gray-50 p-3 rounded border border-gray-200">
                        {selectedOrder.details?.instructions || "No special instructions provided."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                       Files & Assets
                    </h4>
                    {!selectedOrder.filesDeleted && fileStatus?.available && (
                        <button
                          onClick={() => handleZipDownload(selectedOrder._id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                          <Download size={14} /> Download All (ZIP)
                        </button>
                    )}
                  </div>

                  <div className="grid gap-3">
                    {selectedOrder.filesDeleted ? (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600">
                        <AlertTriangle size={18} />
                        <p className="text-sm font-medium">
                          Files have been automatically purged in accordance with data retention policy.
                        </p>
                      </div>
                    ) : (
                      (selectedOrder.files || []).map((f, i) => {
                        const fileMeta = fileStatus?.files?.find(fs => fs.name === f.name);
                        const isMissing = fileMeta && !fileMeta.exists;
                        
                        return (
                          <div
                            key={i}
                            className={`flex justify-between items-center p-4 rounded-lg border ${
                                isMissing ? 'bg-red-50 border-red-100' : 'bg-white border-gray-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`p-2 rounded ${isMissing ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <FileText size={18} />
                                </div>
                                <span className={`text-sm font-medium truncate ${isMissing ? 'text-red-500 line-through' : 'text-slate-700'}`}>
                                    {f.name}
                                </span>
                            </div>

                            {!fileStatus ? (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock size={12} /> Checking...
                                </span>
                            ) : !isMissing ? (
                                <a
                                  href={`${API_BASE_URL}${f.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Download File"
                                >
                                  <Download size={18} />
                                </a>
                            ) : (
                                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                                    Lost
                                </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminOrders;
