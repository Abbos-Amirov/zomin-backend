import mongoose, { Schema, Types } from "mongoose";
import { OrderType, PaymentMethod, PaymentStatus } from "../libs/enums/order.enum";
import { OrderStatus } from "../libs/enums/order.enum";

const orderSchema = new Schema(
    {
      orderType: {
        type: String,
        enum: OrderType,
        required: true,
      },

      orderStatus: {
        type: String,
        enum: OrderStatus,
        default: OrderStatus.PENDING,
      },

      orderTotal: {
        type: Number,
        required: true,
      },

      deliveryFee: {
        type: Number,
        required: true,
      },

      tableId: {
        type: Types.ObjectId,
        ref: 'Table',
      },

      memberId: {
        type: Types.ObjectId,
        ref: 'Member',
      },

      orderNote: {
        type: String,
      },

      paymentStatus: {
        type: String,
        enum: PaymentStatus,
        required: true,
      },

      paymentMethod: {
        type: String,
        enum: PaymentMethod,
        required: true,
      },
    },
    { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
