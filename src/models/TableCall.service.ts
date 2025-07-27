import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { TableCall, TableCallInput, TableCallUpdateInput } from "../libs/types/tableCall";
import TableCallModel from "../schema/TableCall.model";

class TableCallService {
  private readonly tableCallModel;

  constructor(){
    this.tableCallModel = TableCallModel;
  };

  /** SPA */
  public async createNewTableCall(input: TableCallInput): Promise <TableCall>{
    try{
      return await this.tableCallModel.create(input)
    }catch(err){
      console.log("Error, model: createNewTableCall: ", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  };

  /** SSR */
  public async getAllCalls(): Promise <TableCall[]>{
    const data = await this.tableCallModel
    .find()
    .exec();
    if(!data) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        return data;
  };

  public async updateChosenCall(
    id: string,
    input: TableCallUpdateInput
  ): Promise <TableCall> {
    id = shapeIntoMongooseObjectId(id);
    const result = await this.tableCallModel
    .findByIdAndUpdate({_id: id}, input, { new: true })
    .exec();
    if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result;
  }



}

export default TableCallService;