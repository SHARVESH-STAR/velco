import express, { type Request, type Response } from "express";
import cors from "cors";

import { config } from "./config.js";
import { database } from "./db.js";
import { socketManager } from "./socket.js";

import { errorHandler } from "./middleware/errorHandler.js";
import { actionLogger } from "./middleware/actionLogger.js";

import adminRoute from "./routes/adminRoute.js";
import clientRoute from "./routes/clientRoute.js";
import deliveryRoute from "./routes/deliveryRoute.js";
import path from "path";
import os from "os";

const app = express();

app.use(
  cors({
    origin: config.frontendUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10kb" }));

app.use(actionLogger);

// Routes
app.get("/", (req: Request, res: Response) => {
  res.send("Server is running!");
});


app.use("/admin", adminRoute);
app.use("/client", clientRoute);
app.use("/delivery", deliveryRoute);
app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), config.uploadDir)),
);

// Global error handler — must be registered LAST
app.use(errorHandler);

// Connect to database
database.connect().catch((err) => {
  console.error("Failed to connect to database:", err);
});

// Export app for Vercel
export default app;

// Only listen if not running on Vercel serverless environment
if (!process.env.VERCEL) {
  const server = app.listen(config.PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server is up and running!`);
    console.log(`- Local:   http://localhost:${config.PORT}`);

    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          console.log(`- Network: http://${iface.address}:${config.PORT}`);
        }
      }
    }
    console.log(""); // Empty line for better readability
  });
  socketManager.initialize(server);
}
