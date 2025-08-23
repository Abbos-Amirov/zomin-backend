import mongoose, { Schema } from "mongoose";
import { NotifStatus, NotifType } from "../libs/enums/notif.enum";

const notificationSchema = new Schema(
  {
    notifType: {
      type: String,
      enum: NotifType,
      required: true,
    },

    notifStatus: {
      type: String,
      enum: NotifStatus,
      default: NotifStatus.PENDING,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
