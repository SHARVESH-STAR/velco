import mongoose from "mongoose";
import { config } from "../src/config.js";
import Admin from "../src/models/Admin.js";
import User from "../src/models/User.js";

async function seed() {
  try {
    console.log("Connecting to database at:", config.MONGODB_URI);
    await mongoose.connect(config.MONGODB_URI);
    console.log("Connected successfully.");

    // 1. Seed Admin
    const existingAdmin = await Admin.findOne({ mail: "admin@astro.com" });
    if (!existingAdmin) {
      const defaultAdmin = new Admin({
        name: "Super Administrator",
        mail: "admin@astro.com",
        password: "adminpassword123", // Automatically hashed by model hooks
      });
      await defaultAdmin.save();
      console.log("✅ Seeded Admin Credentials:");
      console.log("   Email:    admin@astro.com");
      console.log("   Password: adminpassword123");
    } else {
      console.log("ℹ️ Admin admin@astro.com already exists.");
    }

    // 2. Seed Client User
    const existingClient = await User.findOne({ mail: "client@velco.com" });
    if (!existingClient) {
      const defaultClient = new User({
        name: "Test Client User",
        mail: "client@velco.com",
        phone: "+1555123456",
        password: "clientpassword123",
        status: "Active",
        role: "client",
      });
      await defaultClient.save();
      console.log("✅ Seeded Client Credentials:");
      console.log("   Email:    client@velco.com");
      console.log("   Password: clientpassword123");
    } else {
      console.log("ℹ️ Client client@velco.com already exists.");
    }

    // 3. Seed Delivery Rider User
    const existingDelivery = await User.findOne({ mail: "delivery@velco.com" });
    if (!existingDelivery) {
      const defaultDelivery = new User({
        name: "Test Delivery Rider User",
        mail: "delivery@velco.com",
        phone: "+1555987654",
        password: "deliverypassword123",
        status: "Active",
        role: "delivery",
      });
      await defaultDelivery.save();
      console.log("✅ Seeded Delivery Credentials:");
      console.log("   Email:    delivery@velco.com");
      console.log("   Password: deliverypassword123");
    } else {
      console.log("ℹ️ Delivery rider delivery@velco.com already exists.");
    }

    console.log("Seed script finished successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exit(1);
  }
}

seed();
