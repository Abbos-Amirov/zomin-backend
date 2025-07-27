export enum OrderType {
  TABLE="TABLE",
  DELIVERY="DELIVERY",
  TAKEOUT="TAKEOUT",
}

export enum OrderStatus {
  PENDING="PENDING",
  PROGRESS="PROGRESS",
  READY="READY",
  COMPLETED="COMPLETED",
  CANCELLED="CANCELLED",
}

export enum PaymentStatus {
  UNPAID="UNPAID",
  PAID="PAID",
  REFUNDED="REFUNDED"
}

export enum PaymentMethod {
  CASH="CASH",
  CARD="CARD",
  ONLINE="ONLINE",
}