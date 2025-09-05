import { ObjectId } from "mongoose";
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "../enums/order.enum";
import { Product } from "./product";
import { ProductCollection } from "../enums/product.enums";

export interface OrderItem {
  _id: ObjectId;
  itemQuantity: number;
  itemPrice: number;
  orderId: ObjectId;
  productId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
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

export interface OrderUpdateInput {
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
  payStatus?: PaymentStatus;
  payMeth?: PaymentMethod;
  search?: string;
  orderStatus?: OrderStatus;
}

export interface OrderInput {
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

export interface OrderStatis {
  totalOrder: number;
  pendingOrder: number;
  complatedOrder: number;
  ordersByCategory: OrdersByCategory[];
  topSellingItems: TopSellingItems[];
  todayIncomeAndAOV: TodayIncomeAndAOV[];
}

export interface OrdersByCategory {
  collection: string;
  totalQuantity: number;
  revenue: number;
  orders: number;
}

export interface TopSellingItems{
  productId: string;
  productName: string;
  totalQuantity:number;
}

export interface TodayIncomeAndAOV {
  totalSum: number;
  deliverySum: number;
  aovGross: number;
}
