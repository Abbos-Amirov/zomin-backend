import mongoose, { Schema } from "mongoose";
import { TableStatus } from "../libs/enums/table.enum";

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
        },

        tableStatus: {
            type: String,
            enum: TableStatus,
            default: TableStatus.AVAILABLE,
        },  
    },
    { timestamps: true }
);

export default mongoose.model('Table', tableSchema);
