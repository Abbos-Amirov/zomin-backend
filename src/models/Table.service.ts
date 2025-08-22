import { T } from "../libs/types/common";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Table, TableInput, TableInquiry, TableUpdateInput } from "../libs/types/table";
import TableModel from "../schema/Table.model";
import { MemberType } from "../libs/enums/member.enum";

class TableService {
  private readonly tableModel;

  constructor() {
    this.tableModel = TableModel;
  }

  public async getAllTables(inquiry: TableInquiry): Promise<Table[]> {
    const match: T = { memberType: MemberType.USER };

    if (inquiry.status) match.memberStatus = inquiry.status;

    if (inquiry.search) {
      (match.tableNumber = { $regex: new RegExp(inquiry.search, "i") });}
        
    const result = await this.tableModel.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: (inquiry.page - 1) * inquiry.limit },
        { $limit: inquiry.limit },
      ])
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async createNewTable(input: TableInput): Promise<Table> {
    input.qrToken = Math.random().toString(36).substring(2, 10);
    try {
      const result = await this.tableModel.create(input);
      return result.toJSON();
    } catch (err) {
      console.log("Error, model: createNewTable: ", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async updateChosenTable(
    id: string,
    input: TableUpdateInput
  ): Promise<Table> {
    id = shapeIntoMongooseObjectId(id);
    const result = await this.tableModel
      .findByIdAndUpdate({ _id: id }, input, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result;
  }
}

export default TableService;
