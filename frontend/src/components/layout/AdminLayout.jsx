import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
// import { AuthContext } from "../../context/AuthContext"; // Removed
import api from "../../services/api"; // Static Import
import Breadcrumbs from "../common/Breadcrumbs";
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Trash2,
  Users,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  Printer,
  Mail,
  Phone,
  Menu,
  X,
  Database,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useDispatch, useSelector } from "react-redux";
import { fetchDashboardStats, selectNotifications } from "../../redux/slices/dashboardSlice";
import { selectUser, logout, selectViewMode, setViewMode } from "../../redux/slices/authSlice";

const AdminLayout = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // const dispatch = useDispatch(); // Removed duplicate
  const notifications = useSelector(selectNotifications);
  const viewMode = useSelector(selectViewMode);

  // Handle View Mode Switching
  useEffect(() => {
    if (viewMode === 'user') {
        navigate("/");
    }
  }, [viewMode, navigate]);

  const handleToggleView = () => {
      dispatch(setViewMode('user'));
  };

  // Debugging route logs
  useEffect(() => {

  }, [location]);

  // Business Context Menu Items
  const menuItems = [
    { name: "Dashboard", path: "/admin", icon: <LayoutDashboard size={18} /> },
    { name: "Orders", path: "/admin/orders", icon: <ShoppingCart size={18} /> },
    { name: "Shipments", path: "/admin/shipments", icon: <Truck size={18} /> },
    {
      name: "Delete Files", // Fixed capitalization
      path: "/admin/delete-files",
      icon: <Trash2 size={18} />,
    },
    {
      name: "Customers",
      path: "/admin/users",
      icon: <Users size={18} />,
    },
    {
      name: "Payments",
      path: "/admin/payments",
      icon: <CreditCard size={18} />,
    },
    {
      name: "Enquiries",
      path: "/admin/contact-messages",
      icon: <MessageSquare size={18} />,
    },
    { name: "Settings", path: "/admin/settings", icon: <Settings size={18} /> },
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Redux: Fetch on Mount & Poll
  useEffect(() => {
    dispatch(fetchDashboardStats());
    const interval = setInterval(() => dispatch(fetchDashboardStats()), 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const getBadge = (path) => {
    if (!notifications) return null;
    
    if (path === "/admin/orders" && notifications.pendingOrders > 0) return notifications.pendingOrders;
    if (path === "/admin/shipments" && notifications.pendingShipments > 0) return notifications.pendingShipments;
    if (path === "/admin/contact-messages" && notifications.unreadMessages > 0) return notifications.unreadMessages;
    if (path === "/admin/delete-files" && notifications.fileCleanup > 0) return notifications.fileCleanup;
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 1. CLEAN BUSINESS HEADER - LIGHT GLASS */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 h-16 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="xl:hidden p-2 hover:bg-gray-100 rounded-md text-slate-500"
            >
              <Menu size={20} />
            </button>
            <Link to="/admin" className="flex items-center gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
                <Printer className="text-white" size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 leading-tight">
                  Admin Console
                </span>
                <span className="text-xs text-slate-500 leading-tight">
                  Jumbo Xerox
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Menu - Functional Business Style */}
          <nav className="hidden xl:flex items-center gap-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const badge = getBadge(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? "text-blue-600 bg-blue-50 border border-blue-100"
                      : "text-slate-500 hover:text-slate-800 hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                  {badge && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shadow-sm">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="w-px h-5 bg-gray-200 mx-4" />
            
            {/* View Toggle Button (Icon Only) */}
            <button
              onClick={handleToggleView}
              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              title="Switch to User View"
            >
               <User size={20} />
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              Log Out
            </button>
          </nav>
        </div>
      </header>

      {/* 2. MOBILE SIDEBAR */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] xl:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white border-r border-gray-200 z-[101] xl:hidden flex flex-col shadow-2xl"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-lg">
                  Menu
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                        : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                    }`}
                  >
                    {item.icon} {item.name}
                    {getBadge(item.path) && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {getBadge(item.path)}
                      </span>
                    )}
                  </Link>
                ))}
                
                {/* Mobile Logout Button */}
                 <button
                  onClick={handleToggleView}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors mt-6 border-t border-gray-100 pt-6"
                >
                  <User size={18} /> User View
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-2"
                >
                  <LogOut size={18} /> Log Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 3. MAIN INTERFACE */}
      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Breadcrumbs />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-transparent" // Removed container styling for cleaner look on light theme, or use bg-white if preferred
        >
          <Outlet />
        </motion.div>
      </main>

      {/* 4. REALISTIC BUSINESS FOOTER */}
      <footer className="bg-white border-t border-gray-200 mt-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1 space-y-3">
            <h2 className="text-slate-900 text-base font-bold">Jumbo Xerox</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Internal store operations portal.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <Link to="/admin" className="hover:text-blue-600 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/admin/orders" className="hover:text-blue-600 transition-colors">
                  Pending Orders
                </Link>
              </li>
              <li>
                <Link to="/admin/users" className="hover:text-blue-600 transition-colors">
                  Customers
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Support
            </h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>
                <Link
                  to="/admin/contact-messages"
                  className="hover:text-blue-600 transition-colors"
                >
                  Messages
                </Link>
              </li>
              <li>
                <Link to="/admin/settings" className="hover:text-blue-600 transition-colors">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contact
            </h3>
            <div className="space-y-2 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />{" "}
                support@jumboxerox.com
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-slate-400" /> +91 9441081125
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto mt-10 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-xs font-medium text-slate-500">
          <p>© 2026 Jumbo Xerox Operations. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span className="flex items-center gap-1.5">
              <Database size={14} /> System: Operational
            </span>
            <span>v2.5.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
