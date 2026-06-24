import dotenv from "dotenv";

dotenv.config();

class Config {
  public PORT: number;
  public MONGODB_URI: string;
  public JWT_SECRET: string;
  public frontendUrl: string;
  public customerServiceNumber: string;
  public isProduction: boolean;
  public uploadDir: string;
  public googleWebClientId: string | undefined;
  public googleIosClientId: string | undefined;
  public googleAndroidClientId: string | undefined;

  constructor() {
    this.PORT = Number(process.env.PORT) || 3030;
    
    if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI");
    this.MONGODB_URI = process.env.MONGODB_URI;

    if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");
    this.JWT_SECRET = process.env.JWT_SECRET;

    if (!process.env.FRONTEND_URL) throw new Error("Missing FRONTEND_URL");
    this.frontendUrl = process.env.FRONTEND_URL;

    if (!process.env.CUSTOMER_SERVICE_NUMBER) throw new Error("Missing CUSTOMER_SERVICE_NUMBER");
    this.customerServiceNumber = process.env.CUSTOMER_SERVICE_NUMBER;

    this.isProduction = process.env.NODE_ENV === "production";
    
    this.uploadDir = process.env.UPLOAD_DIR || "uploads";

    this.googleWebClientId = process.env.GOOGLE_WEB_CLIENT_ID;
    this.googleIosClientId = process.env.GOOGLE_IOS_CLIENT_ID;
    this.googleAndroidClientId = process.env.GOOGLE_ANDROID_CLIENT_ID;
  }
}

export const config = new Config();
export type ConfigType = typeof config;
