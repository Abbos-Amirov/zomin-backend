import { ObjectId } from "mongoose";
import { NotifStatus, NotifType } from "../enums/notif.enum";

export interface Notif {
  _id: ObjectId;
  notifType: NotifType;
  notifStatus: NotifStatus;
  orderId: ObjectId | null;
  tableId: ObjectId | null;
  title: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotifInput{
  notifType: string;
  notifStatus?: NotifStatus;
  orderId?: ObjectId | null;
  tableId?: ObjectId | null;
  title: string;
  message: string;
}
