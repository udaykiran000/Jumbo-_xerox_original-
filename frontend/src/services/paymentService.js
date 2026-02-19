import api from "./api";
import toast from "react-hot-toast";

// Razorpay script dynamically load 
const loadScript = (src) => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const displayRazorpay = async (orderData, user, navigate) => {
  const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

  if (!res) {
    toast.error("Razorpay failed to load !");
    return;
  }
  console.log("RAZORPAY KEY CHECK:", import.meta.env.VITE_RAZORPAY_KEY_ID);
  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Frontend Key ID 
    amount: orderData.razorpayOrder.amount,
    currency: orderData.razorpayOrder.currency,
    name: "Jumbo Xerox",
    description: `Order for ${orderData.order.serviceType}`,
    // Fix: Use a public URL or comment out image for localhost to avoid CORS/404
    // image: "/logo.png", 
    image: "https://cdn.razorpay.com/logos/GhRQcyean79PqE_medium.png", // Example legitimate logo to stop errors
    order_id: orderData.razorpayOrder.id,
    handler: async (response) => {
      try {
        // Payment success backend verify 
        const verifyData = {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          dbOrderId: orderData.order._id, // Backend order update 
        };

        await api.post("/payments/verify", verifyData);
        toast.success("Payment Verified & Order Placed!");
        navigate("/dashboard");
      } catch (err) {
        console.error("Verification Error:", err);
        toast.error(err.response?.data?.message || "Verification Failed!");
      }
    },
    prefill: {
      name: user?.name || "",
      email: user?.email || "",
      contact: user?.phone || "",
    },
    theme: {
      color: "#2563eb",
    },
    modal: {
      ondismiss: function () {
        toast.error("Payment Cancelled");
      },
    },
  };

  const paymentObject = new window.Razorpay(options);
  paymentObject.open();
};
