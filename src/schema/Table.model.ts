import mongoose, { Schema } from "mongoose";
import { TableStatus } from "../libs/enums/table.enum";
import { TableCall } from "../libs/enums/tableCall.enum";

const tableSchema = new Schema(
  {
    tableNumber: {
      type: String,
      unique: true,
      required: true,
    },

    qrToken: {
      type: String,
      unique: true,
      required: true,
    },

    tableStatus: {
      type: String,
      enum: TableStatus,
      default: TableStatus.CLEANING,
    },

    tableCall: {
      type: String,
      enum: TableCall,
      default: TableCall.PAUSE,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Table", tableSchema);
