import { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Truck,
  Send,
  CheckCircle,
  Package,
  User,
  Loader2,
  MapPin,
  Clock,
} from "lucide-react";

import { fadeInUp } from "../../components/common/Animations";

export default function AdminShipping() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/orders?limit=100");
      const allOrders = data.orders || [];
      // Only Delivery orders
      const deliveryOrders = allOrders.filter(
        (o) => o.deliveryMode === "Delivery"
      );
      setOrders(deliveryOrders);
    } catch (e) {
      toast.error("Orders load failed");
    } finally {
      setLoading(false);
    }
  };

  const handleShiprocket = async (id) => {
    const toastId = toast.loading("Connecting to Shiprocket...");
    try {
      const { data } = await api.post(`/admin/order/${id}/ship`);
      toast.success("Shipment Created! ID: " + data.data.shipment_id, {
        id: toastId,
      });
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || "Shipping failed", {
        id: toastId,
      });
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500 font-bold uppercase tracking-wider">
        <Loader2 className="animate-spin mb-4 text-blue-500" size={32} />{" "}
        Syncing Logistics...
      </div>
    );

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="space-y-6 pb-20 font-sans"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Truck className="text-blue-600" /> Shipping Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage delivery orders and shipments.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border border-blue-100">
          {orders.length} Ready for Dispatch
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
             <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-slate-500 tracking-wide">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tracking Info</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="p-12 text-center text-slate-500 italic"
                  >
                    No delivery orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-slate-900 font-semibold leading-none mb-1">
                            {o.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500">
                             ID: #{o._id.slice(-6).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                      <div className="flex items-start gap-1 max-w-[200px]">
                         <MapPin size={14} className="inline mt-0.5 shrink-0 text-slate-400" />
                         <span>{o.shippingAddress?.address || o.shippingAddress?.city || "Missing Address"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          o.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {o.shipmentId ? (
                        <span className="text-slate-700 font-semibold">SID: {o.shipmentId}</span>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                            <Clock size={12} /> Waiting for Label
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!o.shipmentId ? (
                        o.status === "Completed" ? (
                          <button
                            onClick={() => handleShiprocket(o._id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase mx-auto flex items-center gap-2 shadow-sm transition-all active:scale-95"
                          >
                            <Send size={14} /> Ship Now
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium italic">
                            Pending Completion
                          </span>
                        )
                      ) : (
                        <div className="text-emerald-600 font-bold text-xs flex items-center justify-center gap-1 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-100 w-fit mx-auto">
                          <CheckCircle size={14} /> Shipped
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
