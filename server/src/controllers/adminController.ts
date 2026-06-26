import type { Request, Response, NextFunction } from "express";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { socketManager } from "../socket.js";

class AdminController {
  public async loginAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mail, password } = req.body;
      const admin = await Admin.findOne({ mail }).select("+password");
      if (!admin) {
        res.status(404).json({ message: "Admin not found" });
        return;
      }
      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      const token = jwt.sign({ id: admin.id, role: "Admin" }, config.JWT_SECRET, { expiresIn: "1d" });
      const { password: _pw, ...safeAdmin } = admin.toObject();
      res.status(200).json({ token, admin: safeAdmin });
    } catch (error) {
      next(error);
    }
  }

  public async registerAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, mail, password } = req.body;
      const admin = new Admin({ name, mail, password });
      await admin.save();
      const token = jwt.sign({ id: admin.id, role: "Admin" }, config.JWT_SECRET, { expiresIn: "1d" });
      const { password: _pw, ...safeAdmin } = admin.toObject();
      res.status(201).json({ token, admin: safeAdmin });
    } catch (error) {
      next(error);
    }
  }

  public async getAllClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await User.find({ role: "client" });
      res.status(200).json(clients);
    } catch (error) {
      next(error);
    }
  }

  public async getAllRiders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const riders = await User.find({ role: "delivery" });
      res.status(200).json(riders);
    } catch (error) {
      next(error);
    }
  }

  public async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.status(400).json({ message: "Search query 'q' is required" });
        return;
      }
      const regex = new RegExp(query, "i");
      const clients = await User.find({
        role: "client",
        $or: [{ name: regex }, { mail: regex }, { phone: regex }],
      });
      res.status(200).json(clients);
    } catch (error) {
      next(error);
    }
  }

  public async viewOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await Order.find().populate("userId").populate("deliveryRiderId");
      res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  }

  public async deleteOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await Order.findByIdAndDelete(id);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }
      res.status(200).json({ message: "Order deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  public async assignDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orderId = req.params.id || req.body.orderId;
      const { deliveryRiderId } = req.body;

      if (!orderId) {
        res.status(400).json({ message: "orderId is required" });
        return;
      }
      if (!deliveryRiderId) {
        res.status(400).json({ message: "deliveryRiderId is required" });
        return;
      }
      const rider = await User.findOne({ _id: deliveryRiderId, role: "delivery" });
      if (!rider) {
        res.status(404).json({ message: "Delivery rider not found or invalid role" });
        return;
      }
      const order = await Order.findByIdAndUpdate(
        orderId,
        { deliveryRiderId, status: "assigned" },
        { new: true }
      ).populate("userId");
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }
      
      // Notify rider in real-time via WebSocket
      socketManager.sendToRider(deliveryRiderId, {
        type: "new_order",
        order
      });

      res.status(200).json({ message: "Delivery assigned successfully", order });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
