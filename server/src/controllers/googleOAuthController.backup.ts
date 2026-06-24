// ============================================================================
// BACKUP: Google OAuth Verification Logic
// Restore these methods to clientController.ts and deliveryController.ts
// once you have obtained and configured your Google Client IDs in .env.
// ============================================================================

import type { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import User from "../models/User.js";

/**
 * BACKUP: Client Google OAuth Verify and Login
 */
export async function loginGoogleClientBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      res.status(401).json({ message: "Invalid Google ID token signature", error: err.message });
      return;
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

/**
 * BACKUP: Delivery Rider Google OAuth Verify and Login
 */
export async function loginGoogleDeliveryBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      res.status(401).json({ message: "Invalid Google ID token signature", error: err.message });
      return;
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
