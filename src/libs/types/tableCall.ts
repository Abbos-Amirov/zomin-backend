import { ObjectId } from "mongoose";
import { CallStatus, CallType } from "../enums/tableCall.enum";
import mongoose from "mongoose";


/** ADMIN */
export interface TableCall {
  _id: ObjectId;
  callType: CallType;
  callStatus: CallStatus;
  tableId: mongoose.Schema.Types.ObjectId;
};

export interface TableCallUpdateInput {
  _id: ObjectId;
  callType?: CallType;
  callStatus?: CallStatus;
};

/** USER */
export interface TableCallInput {
  callType: CallType;
  callStatus?: CallStatus;
  tableId: ObjectId;
}