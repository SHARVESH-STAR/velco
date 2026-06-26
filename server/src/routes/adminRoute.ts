import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";

import adminController from "../controllers/adminController.js";
import { authenticateAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// --- Public Admin Routes ---
router.post("/login", (req: Request, res: Response, next: NextFunction) =>
  adminController.loginAdmin(req, res, next),
);

// --- Authenticated Admin Routes ---
router.use(authenticateAdmin as RequestHandler);

router.get("/client", (req: Request, res: Response, next: NextFunction) =>
  adminController.getAllClients(req, res, next),
);

router.get("/clients", (req: Request, res: Response, next: NextFunction) =>
  adminController.getAllClients(req, res, next),
);

router.get("/riders", (req: Request, res: Response, next: NextFunction) =>
  adminController.getAllRiders(req, res, next),
);

router.get("/search", (req: Request, res: Response, next: NextFunction) =>
  adminController.search(req, res, next),
);

router.get("/orders", (req: Request, res: Response, next: NextFunction) =>
  adminController.viewOrders(req, res, next),
);

router.delete("/orders/:id", (req: Request, res: Response, next: NextFunction) =>
  adminController.deleteOrder(req, res, next),
);

router.put("/orders/:id/assign", (req: Request, res: Response, next: NextFunction) =>
  adminController.assignDelivery(req, res, next),
);

router.post("/delivery/assign", (req: Request, res: Response, next: NextFunction) =>
  adminController.assignDelivery(req, res, next),
);

export default router;
