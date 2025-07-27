import OrderService from "../models/Order.service";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { Request, Response } from "express";
import { OrderInput } from "../libs/types/order";

const orderService = new OrderService();

const orderController: T = {};

/** SPA */

/** SSR */

orderController.getAllOrders = async (req: Request, res: Response) => {
  try{
    console.log("getAllOrders");
    
    const data = await orderService.getAllOrders();
    res.json({orders: data});
  }catch(err){
    console.log("Error, getAllOrders:", err);
    if(err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.createNewOrder = async (req: Request, res: Response) => {
  try{
    console.log("createNewOrder");
    
    const data: OrderInput = req.body;
    console.log(data)
    
    const result = await orderService.createNewOrder(data);

    res.send(`<script> alert("Successful creation")</script>`);
  }catch(err){
    console.log("Error, createNewProduct:", err);
    const message = err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(`<script> alert("${message}")</script>`);
  }
};

orderController.updateChosenOrder = async (req: Request, res: Response) => {
  try{
    console.log("updateChosenOrder");
    const id = req.params.id;

    const result = await orderService.updateChosenOrder(id, req.body);

    res.status(HttpCode.OK).json({data: result});
  }catch(err){
    console.log("Error, updateChosenOrder:", err);
    if(err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default orderController;