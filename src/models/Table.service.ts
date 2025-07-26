import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Table, TableInput, TableUpdateInput } from "../libs/types/table";
import TableModel from "../schema/Table.model";

class TableService {
    private readonly tableModel;

    constructor(){
        this.tableModel = TableModel;
    };

    public async getAllTables(): Promise <Table[]> {
        const result = await this.tableModel
        .find()
        .exec();
        if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        return result;
    };

    public async createNewTable(input: TableInput): Promise <Table>{
        input.qrToken = Math.random().toString(36).substring(2, 10); 
        try{
            return await this.tableModel.create(input);
        }catch(err){
            console.log("Error, model: createNewTable: ", err);
            throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
        }
    };

    public async updateChosenTable(
        id: string, 
        input: TableUpdateInput
    ): Promise <Table>{
        id = shapeIntoMongooseObjectId(id);
        const result = await this.tableModel
        .findByIdAndUpdate({_id: id}, input, {new: true})
        .exec();
        if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
        return result;
    }
};

export default TableService;