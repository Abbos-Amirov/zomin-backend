import mongoose, { Schema } from "mongoose";
import {
  OrderSource,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
} from "../libs/enums/order.enum";

const orderSchema = new Schema(
    {
      restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
      },

      orderType: {
        type: String,
        enum: OrderType,
        required: true,
      },

      orderStatus: {
        type: String,
        enum: OrderStatus,
        default: OrderStatus.PAUSE,
      },

      orderTotal: {
        type: Number,
        required: true,
      },

      orderDelivery: {
        type: Number,
        required: true,
      },

      tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
      },

      customerName: {
        type: String,
      },

      customerPhone: {
        type: String,
      },

      arrivalInMinutes: {
        type: Number,
      },

      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
      },

      orderNote: {
        type: String,
      },

      paymentStatus: {
        type: String,
        enum: PaymentStatus,
        default: PaymentStatus.UNPAID,
      },

      paymentMethod: {
        type: String,
        enum: PaymentMethod,
        default: PaymentMethod.CARD, //TODO: 
      },

      orderSource: {
        type: String,
        enum: OrderSource,
        default: OrderSource.QR,
      },
    },
    { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
