import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  RotateCcw,
  Moon,
  Sun,
  ExternalLink,
  Loader2,
  Package,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Download,
  Info,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { FiMapPin, FiPhone, FiMail, FiZap } from "react-icons/fi";
import api from "../../services/api";
import toast from "react-hot-toast";
// import { AuthContext } from "../../context/AuthContext"; // Removed
import { displayRazorpay } from "../../services/paymentService";

// --- Service Cards Images ---
import a4Img from "../../assets/a4.jpg";
import planImg from "../../assets/Plan-Printing.jpg";
import bcardImg from "../../assets/bcard.jpg";

import { useSelector } from "react-redux";
import { selectUser } from "../../redux/slices/authSlice";
import { selectConfig } from "../../redux/slices/configSlice";
import { Store, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, staggerContainer, scaleIn, slideInUp, pageTransition } from "../../components/common/Animations";

export default function UserDashboard() {
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  // States
  const [userData, setUserData] = useState({ name: "User", email: "" });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");
  const [isResuming, setIsResuming] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("ui-theme") || "light";
    setTheme(savedTheme);

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const profileRes = await api.get("/users/profile");
        setUserData(profileRes.data);

        // Synced with updated backend route
        const ordersRes = await api.get("/orders/my-orders");
        setOrders(ordersRes.data || []);
      } catch (err) {
        console.error("Dashboard Load Error:", err);
        toast.error("Failed to sync dashboard");
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  // --- LOGICAL CONNECTIVITY: RESUME PAYMENT ---
  // --- LOGICAL CONNECTIVITY: RESUME PAYMENT ---
  // Mock Payment States
  const [showMockPayment, setShowMockPayment] = useState(false);
  const [mockOrderData, setMockOrderData] = useState(null);
  const config = useSelector(selectConfig);

  const handlePayNow = async (orderId) => {
    setIsResuming(true);
    try {
      // Calls backend to generate fresh Razorpay Order ID
      const { data } = await api.post(`/orders/resume-payment/${orderId}`);
      
      // Check for Test Mode
      if (config.paymentTestMode) {
        setMockOrderData(data); // data contains { order, razorpayOrder }
        setShowMockPayment(true);
      } else {
        // Triggers Razorpay SDK
        await displayRazorpay(data, user, navigate);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Payment initialization failed";
      toast.error(msg);
    } finally {
      setIsResuming(false);
    }
  };

  const handleMockPaymentAction = async (success) => {
    setShowMockPayment(false);
    if (!mockOrderData) return;

    if (success) {
      try {
        const loadingToast = toast.loading("Verifying Payment...");
        await api.post("/payments/verify", {
          razorpay_order_id: mockOrderData.razorpayOrder.id,
          razorpay_payment_id: "mock_payment_id_" + Date.now(),
          razorpay_signature: "mock_payment_signature",
          dbOrderId: mockOrderData.order._id,
        });
        toast.dismiss(loadingToast);
        toast.success("Payment Successful!");
        
        // Refresh orders to show updated status
        const ordersRes = await api.get("/orders/my-orders");
        setOrders(ordersRes.data || []);
      } catch (e) {
        toast.error("Mock Verification Failed");
      }
    } else {
      toast.error("Payment Cancelled");
    }
  };

  // Pagination Logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.paymentStatus === "Pending").length,
    completed: orders.filter((o) => o.status === "Completed").length,
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("ui-theme", next);
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const themeClasses =
    theme === "dark"
      ? "bg-slate-950 text-slate-100"
      : "bg-slate-50 text-slate-900";

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageTransition}
      className={`${themeClasses} min-h-screen transition-colors duration-500 font-sans pb-32`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 space-y-16">
        {/* 1. HEADER */}
        <motion.header
          variants={fadeInUp}
          className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-slate-200"} backdrop-blur-xl p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center border shadow-xl gap-6`}
        >
          <div className="flex items-center gap-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg"
            >
              {userData.name?.charAt(0)}
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 group-dark:text-white">
                Hello, {userData.name}!
              </h1>
              <p className="text-slate-500 text-sm font-medium">{userData.email}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-slate-200/50"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </motion.button>
        </motion.header>

        {/* 2. STATS GRID */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <StatCard
            label="Total Requests"
            value={stats.total}
            icon={<Package />}
            color="text-blue-600"
            theme={theme}
          />
          <StatCard
            label="Unpaid Orders"
            value={stats.pending}
            icon={<RotateCcw />}
            color="text-amber-600"
            theme={theme}
          />
          <StatCard
            label="Finalized"
            value={stats.completed}
            icon={<CheckCircle2 />}
            color="text-emerald-600"
            theme={theme}
          />
        </motion.div>

        {/* 3. RECENT ORDERS TABLE */}
        <motion.div
          variants={slideInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-slate-200"} p-8 rounded-3xl border shadow-xl`}
        >
          <h2 className="text-xl font-bold mb-8 px-4 border-l-4 border-blue-600 uppercase tracking-tight">
            Order Printing History
          </h2>

          {loading ? (
            <div className="py-24 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Syncing Dashboard...
              </p>
            </div>
          ) : orders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-24 text-center text-slate-400 font-bold italic border-2 border-dashed border-slate-200 rounded-[2rem]"
            >
              No orders found. Start your first project!
            </motion.div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] font-bold tracking-widest px-4 border-b border-slate-100">
                      <th className="pb-4 px-6">Order ID</th>
                      <th className="pb-4 px-6">Service Type</th>
                      <th className="pb-4 px-6">Amount / Status</th>
                      <th className="pb-4 px-6">Order Status</th>
                      <th className="pb-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {currentOrders.map((order, index) => (
                        <motion.tr
                          key={order._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-slate-50 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-all"
                        >
                          <td className="py-5 px-6 font-mono text-xs font-bold text-blue-600">
                            #{order._id.slice(-6).toUpperCase()}
                          </td>
                          <td className="py-5 px-6 font-bold text-sm text-slate-700">
                            {order.serviceType}
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-slate-900">
                                ₹{order.totalAmount}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider ${order.paymentStatus === "Paid" ? "text-emerald-600" : "text-amber-600"}`}
                              >
                                {order.paymentStatus}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase">
                              {order.status}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {/* LOGICAL CONNECTIVITY: PAY NOW BUTTON */}
                              {order.paymentStatus === "Pending" &&
                                !order.filesDeleted && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handlePayNow(order._id)}
                                    disabled={isResuming}
                                    className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg animate-pulse flex items-center gap-2"
                                  >
                                    {isResuming ? (
                                      <Loader2
                                        className="animate-spin"
                                        size={12}
                                      />
                                    ) : (
                                      <>
                                        <CreditCard size={14} /> Pay Now
                                      </>
                                    )}
                                  </motion.button>
                                )}
                              {order.filesDeleted &&
                                order.paymentStatus === "Pending" && (
                                  <span className="text-[9px] font-black text-red-500 uppercase bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex items-center gap-1">
                                    <AlertCircle size={10} /> Expired
                                  </span>
                                )}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => openOrderDetails(order)}
                                className="bg-slate-800 text-white p-3 rounded-xl hover:bg-blue-600 transition-all shadow-lg"
                              >
                                <ExternalLink size={18} />
                              </motion.button>
                               {userData.role === "admin" && order.shipmentId && (
                                  <button className="bg-purple-100 text-purple-600 p-2 rounded-lg text-xs font-bold">
                                    {order.shipmentId}
                                  </button>
                               )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center items-center gap-4 bg-slate-100/50 p-3 rounded-2xl w-fit mx-auto border border-slate-200/50">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-white shadow-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="font-bold text-[11px] text-slate-500 uppercase tracking-widest px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-white shadow-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* 4. BIG SERVICE CARDS */}
        <div className="space-y-12 pb-12 border-b border-slate-200">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center tracking-tight uppercase"
          >
            Order New Prints
          </motion.h2>
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <ServiceCard
              title="Quick Printouts"
              img={a4Img}
              link="/quick-print"
            />
            <ServiceCard
              title="Plan Printing"
              img={planImg}
              link="/plan-printing"
            />
            <ServiceCard
              title="Business Cards"
              img={bcardImg}
              link="/business-cards"
            />
          </motion.div>
        </div>

        {/* 5. NOTES SECTION */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6"
        >
          <NoteBox
            icon={<FiMapPin />}
            title="STORE PICKUP"
            desc="Arundelpet Guntur Only"
            color="blue"
          />
          <NoteBox
            icon={<FiZap />}
            title="BULK ORDERS"
            desc="+91 9441081125"
            color="yellow"
          />
          <NoteBox
            icon={<FiMail />}
            title="SUPPORT"
            desc="info@jumboxerox.com"
            color="green"
          />
        </motion.div>
      </div>

      {/* --- ORDER DETAILS MODAL --- */}
      <AnimatePresence>
        {showModal && selectedOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Package size={20} className="text-blue-400" />
                  <h2 className="text-lg font-bold uppercase tracking-tight">
                    Order Details
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Order ID
                    </p>
                    <p className="font-mono text-blue-600 text-sm font-bold truncate">
                      {selectedOrder._id}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Service Type
                    </p>
                    <p className="font-bold text-slate-800 uppercase text-sm">
                      {selectedOrder.serviceType}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Delivery Mode
                    </p>
                    <p className="font-bold text-slate-800 uppercase text-sm">
                      {selectedOrder.deliveryMode}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Grand Total
                    </p>
                    <p className="font-bold text-2xl text-slate-900">
                      ₹{selectedOrder.totalAmount}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2 tracking-widest italic border-b pb-2">
                    <Info size={14} /> Technical Specs
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 text-xs font-bold">
                    <p className="text-slate-500 uppercase">
                      Pages:{" "}
                      <span className="text-slate-800">
                        {selectedOrder.details?.pages || "—"}
                      </span>
                    </p>
                    <p className="text-slate-500 uppercase">
                      Copies:{" "}
                      <span className="text-slate-800">
                        {selectedOrder.details?.copies || "1"}
                      </span>
                    </p>
                    <p className="text-slate-500 uppercase">
                      Size:{" "}
                      <span className="text-slate-800">
                        {selectedOrder.details?.size || "Standard"}
                      </span>
                    </p>
                    <p className="text-slate-500 uppercase">
                      Status:{" "}
                      <span className="text-blue-600 italic">
                        {selectedOrder.status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Shipping Info Section */}
                {selectedOrder.shipmentId && (
                  <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 mb-6">
                    <h4 className="text-[10px] font-black text-purple-400 uppercase mb-4 flex items-center gap-2 tracking-widest italic border-b border-purple-200 pb-2">
                      <Package size={14} /> Logistics Info
                    </h4>
                    <div className="grid grid-cols-2 gap-y-3 text-xs font-bold">
                      <p className="text-slate-500 uppercase">
                        Courier:{" "}
                        <span className="text-slate-800">
                          {selectedOrder.courierName || "Standard"}
                        </span>
                      </p>
                      <p className="text-slate-500 uppercase">
                        AWB:{" "}
                        <span className="text-slate-800">
                          {selectedOrder.awbNumber || selectedOrder.shipmentId}
                        </span>
                      </p>
                      <div className="col-span-2 mt-2">
                        <a
                          href={`https://shiprocket.co/tracking/${selectedOrder.awbNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 text-white rounded-xl uppercase text-[10px] tracking-widest hover:bg-purple-700 transition"
                        >
                          Track Shipment <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Files Section with Expiry Sync */}
                {selectedOrder.files && selectedOrder.files.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">
                      Document Assets
                    </h4>
                    <div className="space-y-3">
                      {selectedOrder.files.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="text-blue-600" size={18} />
                            <span className="text-xs font-black text-slate-700 truncate w-40 md:w-64 italic">
                              {file.name}
                            </span>
                          </div>
                          {selectedOrder.filesDeleted ? (
                            <span className="text-[9px] font-black text-red-500 uppercase">
                              Purged
                            </span>
                          ) : (
                            <a
                              href={`${import.meta.env.VITE_API_BASE_URL.replace("/api", "")}${file.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-black uppercase tracking-widest"
                            >
                              <Download size={14} /> Open Source
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MOCK PAYMENT MODAL --- */}
      <AnimatePresence>
        {showMockPayment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-[400px] overflow-hidden rounded-2xl shadow-2xl relative flex flex-col border border-slate-200"
            >
              {/* Header */}
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg tracking-tight">Jumbo Xerox</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Test Payment Gateway</p>
                </div>
                <div className="bg-blue-600/20 p-2 rounded-lg">
                  <Store size={18} className="text-blue-400" />
                </div>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6">
                <div className="text-center">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                    Amount to Pay
                  </p>
                  <h2 className="text-4xl font-bold text-slate-900">
                    ₹{mockOrderData?.order?.totalAmount || mockOrderData?.amount || "0.00"}
                  </h2>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-blue-600 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm text-blue-900 uppercase tracking-tight">
                      Sandbox Mode
                    </h5>
                    <p className="text-xs text-blue-700/80 leading-relaxed mt-1 font-medium">
                      Simulated transaction. No funds will be moved.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleMockPaymentAction(true)}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex justify-center items-center gap-2 uppercase text-[11px] tracking-wider"
                  >
                    Simulate Success <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => handleMockPaymentAction(false)}
                    className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-all active:scale-95 uppercase text-[11px] tracking-wider"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <CreditCard size={12} /> Encrypted Transaction (Mock)
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Internal Helper Components ---
const StatCard = ({ label, value, icon, color, theme }) => (
  <motion.div
    variants={scaleIn}
    whileHover={{ y: -4 }}
    className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-slate-200"} p-8 rounded-2xl border shadow-md flex items-center justify-between transition-all`}
  >
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">
        {label}
      </p>
      <h3 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
        {value}
      </h3>
    </div>
    <div className={`${color} bg-current/10 p-4 rounded-xl`}>
      {React.cloneElement(icon, { size: 28 })}
    </div>
  </motion.div>
);

const ServiceCard = ({ title, img, link }) => (
  <motion.div 
    variants={scaleIn}
    className="bg-white rounded-2xl shadow-lg overflow-hidden group border border-slate-100 ring-1 ring-slate-200/50"
  >
    <div className="h-48 overflow-hidden relative">
      <img
        src={img}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
      />
      <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-all duration-300" />
    </div>
    <div className="p-8 flex flex-col items-center">
      <h4 className="font-bold text-xl text-slate-800 mb-6 uppercase tracking-tight">
        {title}
      </h4>
      <Link
        to={link}
        className="w-full py-4 bg-blue-600 text-white text-center rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all uppercase text-[11px] tracking-wider"
      >
        Start Project
      </Link>
    </div>
  </motion.div>
);

const NoteBox = ({ icon, title, desc, color }) => {
  const colors = {
    blue: "bg-blue-50/50 border-blue-500 text-blue-900",
    yellow: "bg-amber-50/50 border-amber-500 text-amber-900",
    green: "bg-emerald-50/50 border-emerald-500 text-emerald-900",
  };
  return (
    <motion.div
      variants={scaleIn}
      className={`${colors[color]} p-6 rounded-2xl border-l-4 shadow-sm flex items-start gap-4 transition-all hover:shadow-md`}
    >
      <div className="p-2 bg-white/80 rounded-lg shadow-sm">
        {React.cloneElement(icon, { size: 18 })}
      </div>
      <div>
        <h4 className="font-bold uppercase text-[10px] tracking-widest mb-1 opacity-80">{title}</h4>
        <p className="text-sm font-bold tracking-tight">
          {desc}
        </p>
      </div>
    </motion.div>
  );
};
