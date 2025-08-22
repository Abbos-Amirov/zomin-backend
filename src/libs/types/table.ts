import { ObjectId } from "mongoose";
import { TableStatus } from "../enums/table.enum";
import { TableCall } from "./tableCall";

export interface Table {
    _id: ObjectId;
    tableNumber: string;
    qrToken: string;
    tableStatus: TableStatus;
    tableCall: TableCall;
    createdAt: Date;
    updatedAt: Date;
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
    tableStatus: TableStatus;
    
};

export interface TableInquiry {
    page: number;
    limit: number;
    status?: string;
    search?: string;
}