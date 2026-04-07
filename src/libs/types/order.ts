import { ObjectId } from "mongoose";
import {
  OrderSource,
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
  restaurantId?: ObjectId | null;
  orderType: OrderType;
  orderStatus: OrderStatus;
  orderTotal: number;
  deliveryFee?: number;
  orderDelivery?: number;
  tableId: ObjectId | null;
  memberId: ObjectId | null;
  customerName?: string;
  customerPhone?: string;
  arrivalInMinutes?: number;
  tableNumber?: string;
  memberNick?: string;
  orderNote: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  orderSource?: OrderSource;
  createdAt: Date;
  updatedAt: Date;
  /** from aggregations */
  orderItems?: OrderItem[];
  productData?: Product[];
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
  orderDelivery: number;
   restaurantId?: ObjectId | null;
  tableId?: ObjectId;
  memberId?: ObjectId;
  customerName?: string;
  customerPhone?: string;
  arrivalInMinutes?: number;
  orderSource?: OrderSource;
  orderNote?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
}

export interface LinkOrderItemInput {
  productId: string;
  quantity: number;
}

export interface LinkOrderInput {
  tableId: string;
  customerName: string;
  customerPhone: string;
  arrivalInMinutes: number;
  orderItems: LinkOrderItemInput[];
  /** Shu yerda stolda yeyish (`TABLE`) yoki olib ketish (`TAKEOUT`). Yuborilmasa `TABLE`. */
  orderType?: OrderType;
}

/** Stol raqami/tablesiz, faqat olib ketish — `/order/link-takeout` */
export interface LinkTakeoutOrderInput {
  customerName: string;
  customerPhone: string;
  arrivalInMinutes: number;
  orderItems: LinkOrderItemInput[];
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
