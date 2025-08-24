import {ObjectId} from "mongoose";
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from "../enums/order.enum";
import { Product } from "./product";

export interface OrderItem{
  _id: ObjectId;
  itemQuantity:number;
  itemPrice: number;
  orderId: ObjectId;
  productId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order{
  _id: ObjectId;
  orderType: OrderType;
  orderStatus: OrderStatus;
  orderTotal: number;
  deliveryFee: number;
  tableId: ObjectId | null;
  memberId: ObjectId | null;
  orderNote: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
  /** from aggregations */
  orderItems: OrderItem[];
  productData: Product[];
}

export interface OrderItemInput {
  itemQuantity: number;
  itemPrice: number;
  productId: ObjectId;
  orderId?: ObjectId;
}


export interface OrderUpdateInput{
  orderId: ObjectId;
  orderStatus?: OrderStatus;
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
  orderStatus?: OrderStatus;
}

export interface OrderInput{
  orderType: OrderType;
  orderStatus?: OrderStatus;
  orderTotal: number;
  deliveryFee: number;
  tableId?: ObjectId;
  memberId?: ObjectId;
  orderNote?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
}
