import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  CreditCard,
  Banknote,
  Truck,
  Store,
  X,
  Loader2,
  MapPin,
  ChevronRight,
  Phone,
  ShieldCheck,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
// import { AuthContext } from "../../context/AuthContext"; // Removed
// import { useConfig } from "../../context/ConfigContext"; // Removed
import { motion, AnimatePresence } from "framer-motion";
import { displayRazorpay } from "../../services/paymentService";

const DELIVERY_CHARGE = 90;

import { useSelector } from "react-redux";
import { selectUser } from "../../redux/slices/authSlice";
import { selectConfig } from "../../redux/slices/configSlice";

const Checkout = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const config = useSelector(selectConfig);

  // --- 1. CORE STATES (Updated for Sync) ---
  const [deliveryMode, setDeliveryMode] = useState(null);
  const [isModeError, setIsModeError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Online");
  const [instructions, setInstructions] = useState(state?.instructions || "");
  const [pickupDetails, setPickupDetails] = useState({
    name: user?.name || "",
    phone: "", // Will be synced from API
  });
  const [addressList, setAddressList] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [localPhone, setLocalPhone] = useState(""); // Track fresh phone from API

  // --- 2. OTP & SUBMISSION STATES ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const timerRef = useRef(null);

  const [showAddrModal, setShowAddrModal] = useState(false);
  const [newAddr, setNewAddr] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Upgraded: Holistic Profile Sync (Solves "Valid Phone" error)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get("/users/profile");
        if (data.addresses) setAddressList(data.addresses);

        // Logical Connectivity: Fresh phone number sync
        if (data.phone) {
          setLocalPhone(data.phone);
          setPickupDetails((prev) => ({ ...prev, phone: data.phone }));
        }
      } catch (e) {
        console.error("[DEBUG-UI] Profile load failed");
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (otpTimer > 0) {
      timerRef.current = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [otpTimer]);

  const subtotal = Number(state?.totalPrice) || 0;
  const grandTotal = useMemo(
    () => (deliveryMode === "Delivery" ? subtotal + DELIVERY_CHARGE : subtotal),
    [deliveryMode, subtotal],
  );

  // Error States
  const [isNameError, setIsNameError] = useState(false);
  const [isPhoneError, setIsPhoneError] = useState(false);
  const [isAddressError, setIsAddressError] = useState(false);

  const handlePlaceOrderClick = async () => {
    // Reset Errors
    setIsNameError(false);
    setIsPhoneError(false);
    setIsAddressError(false);
    setIsModeError(false);

    // 1. Validate Delivery Mode
    if (!deliveryMode) {
      setIsModeError(true);
      return toast.error("Please select Pickup or Home Delivery!");
    }

    // 2. Validate Address (if Delivery)
    if (deliveryMode === "Delivery" && addressList.length === 0) {
      setIsAddressError(true);
      return toast.error("Please add a delivery address first!");
    }

    // 3. Validate Pickup Name (if Pickup)
    if (deliveryMode === "Pickup" && !pickupDetails.name.trim()) {
      setIsNameError(true);
      return toast.error("Pickup person name is required!");
    }

    // 4. Validate Phone (Dynamic Source)
    // Upgraded Validation: Priority given to localPhone (Fresh from API)
    const targetPhone =
      deliveryMode === "Pickup" ? pickupDetails.phone : localPhone;



    if (!targetPhone || targetPhone.length < 10) {
      setIsPhoneError(true);
      return toast.error("Valid phone number required!");
    }

    // OTP Bypass Logic (Restored Integrity)
    // If it matches the profile phone (localPhone), bypass OTP
    if (
      deliveryMode === "Delivery" ||
      (deliveryMode === "Pickup" && targetPhone === localPhone)
    ) {

      await proceedToOrderCreation();
      return;
    }

    // OTP Protocol for New Pickup Numbers
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/admin/otp/send", { phone: targetPhone });
      setShowOTPModal(true);
      setOtpTimer(60);

      // DEV MODE: Auto-fill or show OTP
      if (data.otp) {
        toast.success(`DEV MODE: OTP Auto-filled: ${data.otp}`, {
          duration: 6000,
        });
        // console.log("DEV OTP:", data.otp);
        setOtpValue(data.otp); // Auto-fill
      } else {
        toast.success("Verification code sent!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndOrder = async () => {
    if (otpValue.length < 6) return toast.error("Enter 6-digit code");
    const targetPhone = pickupDetails.phone;
    setIsVerifying(true);
    try {
      await api.post("/admin/otp/verify", {
        phone: targetPhone,
        otp: otpValue,
      });
      await proceedToOrderCreation();
    } catch (err) {
      toast.error("Invalid verification code");
    } finally {
      setIsVerifying(false);
    }
  };

  // --- 3. MOCK PAYMENT STATE ---
  const [showMockPayment, setShowMockPayment] = useState(false);
  const [mockOrderData, setMockOrderData] = useState(null);
  
  // Anti-Double-Click State
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  const proceedToOrderCreation = async () => {
    if (isPaymentProcessing) return; // Prevention
    setIsPaymentProcessing(true);
    
    try {
      const payload = {
        files: (state?.fileKeys || []).map((k) => ({
          name: k,
          url: `/uploads/files/${k}`,
        })),
        serviceType: state?.serviceType || "Quick Print",
        totalAmount: grandTotal,
        deliveryMode,
        paymentMethod: "Online",
        details: {
          ...state,
          pages: state?.totalPages || state?.pages,
          copies: state?.copies || state?.qty,
          instructions,
        },
        shippingAddress:
          deliveryMode === "Delivery"
            ? addressList[selectedAddressIndex]
            : null,
        pickupDetails: deliveryMode === "Pickup" ? pickupDetails : null,
      };

      const { data } = await api.post("/orders", payload);
      setShowOTPModal(false);

      // Mock Payment for Development/Test
      if (config.paymentTestMode) {
        setMockOrderData(data);
        setShowMockPayment(true);
      } else {
        await displayRazorpay(data, user, navigate);
      }
    } catch (e) {
      toast.error("Order process failed");
    } finally {
        setIsPaymentProcessing(false);
    }
  };

  const handleMockPaymentAction = async (success) => {
    setShowMockPayment(false);
    if (!mockOrderData) return;

    if (success) {
      try {
        await api.post("/payments/verify", {
          razorpay_order_id: mockOrderData.razorpayOrder.id,
          razorpay_payment_id: "mock_payment_id_" + Date.now(),
          razorpay_signature: "mock_payment_signature",
          dbOrderId: mockOrderData.order._id,
        });
        toast.success("Mock Payment Verified!");
        navigate("/dashboard");
      } catch (e) {
        toast.error("Mock Verification Failed");
      }
    } else {
      toast.error("Payment Cancelled (Mock)");
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/users/address", newAddr);
      setAddressList(Array.isArray(data) ? data : data.addresses || []);
      setShowAddrModal(false);
      setNewAddr({ street: "", city: "", state: "", pincode: "" });
      toast.success("Address Added!");
    } catch (e) {
      toast.error("Save failed");
    }
  };

  if (!state)
    return (
      <div className="p-20 text-center font-bold text-blue-600 font-sans tracking-widest uppercase text-[10px]">
        Session Expired
      </div>
    );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="max-w-7xl mx-auto p-4 md:p-10 font-sans pb-32 text-slate-700 text-left"
    >
      <div className="text-center mb-16">
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-2">
          Finalization
        </p>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">
          Check<span className="text-blue-600">out</span>
        </h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className={`bg-white p-8 md:p-10 rounded-[3rem] border transition-all duration-300 shadow-xl ${isModeError ? "border-red-500 shadow-red-100 ring-4 ring-red-50" : "border-gray-100 shadow-blue-900/5"}`}>
            <h3 className={`text-center text-[10px] font-black uppercase tracking-widest mb-10 ${isModeError ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
              Select: Pickup or Home Delivery <span className="text-red-500">*</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <OptionCard
                active={deliveryMode === "Pickup"}
                onClick={() => { setDeliveryMode("Pickup"); setIsModeError(false); }}
                icon={<Store size={24} />}
                title="STORE PICKUP"
                desc="Self collection at hub"
              />
              <OptionCard
                active={deliveryMode === "Delivery"}
                onClick={() => { setDeliveryMode("Delivery"); setIsModeError(false); }}
                icon={<Truck size={24} />}
                title="HOME DELIVERY"
                desc={`Standard ₹${DELIVERY_CHARGE} Fee`}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {deliveryMode === "Pickup" ? (
              <motion.div
                key="pickup"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-orange-100 shadow-lg shadow-orange-900/5 space-y-8">
                  <div className="flex items-center gap-4">
                    <MapPin className="text-orange-500" size={28} />
                    <h3 className="font-black text-2xl tracking-tight">
                      Collection Point
                    </h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <InputGroup
                      label="Pickup Person Name"
                      value={pickupDetails.name}
                      onChange={(v) => {
                        setPickupDetails({ ...pickupDetails, name: v });
                        setIsNameError(false);
                      }}
                      placeholder="Full Identity"
                      error={isNameError}
                    />
                    <InputGroup
                      label="Identity Mobile"
                      value={pickupDetails.phone}
                      onChange={(v) => {
                        setPickupDetails({ ...pickupDetails, phone: v });
                        setIsPhoneError(false);
                      }}
                      placeholder="10-digit number"
                      error={isPhoneError}
                    />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-orange-100 overflow-hidden shadow-inner">
                  <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4 ml-4">
                    Navigate to Jumbo Hub
                  </h4>
                  <div className="rounded-[1.8rem] overflow-hidden border border-orange-50 h-56 w-full grayscale-[0.2] hover:grayscale-0 transition-all">
                    <iframe
                      title="map"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3829.434771617296!2d80.44318047466814!3d16.30069508441113!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4a757659555555%3A0x6b55555555555555!2sArundelpet%2C%20Guntur!5e0!3m2!1sen!2sin!4v1707170000000"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="delivery"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white p-8 md:p-10 rounded-[3rem] border shadow-lg space-y-8 transition-all duration-300 ${isAddressError ? "border-red-500 shadow-red-100 ring-4 ring-red-50" : "border-blue-100 shadow-blue-900/5"}`}
              >
                <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-4">
                    <Truck className="text-blue-500" size={28} />
                    <h3 className="font-black text-2xl tracking-tight">
                      Shipping Endpoint
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddrModal(true)}
                    className="text-[10px] bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-blue-200 hover:scale-105 transition-all uppercase"
                  >
                    + Add Address
                  </button>
                </div>
                <div className="grid gap-4">
                  {addressList.map((addr, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedAddressIndex(i)}
                      className={`p-6 rounded-[1.8rem] border-2 transition-all cursor-pointer ${selectedAddressIndex === i ? "border-blue-600 bg-blue-50 shadow-inner" : "border-gray-100 hover:border-blue-200"}`}
                    >
                      <p className="font-black text-base text-slate-800">
                        {addr.street}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </div>
                  ))}
                  {addressList.length === 0 && (
                    <div className="p-16 text-center italic text-slate-300 font-bold uppercase tracking-widest text-xs">
                      No saved endpoints found
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
            <h3 className="font-black text-xl mb-5 italic tracking-tight uppercase">
              Printing Directives
            </h3>
            <textarea
              className="w-full bg-gray-50 border-none rounded-[2rem] p-8 text-sm font-bold text-slate-700 h-32 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Any specific requirements for your documents..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          <div className="space-y-6">
            <h3 className="font-black text-2xl ml-6 tracking-tight uppercase">
              Financial Settlement
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PaymentOption
                active={true}
                onClick={() => {}}
                icon={<CreditCard size={22} />}
                title="Secure Online Payment"
                desc="UPI / Card / NetBanking"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-24 bg-slate-950 rounded-[3.5rem] p-10 text-white shadow-[0_20px_50px_rgba(37,99,235,0.15)] relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-center font-black tracking-[0.3em] text-slate-500 text-[10px] mb-10 uppercase">
                Order Inventory Summary
              </h4>
              <div className="space-y-6">
                <SummaryRow
                  label="Service Identity"
                  value={state.serviceType}
                />
                <SummaryRow
                  label="Unit Count"
                  value={state.copies || state.qty}
                />
                <SummaryRow label="Logistics" value={deliveryMode} />
                <div className="pt-10 border-t border-white/5 space-y-5">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span>Net Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span>Logistics Fee</span>
                    <span>
                      ₹
                      {deliveryMode === "Delivery"
                        ? DELIVERY_CHARGE.toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-6">
                    <span className="text-2xl font-black italic tracking-tighter uppercase">
                      Gross Total
                    </span>
                    <span className="text-5xl font-black text-blue-500 tracking-tighter leading-none">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  disabled={isSubmitting || isPaymentProcessing}
                  onClick={handlePlaceOrderClick}
                  className="w-full mt-12 py-7 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-4 uppercase tracking-tighter disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting || isPaymentProcessing ? (
                    <>
                    <Loader2 className="animate-spin" />
                    <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={24} /> Checkout Now
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-blue-600/5 rounded-full blur-[100px]" />
          </div>
        </div>
      </div>

      {/* MODALS (Original Integrity Preserved) */}
      <AnimatePresence>
        {showOTPModal && (
          <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl relative"
            >
              <button
                onClick={() => setShowOTPModal(false)}
                className="absolute top-10 right-10 text-slate-300 hover:text-slate-900"
              >
                <X size={28} />
              </button>
              <div className="text-center space-y-6">
                <div className="bg-blue-50 text-blue-600 w-24 h-24 rounded-[2.2rem] flex items-center justify-center mx-auto">
                  <ShieldCheck size={44} strokeWidth={2.5} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">
                  Verify Origin
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Identity key sent to registered mobile <br />{" "}
                  <span className="text-slate-900">{pickupDetails.phone}</span>
                </p>
                <div className="pt-8">
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="• • • • • •"
                    className="w-full text-center text-4xl font-black tracking-[0.4em] py-6 bg-gray-50 border-2 border-gray-100 rounded-[2.5rem] focus:border-blue-600 outline-none"
                    value={otpValue}
                    onChange={(e) =>
                      setOtpValue(e.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>
                <div className="flex items-center justify-between px-4 pt-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    {otpTimer > 0 ? `Expires in ${otpTimer}s` : "Key Expired"}
                  </p>
                  <button
                    disabled={otpTimer > 0}
                    onClick={handlePlaceOrderClick}
                    className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1.5 disabled:opacity-30"
                  >
                    <RefreshCcw size={14} /> Resend Key
                  </button>
                </div>
                <button
                  disabled={isVerifying || otpValue.length < 6}
                  onClick={handleVerifyAndOrder}
                  className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4"
                >
                  {isVerifying ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Authorize Settlement"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddrModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-sm rounded-[3rem] p-12 shadow-2xl relative"
            >
              <X
                className="absolute top-10 right-10 cursor-pointer text-slate-300 hover:text-slate-900"
                onClick={() => setShowAddrModal(false)}
              />
              <h3 className="font-black text-2xl tracking-tight mb-10 italic uppercase">
                New Endpoint
              </h3>
              <form onSubmit={handleSaveAddress} className="space-y-6">
                <InputGroup
                  label="Location Details"
                  value={newAddr.street}
                  onChange={(v) => setNewAddr({ ...newAddr, street: v })}
                  placeholder="Street / Landmark"
                />
                <div className="grid grid-cols-2 gap-6">
                  <InputGroup
                    label="City Area"
                    value={newAddr.city}
                    onChange={(v) => setNewAddr({ ...newAddr, city: v })}
                    placeholder="City"
                  />
                  <InputGroup
                    label="Zip/Pin"
                    value={newAddr.pincode}
                    onChange={(v) => setNewAddr({ ...newAddr, pincode: v })}
                    placeholder="6-digits"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-6 bg-slate-900 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-widest mt-6 shadow-xl shadow-slate-200"
                >
                  Register Location
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW: Razorpay-like Mock Payment Modal */}
      <AnimatePresence>
        {showMockPayment && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-[400px] overflow-hidden rounded-2xl shadow-2xl relative flex flex-col"
            >
              {/* Header */}
              <div className="bg-[#2b84ea] p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Jumbo Xerox</h3>
                  <p className="text-xs opacity-90">Test Mode Payment</p>
                </div>
                <div className="bg-white/20 p-2 rounded-lg">
                  <Store size={20} />
                </div>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6">
                <div className="text-center">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">
                    Payable Amount
                  </p>
                  <h2 className="text-4xl font-black text-gray-900">
                    ₹{grandTotal.toFixed(2)}
                  </h2>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                  <div className="bg-blue-500 text-white p-1 rounded-full mt-0.5">
                    <CheckCircle2 size={12} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-blue-900">
                      Development Mode
                    </h5>
                    <p className="text-xs text-blue-700 leading-relaxed mt-1">
                      This is a simulated transaction. No actual money will be
                      deducted.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => handleMockPaymentAction(true)}
                    className="w-full py-4 bg-[#2b84ea] hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex justify-center items-center gap-2"
                  >
                    Success <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => handleMockPaymentAction(false)}
                    className="w-full py-4 bg-white border-2 border-gray-100 hover:bg-gray-50 text-gray-600 font-bold rounded-xl transition-all active:scale-95"
                  >
                    Cancel Transaction
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                  <ShieldCheck size={12} /> 100% Secure (Mock)
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- HELPERS (Unchanged) ---
const OptionCard = ({ active, onClick, icon, title, desc }) => (
  <div
    onClick={onClick}
    className={`p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all flex flex-col items-center gap-3 text-center ${active ? "border-blue-600 bg-blue-50 shadow-inner" : "border-gray-100 bg-gray-50 hover:bg-white"}`}
  >
    <div
      className={`${active ? "text-blue-600" : "text-gray-300"} transform ${active ? "scale-110" : ""} transition-all`}
    >
      {icon}
    </div>
    <p className="font-black text-slate-800 text-[11px] mt-2 uppercase tracking-widest">
      {title}
    </p>
    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-none">
      {desc}
    </p>
  </div>
);

const InputGroup = ({ label, value, onChange, placeholder, error }) => (
  <div className="space-y-2 text-left">
    <label className={`text-[9px] font-black uppercase tracking-widest ml-4 transition-colors ${error ? "text-red-500 animate-pulse" : "text-slate-400"}`}>
      {label} {error && "*"}
    </label>
    <input
      required
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-gray-50 border rounded-[1.5rem] p-5 font-bold text-slate-800 text-xs focus:ring-2 outline-none transition-all shadow-inner 
        ${error ? "border-red-500 focus:ring-red-200 bg-red-50/10" : "border-gray-100 focus:ring-blue-500"}`}
      placeholder={placeholder}
    />
  </div>
);

const SummaryRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1 font-bold">
    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
      {label}
    </span>
    <span className="text-xs text-slate-400 capitalize truncate max-w-[150px]">
      {value || "—"}
    </span>
  </div>
);

const PaymentOption = ({ active, onClick, icon, title, desc }) => (
  <div
    onClick={onClick}
    className={`p-6 rounded-[2rem] border-2 flex items-center justify-between cursor-pointer transition-all ${active ? "border-blue-600 bg-blue-50/50 shadow-inner" : "border-gray-100 bg-white"}`}
  >
    <div className="flex items-center gap-5">
      <div
        className={`p-3 rounded-2xl ${active ? "bg-blue-600 text-white shadow-xl shadow-blue-200" : "bg-gray-100 text-gray-400"}`}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="font-black text-xs text-slate-800 tracking-tight leading-none mb-1 uppercase">
          {title}
        </p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none">
          {desc}
        </p>
      </div>
    </div>
    <div
      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${active ? "border-blue-600 bg-white" : "border-gray-200"}`}
    >
      {active && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-3 h-3 bg-blue-600 rounded-full" 
        />
      )}
    </div>
  </div>
);

export default Checkout;
