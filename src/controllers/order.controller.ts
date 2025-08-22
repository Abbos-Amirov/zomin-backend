import OrderService from "../models/Order.service";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { Request, Response } from "express";
import { OrderInquiry } from "../libs/types/order";
import { OrderStatus, OrderType } from "../libs/enums/order.enum";
import { PaymentMethod } from "../libs/enums/order.enum";

const orderService = new OrderService();

const orderController: T = {};

/** MEMBER */

/** ADMIN */
orderController.getAllOrders = async (req: Request, res: Response) => {
  try {
    console.log("getAllOrders");
    const { page, limit, status, payStatus, search, type } = req.body;
    console.log(req.query)
    const inquiry: OrderInquiry = {
      page: Number(page),
      limit: Number(limit),
    };
    if (search) inquiry.search = String(search);
    if (status) inquiry.status = status as OrderStatus;
    if (payStatus) inquiry.payStatus = payStatus as PaymentMethod;
    if (type) inquiry.type = type as OrderType;

    const data = await orderService.getAllOrders(inquiry);
    res.status(HttpCode.OK).json(data);
  } catch (err) {
    console.log("Error, getAllOrders:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.updateChosenOrder = async (req: Request, res: Response) => {
  try {
    console.log("updateChosenOrder");
    const id = req.params.id;

    const result = await orderService.updateChosenOrder(id, req.body);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, updateChosenOrder:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default orderController;
