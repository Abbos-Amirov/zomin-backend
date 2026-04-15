import { ObjectId } from "mongoose";
import { TableStatus } from "../enums/table.enum";
import { TableCall } from "../enums/tableCall.enum";

export interface Table {
  _id: ObjectId;
  tableNumber: string;
  qrToken: string;
  tableStatus: TableStatus;
  /** Stol turi — ixtiyoriy matn (masalan TABLE, ROOM, VIP) */
  tableKind?: string;
  tableCall: TableCall;
  activeIdentifier: string;
  createdAt: Date;
  updatedAt: Date;
  /** GET /table/all + retrieveAuth: bandlik shu a’zoning buyurtmasi bilan bog‘liqmi */
  occupiedByMe?: boolean;
  /** Joriy a’zo (cookie) uchun stolni qayta tanlash / yangi link buyurtma */
  selectableForCurrentMember?: boolean;
  /** `selectableForCurrentMember` bilan bir xil qiymat (frontend nomi) */
  selectableByCurrentMember?: boolean;
}

export interface TableInput {
  tableNumber: string;
  qrToken?: string;
  tableStatus?: TableStatus;
  tableKind?: string;
}

export interface TableUpdateInput {
  _id: ObjectId;
  tableNumber?: string;
  qrToken?: string;
  tableStatus?: TableStatus;
  tableCall?: TableCall;
  activeIdentifier?: string | null;
}

export interface TableInquiry {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  /** tableKind bo‘yicha filtr (ixtiyoriy string) */
  kind?: string;
}
