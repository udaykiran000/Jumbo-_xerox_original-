const cron = require("node-cron");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const Order = require("../models/Order");

const TEMP_BASE = path.join(process.cwd(), "uploads", "temp");
const FILES_BASE = path.join(process.cwd(), "uploads", "files");

/**
 * Holistic System Cleanup logic
 * Purpose: Automate disk management and purge stale files/folders.
 */
const performCleanup = async () => {
  console.log("\n[CRON-MASTER] ♻️ Starting Autonomous Maintenance Cycle...");
  const now = Date.now();

  try {
    // --- 1. PURGE STALE TEMP CHUNKS (Older than 2.5 hours) ---
    // This includes completed chunks and Busboy's incomplete .tmp files.
    if (fsSync.existsSync(TEMP_BASE)) {
      const folders = await fs.readdir(TEMP_BASE);
      for (const folder of folders) {
        const p = path.join(TEMP_BASE, folder);
        const stats = await fs.stat(p);
        
        // If the upload folder hasn't been modified in 2.5 hours, it's abandoned.
        if (now - stats.mtimeMs > 2.5 * 60 * 60 * 1000) {
          await fs.rm(p, { recursive: true, force: true });

        }
      }
    }

    // --- 2. PURGE UNPAID/ABANDONED ASSETS (Older than 24 hours) ---
    const unpaidLimit = new Date(now - 24 * 60 * 60 * 1000);
    const abandonedOrders = await Order.find({
      paymentStatus: "Pending",
      status: "Pending",
      filesDeleted: false,
      createdAt: { $lt: unpaidLimit },
    });

    for (const order of abandonedOrders) {
      for (const file of order.files) {
        const filePath = path.join(FILES_BASE, path.basename(file.url));
        if (fsSync.existsSync(filePath)) {
          await fs.unlink(filePath);

        }
      }
      order.filesDeleted = true;
      order.status = "Archived"; 
      await order.save();
    }

    // --- 3. PURGE COMPLETED/CANCELLED ASSETS (Older than 48 hours) ---
    const finalizedLimit = new Date(now - 48 * 60 * 60 * 1000);
    const finalizedOrders = await Order.find({
      status: { $in: ["Completed", "Cancelled"] },
      filesDeleted: false,
      updatedAt: { $lt: finalizedLimit },
    });

    for (const order of finalizedOrders) {
      console.log(`🔎 [STORAGE] Finalized order asset purge: ${order._id}`);
      for (const file of order.files) {
        const filePath = path.join(FILES_BASE, path.basename(file.url));
        if (fsSync.existsSync(filePath)) {
          await fs.unlink(filePath);

        }
      }
      order.filesDeleted = true;
      await order.save();
    }

    console.log("[CRON-MASTER] ✅ Storage optimized. Maintenance tasks finished.");
  } catch (err) {
    console.error("[CRON-ERR] Holistic Cleanup Failed:", err.message);
  }
};

const startCronJobs = () => {
  // SCHEDULE: Run every 30 minutes
  cron.schedule("*/30 * * * *", performCleanup);
  console.log("🚀 [SYSTEM] Maintenance Engine Active (Interval: 30m)");
};

module.exports = { startCronJobs, performCleanup };