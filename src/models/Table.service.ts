import { ObjectId, type PipelineStage } from "mongoose";
import { T } from "../libs/types/common";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import {
  Table,
  TableInput,
  TableInquiry,
  TableUpdateInput,
} from "../libs/types/table";
import TableModel from "../schema/Table.model";
import { MemberType } from "../libs/enums/member.enum";
import { TableStatus } from "../libs/enums/table.enum";
import { TableCall } from "../libs/enums/tableCall.enum";
import NotifService from "./Notif.service";
import { NotifStatus, NotifType } from "../libs/enums/notif.enum";
import { MessageNotif, Title } from "../libs/notif";

class TableService {
  private readonly tableModel;
  private readonly notifService;

  constructor() {
    this.tableModel = TableModel;
    this.notifService = new NotifService();
  }

  public async getAllTables(
    inquiry: TableInquiry,
    options?: { omitSensitive?: boolean }
  ): Promise<Table[]> {
    const match: T = {};

    if (inquiry.status) match.tableStatus = inquiry.status;

    if (inquiry.kind) {
      const k = String(inquiry.kind).trim();
      if (k === "TABLE") {
        match.$or = [
          { tableKind: "TABLE" },
          { tableKind: { $exists: false } },
        ];
      } else {
        match.tableKind = k;
      }
    }

    if (inquiry.search) {
      match.tableNumber = { $regex: new RegExp(inquiry.search, "i") };
    }

    const page = Math.max(1, Number(inquiry.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(inquiry.limit) || 50));

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $addFields: {
          tableKind: { $ifNull: ["$tableKind", "TABLE"] },
        },
      },
      { $sort: { createdAt: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];
    if (options?.omitSensitive) {
      pipeline.push({
        $project: { qrToken: 0, activeIdentifier: 0 },
      });
    }

    const result = await this.tableModel.aggregate(pipeline).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async createNewTable(input: TableInput): Promise<Table> {
    input.qrToken = Math.random().toString(36).substring(2, 10);
    const raw = input.tableKind;
    if (raw == null || String(raw).trim() === "") {
      input.tableKind = "TABLE";
    } else {
      input.tableKind = String(raw).trim();
    }
    try {
      const result = await this.tableModel.create(input);
      return result;
    } catch (err) {
      console.log("Error, model: createNewTable: ", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async updateChosenTable(
    id: string,
    input: TableUpdateInput
  ): Promise<Table> {
    const tableId = shapeIntoMongooseObjectId(id);
    if (input.tableStatus)
      // every new clients new activeIdentifier
      input.activeIdentifier = null;
    if (input.tableCall)
      await this.notifService.updateCallNotif(tableId, {
        message: MessageNotif.TABLE_CALL_UPDATE,
        notifStatus: NotifStatus.READ,
      });
    console.log("input: updateChosenTable:", input);
    const result = await this.tableModel
      .findByIdAndUpdate({ _id: id }, input, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result;
  }

  public async deleteChosenTable(id: string): Promise<boolean> {
    try {
      id = shapeIntoMongooseObjectId(id);
      const result = await this.tableModel.findByIdAndDelete(id);
      return result ? true : false;
    } catch (err) {
      console.log("Error, model: deleteChosenTable: ", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.SOMETHING_WENT_WRONG);
    }
  }

  public async qrLanding(qrToken: string): Promise<Table> {
    const activeIdentifier = Math.random().toString(36).substring(2, 10);
    const result = await this.tableModel
      .findOneAndUpdate(
        { qrToken: qrToken },
        {
          activeIdentifier: activeIdentifier,
          tableStatus: TableStatus.OCCUPIED,
        },
        { new: true }
      )
      .lean()
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NOT_TABLE);
    return result;
  }

  public async clickTableCall(tableId: string): Promise<Table> {
    const id = shapeIntoMongooseObjectId(tableId);
    const result = await this.tableModel
      .findByIdAndUpdate(
        id,
        {
          tableCall: TableCall.ACTIVE,
        },
        { new: true }
      )
      .exec();
    if (result) {
      await this.notifService.createNotif({
        notifType: NotifType.CALL,
        tableId: id,
        orderId: null,
        title: Title.TABLE_CALL + `${result.tableNumber}`,
        message: MessageNotif.TABLE_CALL,
      });
    } else {
      throw new Errors(HttpCode.NOT_FOUND, Message.NOT_TABLE);
    }
    return result;
  }

  public async verifyActivite(activeIdentifier: string): Promise<Table> {
    const result = this.tableModel
      .findOne({ activeIdentifier: activeIdentifier })
      .exec();
    return result;
  }
}

export default TableService;
