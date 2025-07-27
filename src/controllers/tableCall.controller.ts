import { T } from "../libs/types/common";
import { Request, Response } from "express";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { TableCallInput } from "../libs/types/tableCall";
import TableCallService from "../models/TableCall.service";

const tableCallService = new TableCallService();

const tableCallController: T = {};

/** ADMIN */
tableCallController.getAllCalls = async (req: Request, res: Response) => {
  try{
    console.log("getAllCalls");
    const data = await tableCallService.getAllCalls();

    res.json({tableCall: data});
  } catch(err){
    console.log("Error, getAllProducts:", err);
        if(err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
  }
};

tableCallController.updateChosenCall = async (req: Request, res: Response) => {
  try{
    console.log("updateChosenCall");
    const id = req.params.id;
    
    const result = await tableCallService.updateChosenCall(id, req.body);
    res.status(HttpCode.OK).json({data: result});
  } catch(err){
    console.log("Error, updateChosenCall:", err);
    if(err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** USER */
tableCallController.createNewTableCall = async (req: Request, res: Response) => {
  try{
    console.log("createTableCall");
    const data: TableCallInput = req.body;
    console.log(data)
    const result = await tableCallService.createNewTableCall(data);

    res.json({data: result});
  } catch(err){
    console.log("Error, createNewTableCall:", err);
        const message = err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
        res.send(`<script> alert("${message}")</script>`);
  }
};

export default tableCallController;