import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
}

export interface ILocation {
  name: string;
  lat: number;
  lng: number;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  paymentmethod: string;
  status: string;
  deliveryRiderId?: mongoose.Types.ObjectId;
  images?: string[];
  pickupLocation: ILocation;
  dropoffLocation: ILocation;
  weight: number;
  adminId?: mongoose.Types.ObjectId;
}

const locationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const orderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
});

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    paymentmethod: {
      type: String,
      required: true,
      enum: ["cash", "upi", "card"],
      default: "cash",
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "assigned", "in_transit", "completed", "cancelled"],
      default: "pending",
    },
    deliveryRiderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    images: {
      type: [String],
      default: [],
    },
    pickupLocation: {
      type: locationSchema,
      required: true,
    },
    dropoffLocation: {
      type: locationSchema,
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      default: 0,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true },
);

export default mongoose.model<IOrder>("Order", orderSchema);
