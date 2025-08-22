import { ObjectId } from "mongoose";
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "../enums/order.enum";

export interface Order {
  _id: ObjectId;
  orderType: OrderType;
  orderStatus: OrderStatus;
  orderTotal: number;
  deliveryFee: number;
  tableId: ObjectId;
  memberId: ObjectId;
  orderNote?: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
}

export interface OrderInput {
  orderType?: OrderType;
  orderStatus?: OrderStatus;
  orderTotal?: number;
  deliveryFee?: number;
  tableId?: ObjectId;
  memberId?: ObjectId;
  orderNote?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod: PaymentMethod;
}

export interface OrderUpdateInput {
  _id: ObjectId;
  orderType?: OrderType;
  orderStatus?: OrderStatus;
  orderTotal?: number;
  deliveryFee?: number;
  tableId?: ObjectId;
  memberId?: ObjectId;
  orderNote?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
}

export interface OrderInquiry {
  page: number;
  limit: number;
  type?: OrderType;
  status?: OrderStatus;
  payStatus?: PaymentMethod;
  search?: string;
}
