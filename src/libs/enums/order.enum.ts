export enum OrderType {
  TABLE="TABLE",
  DELIVERY="DELIVERY",
  TAKEOUT="TAKEOUT",
}

export enum OrderSource {
  QR = "QR",
  LINK = "LINK",
  /** Stolsiz link orqali olib ketish buyurtmasi */
  LINK_TAKEOUT = "LINK_TAKEOUT",
}

export enum OrderStatus {
  PAUSE="PAUSE",
  PENDING="PENDING",
  PROCESS="PROCESS",
  SERVED = "SERVED",
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