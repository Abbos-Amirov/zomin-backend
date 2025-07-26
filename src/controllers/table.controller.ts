import { T } from "../libs/types/common";
import { Request, Response } from "express";



const tableController: T = {};

tableController.getAllTables = async (req: Request, res: Response) => {
    try{
        console.log("getAllTables");
        res.send("Done");
    }catch(err){
        console.log("Error, getAllTables:", err);
        res.send(err);
    }
};

tableController.createNewTable = async (req: Request, res: Response) => {
    try{
        console.log("createNewTable");
        res.send("Done");
    }catch(err){
        console.log("Error, createNewTable:", err);
        res.send(err);
    }
};

tableController.updateChosenTable = async (req: Request, res: Response) => {
    try{
        console.log("updateChosenTable");
        res.send("Done");
    }catch(err){
        console.log("Error, updateChosenTable:", err);
        res.send(err);
    }
};

export default tableController;