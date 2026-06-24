import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { OAuth2Client } from "google-auth-library";

class DeliveryController {
  public async loginDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mail, password } = req.body;
      const user = await User.findOne({ mail }).select("+password");
      if (!user) {
        res.status(404).json({ message: "Delivery rider not found" });
        return;
      }
      if (user.role !== "delivery") {
        res.status(403).json({ message: "Access forbidden: Not a delivery rider" });
        return;
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      const token = jwt.sign({ id: user.id, role: "delivery" }, config.JWT_SECRET, { expiresIn: "1d" });
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

      // Find or create the delivery rider
      let user = await User.findOne({ mail: payload.email });
      if (!user) {
        user = new User({
          name: payload.name || "Delivery Rider",
          mail: payload.email,
          phone: "N/A",
          role: "delivery",
          status: "Active",
        });
        await user.save();
      } else {
        if (user.role !== "delivery") {
          res.status(403).json({ message: "Access forbidden: Not registered as a delivery rider" });
          return;
        }
      }

      const token = jwt.sign({ id: user.id, role: "delivery" }, config.JWT_SECRET, { expiresIn: "7d" });
      const safeUser = user.toObject();
      res.status(200).json({ token, user: safeUser });
    } catch (error) {
      next(error);
    }
  }

  public async getAssignedJobs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobs = await Order.find({ deliveryRiderId: req.user!.id }).populate("userId");
      res.status(200).json(jobs);
    } catch (error) {
      next(error);
    }
  }

  public async updateJobStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; // order id
      const { status } = req.body; // pending, assigned, completed, cancelled, etc.

      if (!status) {
        res.status(400).json({ message: "Status is required" });
        return;
      }

      // Check if order belongs to this delivery rider
      const order = await Order.findOne({ _id: id, deliveryRiderId: req.user!.id });
      if (!order) {
        res.status(404).json({ message: "Assigned job not found for this rider" });
        return;
      }

      order.status = status;
      await order.save();

      res.status(200).json({ message: "Job status updated successfully", order });
    } catch (error) {
      next(error);
    }
  }
}

export default new DeliveryController();
