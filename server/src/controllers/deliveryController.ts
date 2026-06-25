import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { OAuth2Client } from "google-auth-library";
import { orderEvents } from "../utils/orderEvents.js";

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

  /**
   * Mock Google Login
   */
  public async loginGoogle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, name, idToken } = req.body;
      
      let targetEmail = email;
      let targetName = name || "Mock Google Rider";

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

      // Find or create the delivery rider
      let user = await User.findOne({ mail: targetEmail });
      if (!user) {
        user = new User({
          name: targetName,
          mail: targetEmail,
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

  /**
   * Real-time Assigned Jobs Stream (Server-Sent Events)
   */
  public async getAssignedJobs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const sendRiderJobs = async (type: string, changedOrder?: any) => {
        const jobs = await Order.find({ deliveryRiderId: req.user!.id }).populate("userId");
        res.write(`data: ${JSON.stringify({ type, changedOrder, jobs })}\n\n`);
      };

      await sendRiderJobs("initial");

      const handleOrderChange = async (event: { type: string; order?: any; orderId?: string }) => {
        if (event.order && String(event.order.deliveryRiderId) === String(req.user!.id)) {
          await sendRiderJobs(event.type, event.order);
        } else if (event.type === "delete") {
          await sendRiderJobs("delete", { _id: event.orderId });
        }
      };

      orderEvents.on("change", handleOrderChange);

      req.on("close", () => {
        orderEvents.off("change", handleOrderChange);
        res.end();
      });
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

      // Emit event
      orderEvents.emit("change", { type: "update", order });

      res.status(200).json({ message: "Job status updated successfully", order });
    } catch (error) {
      next(error);
    }
  }
}

export default new DeliveryController();
