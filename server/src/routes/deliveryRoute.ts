import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";

import deliveryController from "../controllers/deliveryController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// --- Public Delivery Routes ---
router.post(
  "/login",
  (req: Request, res: Response, next: NextFunction) =>
    deliveryController.loginDelivery(req, res, next),
);

router.post(
  "/login/google",
  (req: Request, res: Response, next: NextFunction) =>
    deliveryController.loginGoogle(req, res, next),
);

// Protect delivery endpoints
router.use(authenticate as RequestHandler);

// Get all delivery jobs assigned to this rider
router.get(
  "/jobs",
  (req: Request, res: Response, next: NextFunction) =>
    deliveryController.getAssignedJobs(req, res, next),
);

// Update status of a specific delivery job
router.put(
  "/jobs/:id/status",
  upload.array("photos", 5) as unknown as RequestHandler,
  (req: Request, res: Response, next: NextFunction) =>
    deliveryController.updateJobStatus(req, res, next),
);

export default router;
