const Order = require("../models/Order");
const User = require("../models/User");
const Contact = require("../models/Contact");
const OTP = require("../models/OTP");
const { sendSMS } = require("../services/smsService");
const { createOrder, generateAWB } = require("../services/shiprocketService");
const mongoose = require("mongoose");
const checkDiskSpace = require("check-disk-space").default;
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

// HELPER: Async Folder size calculation (Non-blocking)
const getDirSizeAsync = async (dirPath) => {
  let size = 0;
  try {
    await fs.promises.access(dirPath);
    const files = await fs.promises.readdir(dirPath);
    
    await Promise.all(files.map(async (file) => {
      const filePath = path.join(dirPath, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory()) {
          size += await getDirSizeAsync(filePath);
        } else {
          size += stats.size;
        }
      } catch (e) {
        // Ignore individual file errors
      }
    }));
  } catch (err) {
    // Directory might not exist or access denied
  }
  return size;
};

// 1. DASHBOARD STATS (Optimized: Parallel Queries + Async Disk I/O)
exports.getAdminStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // parallelize all independent DB queries
    const [
      totalUsers,
      todayReg,
      todayOrdersCount,
      processingOrders,
      todayRevData,
      totalRevData,
      recentOrders,
      recentUsers,
      space,
      pendingOrders,
      unreadMessages,
      pendingShipments,
      fileCleanup
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ status: "Processing" }),
      Order.aggregate([
        { $match: { paymentStatus: "Paid", createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: "Paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email"),
      User.find().sort({ createdAt: -1 }).limit(5),
      checkDiskSpace(process.cwd()),
      Order.countDocuments({ status: "Pending" }),
      Contact.countDocuments({ isRead: false }),
      Order.countDocuments({
        paymentStatus: "Paid",
        status: "Completed",
        deliveryMode: "Delivery",
        $or: [{ shipmentId: null }, { shipmentId: "" }],
      }),
      Order.countDocuments({
        status: { $in: ["Completed", "Cancelled"] },
        filesDeleted: { $ne: true },
      })
    ]);

    // Dependent/Specific queries that were part of the response construction
    const [completedToday, pendingToday] = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: today }, status: "Completed" }),
        Order.countDocuments({ createdAt: { $gte: today }, status: "Pending" })
    ]);

    const todayRev = todayRevData[0]?.total || 0;
    const totalRev = totalRevData[0]?.total || 0;

    const combinedActivity = [
      ...recentOrders.map((o) => ({
        type: "order",
        activityTime: o.createdAt,
        user: o.user,
        totalAmount: o.totalAmount,
        paymentMethod: o.paymentMethod,
        files: o.files,
        _id: o._id,
      })),
      ...recentUsers.map((u) => ({
        type: "user",
        activityTime: u.createdAt,
        name: u.name,
        email: u.email,
        _id: u._id,
      })),
    ]
      .sort((a, b) => new Date(b.activityTime) - new Date(a.activityTime))
      .slice(0, 8);

    const uploadsPath = path.join(process.cwd(), "uploads", "files");
    const uploadsSize = await getDirSizeAsync(uploadsPath);

    const responsePayload = {
      totalUsers,
      todayReg,
      processing: processingOrders,
      todayOrders: {
        total: todayOrdersCount,
        completed: completedToday,
        pending: pendingToday,
      },
      notifications: {
        pendingOrders,
        unreadMessages,
        pendingShipments,
        fileCleanup,
      },
      todayRev,
      totalRev,
      disk: {
        free: (space.free / 1e9).toFixed(2) + " GB",
        uploadsSize: (uploadsSize / 1e6).toFixed(2) + " MB",
        isLowSpace: space.free / space.size < 0.2,
      },
      recentActivity: combinedActivity,
    };

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. USER DIRECTORY: Pagination, Search & Management
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      totalUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addUser = async (req, res) => {
  const { name, email, password, isActive } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.create({
      name,
      email,
      password: hashedPassword,
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json({ success: true, message: "Directory account added" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. ORDER MANAGEMENT: Upgraded Filtering & Security
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, paymentStatus, deliveryMode, search } = req.query;

    let query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (deliveryMode) query.deliveryMode = deliveryMode;

    if (search) {
      if (mongoose.isValidObjectId(search)) {
        query._id = search;
      } else {
        // Search in user details (needs join) or rough regex
        // Since we are querying Order, we can't easily regex search user fields without aggregate
        // For MVP, we'll assume search is mostly for Order ID or if we populate first (expensive)
        // Better approach: Find users first, then find orders for those users
        const users = await User.find({
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } }
            ]
        }).select('_id');
        
        const userIds = users.map(u => u._id);
        
        if (userIds.length > 0) {
             query.$or = [
                { user: { $in: userIds } },
                { _id: mongoose.isValidObjectId(search) ? search : null }
             ];
             // Clean up nulls
             query.$or = query.$or.filter(c => c._id !== null || c.user);
        } else if (mongoose.isValidObjectId(search)) {
            query._id = search;
        }
      }
    }

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      orders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      totalOrders,
    });
  } catch (error) {
    console.error("Order Fetch Error:", error);
    res.status(500).json({ message: "Cloud sync failed" });
  }
};

exports.getOrdersForDeletion = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    let query = {
      $or: [
        { paymentStatus: "Pending" },
        { status: { $in: ["Completed", "Cancelled"] } },
      ],
    };

    if (search) {
        // Similar search logic as above or simplified for Deletion page
         const users = await User.find({
            $or: [
                { name: { $regex: search, $options: "i" } }
            ]
        }).select('_id');
        const userIds = users.map(u => u._id);

        const searchQuery = [];
        if(userIds.length > 0) searchQuery.push({ user: { $in: userIds } });
        if(mongoose.isValidObjectId(search)) searchQuery.push({ _id: search });
        
        if(searchQuery.length > 0) {
            query = {
                $and: [
                    query,
                    { $or: searchQuery }
                ]
            }
        }
    }

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
        orders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
        totalOrders,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch storage data" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (
      order.filesDeleted &&
      (status === "Processing" || status === "Pending")
    ) {
      return res.status(400).json({
        message: "Blocked: Files purged. Cannot revert to active state.",
      });
    }
    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

// 4. ORIGINAL PROTECTED LOGICS (Integrity Maintained)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email phone addresses",
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Error fetching order" });
  }
};

exports.updateAdminProfile = async (req, res) => {
  const { name, email } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user)
      return res.status(404).json({ message: "Admin account not found" });
    user.name = name || user.name;
    user.email = email || user.email;
    await user.save();
    res.json({ success: true, user: { name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendOrderOTP = async (req, res) => {
  let { phone } = req.body;
  
  // Robustness: Trim phone
  phone = phone ? phone.toString().trim() : "";

  try {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndDelete({ phone });
    await OTP.create({ phone, otp: otpCode });
    // Verify Gateway (Production Mode)
    // Check Granular Flag: OTP_TEST_MODE
    if (process.env.OTP_TEST_MODE !== "true") {
      await sendSMS(phone, otpCode);
      res.json({ success: true, message: "OTP sent" });
    } else {
      // Test Mode: Return OTP
      console.log(`[TEST-MODE] Pickup OTP for ${phone}: ${otpCode}`);
      res.json({
        success: true,
        message: "OTP sent (Test Mode)",
        otp: otpCode,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.verifyOrderOTP = async (req, res) => {
  let { phone, otp } = req.body;
  
  // Robustness: Trim inputs
  phone = phone ? phone.toString().trim() : "";
  otp = otp ? otp.toString().trim() : "";

  console.log(`[DEBUG-OTP] Verifying: Phone='${phone}', OTP='${otp}'`);
  
  try {
    // Try exact match first
    let otpRecord = await OTP.findOne({ phone, otp });
    
    // Fallback: Check if phone matches partially (e.g. without +91 or with it)
    if (!otpRecord) {
        // Try searching by OTP only to see if phone is mismatched
        const otpOnly = await OTP.findOne({ otp });
        if (otpOnly) {
             console.log(`[DEBUG-OTP] Mismatch Found! DB Phone: '${otpOnly.phone}' vs Req Phone: '${phone}'`);
        } else {
             console.log(`[DEBUG-OTP] No record found for OTP: '${otp}'`);
        }
        
        return res.status(400).json({ 
            success: false, 
            message: "Invalid Verification Code" 
        });
    }

    await OTP.deleteOne({ _id: otpRecord._id });
    res.json({ success: true, message: "Verification success" });
  } catch (error) {
    console.error(`[DEBUG-OTP] Error:`, error);
    res.status(500).json({ message: error.message });
  }
};

exports.adminSearch = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query)
      return res.status(400).json({ message: "Search term required" });
    const orders = await Order.find({
      $or: [
        { _id: mongoose.isValidObjectId(query) ? query : null },
        { serviceType: { $regex: query, $options: "i" } },
        { status: { $regex: query, $options: "i" } },
      ],
    })
      .populate("user", "name email phone")
      .limit(10);
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).limit(10);
    res.json({ orders, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password" });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CONTACTS & OTHERS
exports.createPublicContact = async (req, res) => {
  const { name, email, message, subject } = req.body;
  try {
    await Contact.create({
      name,
      email,
      message,
      subject: subject || "No Subject",
    });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getContactMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalMessages = await Contact.countDocuments();
    const unreadMessages = await Contact.countDocuments({ isRead: false });
    const readMessages = await Contact.countDocuments({ isRead: true });

    const messages = await Contact.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
        
    res.json({
        messages,
        totalPages: Math.ceil(totalMessages / limit),
        currentPage: page,
        totalMessages,
        unreadMessages,
        readMessages
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markMessageRead = async (req, res) => {
  try {
    await Contact.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createShipment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("user");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // 1. Create Order in Shiprocket (or Mock)
    const shiprocketOrder = await createOrder(order);
    console.log("[DEBUG] Shiprocket Create Response:", JSON.stringify(shiprocketOrder, null, 2));
    
    // 2. Generate AWB (or Mock)
    // Note: In real Shiprocket flow, you might need to select a courier first.
    // For 'adhoc', it often assigns automatically or returns a shipment_id to assign later.
    // We assume createOrder returns a shipment_id we can use.
    const shipmentId = shiprocketOrder.shipment_id || shiprocketOrder.payload?.shipment_id || shiprocketOrder.response?.data?.shipment_id;
    
    if (!shipmentId) {
        throw new Error(`Failed to extract Shipment ID from response. Response: ${JSON.stringify(shiprocketOrder)}`);
    }
    
    const awbData = await generateAWB(shipmentId);

    // 3. Update Database
    order.shipmentId = shipmentId;
    order.awbNumber = awbData.awb_code;
    order.courierName = awbData.courier_name || "Shiprocket Courier";
    await order.save();

    res.json({ 
      success: true, 
      message: "Shipment created successfully", 
      order 
    });
  } catch (error) {
    console.error("Shipment Creation Failed:", error.message);
    res.status(500).json({ message: error.message || "Shipment creation failed" });
  }
};

exports.deleteFilesManually = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    order.files.forEach((f) => {
      const p = path.join(
        process.cwd(),
        "uploads",
        "files",
        path.basename(f.url),
      );
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
    order.filesDeleted = true;
    await order.save();
    res.json({ success: true, message: "Storage purged" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getShipmentLabel = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || !order.shipmentId) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Proactive: In a real scenario, we would call Shiprocket API here to get the label URL.
    // For now, we generate a valid-looking mock URL or return the AWB if strictly needed.
    // Ideally, we should have a `getLabel` service in shiprocketService.js
    
    // Mock Response for MVP/Test Mode
    const mockLabelUrl = `https://shiprocket.co/tracking/${order.awbNumber}`; 
    
    res.json({ 
      success: true, 
      labelUrl: mockLabelUrl,
      awb: order.awbNumber
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch label" });
  }
};

exports.getShipmentTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order || !order.shipmentId) {
        // Return a safe default to prevent frontend crash
        return res.json({ 
            tracking_data: { 
                track_status: 0, 
                shipment_status: 0, 
                shipment_track: [{
                    current_status: "Pending",
                    date: new Date().toISOString(),
                    activity: "Order Placed - Waiting for Shipment"
                }] 
            } 
        });
    }

    // Mock Tracking Data (Proactive: Simulation for Admin Demo)
    const mockTracking = {
      tracking_data: {
        track_status: 1,
        shipment_status: 7, // Delivered
        shipment_track: [
          {
            current_status: "Delivered",
            date: new Date().toISOString(),
            activity: "Delivered to Consignee",
            location: order.shippingAddress.city
          },
          {
            current_status: "Out for Delivery",
            date: new Date(Date.now() - 3600000).toISOString(),
            activity: "Out for Delivery",
            location: order.shippingAddress.city
          },
             {
            current_status: "In Transit",
            date: new Date(Date.now() - 86400000).toISOString(),
            activity: "Item reached Hub",
            location: "Mumbai Hub"
          }
        ]
      }
    };

    res.json(mockTracking);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tracking" });
  }
};


// End of Controller

