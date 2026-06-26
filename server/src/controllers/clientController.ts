import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { OAuth2Client } from "google-auth-library";

/**
 * Geocodes an address string to get latitude and longitude via OpenStreetMap Nominatim.
 * Falls back to San Francisco coordinates if geocoding fails.
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "VelcoLogisticsApp/1.0",
      },
    });
    const data = await response.json() as any[];
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (err) {
    console.warn(`Geocoding failed for address: "${address}". Using fallback.`, err);
  }
  return { lat: 37.7749, lng: -122.4194 }; // San Francisco default fallback
}

class ClientController {
  public async loginClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mail, password } = req.body;
      const user = await User.findOne({ mail }).select("+password");
      if (!user) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      if (user.role !== "client") {
        res.status(403).json({ message: "Access forbidden: Not a client" });
        return;
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      const token = jwt.sign({ id: user.id, role: "client" }, config.JWT_SECRET, { expiresIn: "1d" });
      const { password: _pw, ...safeUser } = user.toObject();
      res.status(200).json({ token, user: safeUser });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mock Google Login
   */
  public async loginGoogle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, name, idToken } = req.body;
      
      let targetEmail = email;
      let targetName = name || "Mock Google User";

      if (idToken) {
        try {
          const decoded = jwt.decode(idToken) as any;
          if (decoded && decoded.email) {
            targetEmail = decoded.email;
            if (decoded.name) targetName = decoded.name;
          } else if (idToken.includes("@")) {
            targetEmail = idToken;
          }
        } catch {
          if (idToken.includes("@")) targetEmail = idToken;
        }
      }

      if (!targetEmail) {
        res.status(400).json({ message: "email or idToken containing email is required for mock login" });
        return;
      }

      // Find or create the client
      let user = await User.findOne({ mail: targetEmail });
      if (!user) {
        user = new User({
          name: targetName,
          mail: targetEmail,
          phone: "N/A",
          role: "client",
          status: "Active",
        });
        await user.save();
      } else {
        if (user.role !== "client") {
          res.status(403).json({ message: "Access forbidden: Not registered as a client" });
          return;
        }
      }

      const token = jwt.sign({ id: user.id, role: "client" }, config.JWT_SECRET, { expiresIn: "7d" });
      const safeUser = user.toObject();
      res.status(200).json({ token, user: safeUser });
    } catch (error) {
      next(error);
    }
  }

  public async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        pickupLocationName, 
        dropoffLocationName, 
        pickupLocation, 
        dropoffLocation, 
        weight, 
        paymentmethod, 
        items, 
        totalAmount, 
        adminId 
      } = req.body;

      let parsedPickup = pickupLocation;
      if (typeof pickupLocation === "string") {
        try {
          parsedPickup = JSON.parse(pickupLocation);
        } catch {}
      }

      let parsedDropoff = dropoffLocation;
      if (typeof dropoffLocation === "string") {
        try {
          parsedDropoff = JSON.parse(dropoffLocation);
        } catch {}
      }

      // Ensure we have pickup location coordinates
      let finalPickup = { name: "", lat: 0, lng: 0 };
      if (parsedPickup && typeof parsedPickup === "object" && parsedPickup.name) {
        finalPickup = {
          name: parsedPickup.name,
          lat: Number(parsedPickup.lat) || 0,
          lng: Number(parsedPickup.lng) || 0,
        };
      } else if (pickupLocationName) {
        const coords = await geocodeAddress(pickupLocationName);
        finalPickup = {
          name: pickupLocationName,
          lat: coords.lat,
          lng: coords.lng,
        };
      } else {
        res.status(400).json({ message: "Pickup location details are required" });
        return;
      }

      // Ensure we have dropoff location coordinates
      let finalDropoff = { name: "", lat: 0, lng: 0 };
      if (parsedDropoff && typeof parsedDropoff === "object" && parsedDropoff.name) {
        finalDropoff = {
          name: parsedDropoff.name,
          lat: Number(parsedDropoff.lat) || 0,
          lng: Number(parsedDropoff.lng) || 0,
        };
      } else if (dropoffLocationName) {
        const coords = await geocodeAddress(dropoffLocationName);
        finalDropoff = {
          name: dropoffLocationName,
          lat: coords.lat,
          lng: coords.lng,
        };
      } else {
        res.status(400).json({ message: "Drop-off location details are required" });
        return;
      }

      // Find an administrator to auto-assign if not specified
      let assignedAdminId = adminId;
      if (!assignedAdminId) {
        const defaultAdmin = await Admin.findOne();
        if (defaultAdmin) {
          assignedAdminId = defaultAdmin.id;
        }
      }

      // Get uploaded files (if any)
      const images: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file: any) => {
          images.push(`/uploads/${file.filename}`);
        });
      } else if (req.file) {
        images.push(`/uploads/${req.file.filename}`);
      }

      const order = new Order({
        userId: req.user!.id,
        items: items || [],
        totalAmount: totalAmount || 0,
        paymentmethod: paymentmethod || "cash",
        pickupLocation: finalPickup,
        dropoffLocation: finalDropoff,
        weight: Number(weight) || 0,
        adminId: assignedAdminId,
        images,
        status: "pending",
      });

      await order.save();
      res.status(201).json({ message: "Order created successfully", order });
    } catch (error) {
      next(error);
    }
  }

  public async getOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await Order.find({ userId: req.user!.id }).populate("deliveryRiderId");
      res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  }

  public async uploadImages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
        res.status(400).json({ message: "No files uploaded" });
        return;
      }

      const filePaths: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file: any) => {
          filePaths.push(`/uploads/${file.filename}`);
        });
      } else if (req.file) {
        filePaths.push(`/uploads/${req.file.filename}`);
      }

      res.status(200).json({
        message: "Images uploaded successfully",
        filePaths,
      });
    } catch (error) {
      next(error);
    }
  }

  public async cancelOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await Order.findOne({ _id: id, userId: req.user!.id });
      if (!order) {
        res.status(404).json({ message: "Order not found or access denied" });
        return;
      }

      // Check if order is older than 24 hours
      const createdAtTime = new Date((order as any).createdAt).getTime();
      const elapsedMs = Date.now() - createdAtTime;
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      if (elapsedMs > twentyFourHoursMs) {
        res.status(400).json({ message: "Orders can only be cancelled within 24 hours of creation." });
        return;
      }

      if (order.status === "cancelled") {
        res.status(400).json({ message: "Order is already cancelled." });
        return;
      }

      order.status = "cancelled";
      await order.save();

      res.status(200).json({ message: "Order cancelled successfully", order });
    } catch (error) {
      next(error);
    }
  }
}

export default new ClientController();
