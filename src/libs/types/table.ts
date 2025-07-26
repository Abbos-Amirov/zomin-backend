import { ObjectId } from "mongoose";
import { TableStatus } from "../enums/table.enum";

export interface Table {
    _id: ObjectId;
    tableNumber: string;
    qrToken: string;
    tableStatus: TableStatus;
};

export interface TableInput {
    tableNumber: string;
    qrToken?: string;
    tableStatus?: TableStatus;
};

export interface TableUpdateInput {
    _id: ObjectId;
    tableNumber?: string;
    qrToken?: string;
    tableStatus?: TableStatus;
};