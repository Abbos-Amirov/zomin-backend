import OrderService from "../models/Order.service";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { Request, Response } from "express";
import { OrderInquiry, OrderStatis, OrderUpdateInput } from "../libs/types/order";
import { OrderStatus, OrderType } from "../libs/enums/order.enum";
import { PaymentMethod } from "../libs/enums/order.enum";
import { ExtendedRequest, Member } from "../libs/types/member";
import { Table } from "../libs/types/table";

const orderService = new OrderService();

const orderController: T = {};

/** MEMBER */
orderController.createOrder = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("createOrder");
    const client: Member | Table = req.member?  req.member : req.table;
    const result = await orderService.createOrder(client, req.body);

    res.status(HttpCode.CREATED).json({ result });
  } catch (err) {
    console.log("Error, createOrder:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.getMyOrders = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("getMyOrders");
    const { page, limit, orderStatus } = req.query;
    const inquiry: OrderInquiry = {
      page: Number(page),
      limit: Number(limit),
      orderStatus: orderStatus as OrderStatus,
    };

    const result = await orderService.getMyOrders(req.member, inquiry);

    res.status(HttpCode.CREATED).json({ result });
  } catch (err) {
    console.log("Error, getMyOrders:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.updateOrder = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("updateOrder");
    const input: OrderUpdateInput = req.body;
    const result = await orderService.updateOrder(req.member, input);

    res.status(HttpCode.CREATED).json({ result });
  } catch (err) {
    console.log("Error, updateOrder:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** ADMIN */
orderController.getAllOrders = async (req: Request, res: Response) => {
  try {
    console.log("getAllOrders");
    const { page, limit, status, payStatus, search, type } = req.query;
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
console.log("id", id)
    const result = await orderService.updateChosenOrder(id, req.body);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, updateChosenOrder:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.getOrderStatis = async (req: Request, res: Response) => {
  try {
    console.log("getOrderStatis");
    const result: OrderStatis = await orderService.getStatis();

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getOrderStatis:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default orderController;
