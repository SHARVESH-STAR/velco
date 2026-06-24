import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { OAuth2Client } from "google-auth-library";

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

  public async loginGoogle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        res.status(400).json({ message: "idToken is required" });
        return;
      }

      const client = new OAuth2Client();
      const audiences = [
        config.googleWebClientId,
        config.googleIosClientId,
        config.googleAndroidClientId,
      ].filter(Boolean) as string[];

      let payload;
      try {
        const ticket = await client.verifyIdToken({
          idToken,
          audience: audiences.length > 0 ? audiences : undefined,
        });
        payload = ticket.getPayload();
      } catch (err: any) {
        if (!config.isProduction && audiences.length === 0) {
          console.warn("⚠️ Google Client IDs are not set in .env. Decoding token without signature verification.");
          const decoded = jwt.decode(idToken) as any;
          payload = decoded;
        } else {
          res.status(401).json({ message: "Invalid Google ID token signature", error: err.message });
          return;
        }
      }

      if (!payload || !payload.email) {
        res.status(400).json({ message: "Invalid token payload" });
        return;
      }

      // Find or create the client
      let user = await User.findOne({ mail: payload.email });
      if (!user) {
        user = new User({
          name: payload.name || "Client User",
          mail: payload.email,
          phone: "N/A", // Client will supply phone number later
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
      const { pickupAddress, dropoffAddress, paymentmethod, items, totalAmount } = req.body;
      
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
        pickupAddress,
        dropoffAddress,
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
}

export default new ClientController();
