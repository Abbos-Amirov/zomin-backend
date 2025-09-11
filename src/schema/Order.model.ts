import mongoose, { Schema } from "mongoose";
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
    },
    { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
