import mongoose, { Schema } from "mongoose";
import { CallStatus, CallType } from "../libs/enums/tableCall.enum";

const tableCallSchema = new Schema(
    {
       callType: {
        type: String,
        enum: CallType,
        required: true,
       },

       callStatus: {
        type: String,
        enum: CallStatus,
        default: CallStatus.ACTIVE,
       },

       tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        required: true,
       },    
    },
    { timestamps: true }
);

export default mongoose.model('TableCall', tableCallSchema);
