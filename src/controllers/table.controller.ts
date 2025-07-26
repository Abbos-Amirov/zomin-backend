import TableService from "../models/Table.service";
import { T } from "../libs/types/common";
import { Request, Response } from "express";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { TableInput } from "../libs/types/table";

const tableService = new TableService();

const tableController: T = {};

tableController.getAllTables = async (req: Request, res: Response) => {
    try{
        console.log("getAllTables");
        const data = await tableService.getAllTables();

        res.json({tables: data});
    }catch(err){
        console.log("Error, getAllTables:", err);
        if(err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
    }
};

tableController.createNewTable = async (req: Request, res: Response) => {
    try{
        console.log("createNewTable");
        
        const input: TableInput = req.body;
        const result = await tableService.createNewTable(input);
        
        res.send(`<script> alert("Successful creation"); window.location.replace('/admin/table/all')</script>`);
    }catch(err){
        console.log("Error, createNewTable:", err);
        const message = err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
        res.send(`<script> alert("${message}"); window.location.replace('/admin/table/create')</script>`);
    }
};

tableController.updateChosenTable = async (req: Request, res: Response) => {
    try{
        console.log("updateChosenTable");
        const id = req.params.id;

        const result = await tableService.updateChosenTable(id, req.body);
        res.status(HttpCode.OK).json({data: result});
    }catch(err){
        console.log("Error, updateChosenTable:", err);
        if(err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
    }
};

export default tableController;