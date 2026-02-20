import React, { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "../../components/common/Animations";
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  Search,
  MapPin,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";

export default function AdminShipments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ totalOrders: 0 });

  // Fetch Tracking Data when shipment is selected
  useEffect(() => {
    if (selectedShipment && selectedShipment.shipmentId) {
      const fetchTracking = async () => {
        try {
          const res = await api.get(
            `/admin/shipment/track/${selectedShipment._id}`
          );
          setTrackingData(res.data.tracking_data);
        } catch (e) {
          console.error("Tracking Error:", e);
        }
      };
      fetchTracking();
    } else {
      setTrackingData(null);
    }
  }, [selectedShipment]);

  useEffect(() => {
    fetchShipmentOrders(currentPage);
  }, [currentPage]);

  const fetchShipmentOrders = async (page = 1) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/orders?deliveryMode=Delivery&page=${page}&limit=10`);
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
      setStats({ totalOrders: data.totalOrders }); // Store total count for "Pending" stat
    } catch (e) {
      toast.error("Shipment data load failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="space-y-6 font-sans"
    >
      {/* 1. STATS SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Shipment Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage all logistics and deliveries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full lg:w-auto flex-1 max-w-3xl">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Orders
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{stats.totalOrders}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package size={20} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Shipped
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">–</h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Pending
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{stats.totalOrders}</h3>
            </div>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Clock size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. SHIPMENTS TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck className="text-slate-500" size={18} /> Ready for Shipment
            </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3 text-center">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Shipment Ref</th>
                <th className="px-6 py-3">Logistics</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20}/>
                    Loading shipments...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-500">
                        No delivery orders found.
                    </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs font-medium text-blue-600">
                      #{o._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {o.user?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {o.user?.email}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">₹{o.totalAmount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          o.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {o.shipmentId ? o.shipmentId.slice(-8) : "—"}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            o.shipmentId ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {o.shipmentId ? "Shipped" : "Not Shipped"}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {o.status === "Completed" && !o.shipmentId && (
                        <button
                          onClick={() => setSelectedShipment(o)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-blue-200 hover:border-blue-300"
                        >
                          + Create Shipment
                        </button>
                      )}
                      {o.status === "Completed" && o.shipmentId && (
                        <button
                          onClick={() => setSelectedShipment(o)}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-purple-200 hover:border-purple-300 flex items-center gap-1 mx-auto"
                        >
                          <Eye size={14} /> Track
                        </button>
                      )}
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

      {/* 3. TRACKING DRAWER */}
      <AnimatePresence>
        {selectedShipment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden h-[85vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <button
                  onClick={() => setSelectedShipment(null)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft size={18} /> Back to List
                </button>
                <div className="flex gap-2">
                    <button className="p-2 text-slate-500 hover:bg-gray-200 rounded-lg transition-colors" title="Refresh">
                    <RefreshCw size={16} />
                    </button>
                    <button onClick={() => setSelectedShipment(null)} className="p-2 text-slate-500 hover:bg-gray-200 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto space-y-8 flex-1">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                    <Package size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Shipment Details
                    </h2>
                    <p className="text-sm text-slate-500">
                      ID: #{selectedShipment._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-full text-blue-600 border border-gray-200 shadow-sm">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">
                        Current Status
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        {trackingData?.current_status || "Pending Processing"}
                      </h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white border border-gray-200 text-slate-700 rounded-md text-xs font-medium shadow-sm">
                    {trackingData?.current_status || "Pending"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b pb-2 mb-2">
                      <FileText size={16} /> Shipment Info
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                        <p className="text-base font-semibold text-slate-900">₹{selectedShipment.totalAmount}</p>
                      </div>
                       <div>
                        <p className="text-xs text-slate-500 mb-1">AWB Number</p>
                        <p className="text-sm font-mono text-slate-700 bg-gray-50 px-2 py-1 rounded inline-block">
                          {selectedShipment.shipmentId || "Pending"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b pb-2 mb-2">
                      <MapPin size={16} /> Delivery Address
                    </h4>
                    <div className="space-y-1">
                         <p className="text-sm font-semibold text-slate-900">{selectedShipment.user?.name}</p>
                         <p className="text-sm text-slate-600">{selectedShipment.user?.email}</p>
                         <p className="text-sm text-slate-600 mt-2">{selectedShipment.user?.phone || "No Phone"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-2 border-dashed">
                  <h4 className="text-sm font-bold text-slate-700">
                    Tracking Timeline
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Live updates will appear here once the logistics partner processes the package.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                {!selectedShipment.shipmentId && (
                  <button
                    onClick={async () => {
                      try {
                        // console.log("Sending Create Request...");
                        const { data } = await api.post("/admin/shipment/create", {
                          orderId: selectedShipment._id,
                        });
                        
                        toast.success("Shipment Generated!");
                        
                        const updatedShipment = {
                           ...selectedShipment,
                           shipmentId: data.order.shipmentId,
                           awbNumber: data.order.awbNumber
                        };
                        setSelectedShipment(updatedShipment);
                        fetchShipmentOrders();
                      } catch (e) {
                         console.error("Create Failed:", e);
                        toast.error("Failed to create shipment");
                      }
                    }}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Generate Shipment ID
                  </button>
                )}
                
                {selectedShipment.shipmentId && (
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await api.get(
                          `/admin/shipment/label/${selectedShipment._id}`
                        );
                        if (data.labelUrl) {
                          window.open(data.labelUrl, "_blank");
                        } else {
                          toast.error("Label not generated yet");
                        }
                      } catch (e) {
                        toast.error("Failed to fetch label");
                      }
                    }}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <FileText size={16} /> Download Label
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
