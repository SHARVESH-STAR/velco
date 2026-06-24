import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";

import clientController from "../controllers/clientController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// --- Public Client Routes ---
router.post(
  "/login",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.loginClient(req, res, next),
);

router.post(
  "/login/google",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.loginGoogle(req, res, next),
);

// Protect client endpoints
router.use(authenticate as RequestHandler);

// Create order / delivery request (with optional image uploads)
router.post(
  "/orders",
  upload.array("photos", 5) as unknown as RequestHandler,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.createOrder(req, res, next),
);

// Get client's order history
router.get(
  "/orders",
  (req: Request, res: Response, next: NextFunction) =>
    clientController.getOrders(req, res, next),
);

// Upload package images
router.post(
  "/upload",
  upload.single("photo") as unknown as RequestHandler,
  (req: Request, res: Response, next: NextFunction) =>
    clientController.uploadImages(req, res, next),
);

export default router;
