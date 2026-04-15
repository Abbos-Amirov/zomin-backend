import OrderService from "../models/Order.service";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { getIo } from "../server";
import {
  OrderInquiry,
  OrderStatis,
  OrderUpdateInput,
  LinkOrderInput,
  LinkTakeoutOrderInput,
} from "../libs/types/order";
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
} from "../libs/enums/order.enum";
import { PaymentMethod } from "../libs/enums/order.enum";
import { ExtendedRequest, Member } from "../libs/types/member";
import { Table } from "../libs/types/table";

const orderService = new OrderService();

const orderController: T = {};

/** MEMBER */
orderController.createOrder = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("createOrder");
    const client: Member | Table = req.member ? req.member : req.table;
    
    if (!client || !client._id) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    }
    
    const result = await orderService.createOrder(client, req.body);

    try {
      const io = getIo();
      io.to("admins").emit("newNotification", {
        type: "ORDER",
        message: req.member
          ? `New order from User: ${req.member.memberNick}`
          : `New order from Table: ${req.table.tableNumber}`,
        tableId: req.table?._id ?? null,
        tableNumber: req.table?.tableNumber ?? null,
        read: false,
      });
      const fullOrder = await orderService.getOrderByIdWithDetails(String(result._id));
      if (fullOrder) io.to("admins").emit("orderCreated", fullOrder);
    } catch (ioErr) {
      console.log("Socket emit failed:", ioErr);
    }

    res.status(HttpCode.CREATED).json(result);
  } catch (err) {
    console.log("Error, createOrder:", err);
    console.log("Error details:", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      client: req.member ? 'member' : req.table ? 'table' : 'none'
    });
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** LINK ORDER — ixtiyoriy cookie (retrieveAuth); band stolni o‘z buyurtmasi bilan qayta ishlatish. */
orderController.createLinkOrder = async (
  req: ExtendedRequest,
  res: Response
) => {
  try {
    console.log("createLinkOrder");
    const payload = req.body as LinkOrderInput;
    const result = await orderService.createLinkOrder(
      payload,
      req.member ?? null
    );
    res.status(HttpCode.CREATED).json({
      success: true,
      message: "Order created successfully",
      data: result,
    });
  } catch (err) {
    console.log("Error, createLinkOrder:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** Stolsiz olib ketish buyurtmasi (link /order/link ga o‘xshash, faqat TAKEOUT) */
orderController.createLinkTakeoutOrder = async (req: Request, res: Response) => {
  try {
    console.log("createLinkTakeoutOrder");
    const payload = req.body as LinkTakeoutOrderInput;
    const result = await orderService.createLinkTakeoutOrder(payload);
    res.status(HttpCode.CREATED).json({
      success: true,
      message: "Order created successfully",
      data: result,
    });
  } catch (err) {
    console.log("Error, createLinkTakeoutOrder:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/**
 * GET /orders/all-member — cookie kerak emas; `memberId` query (majburiy, ObjectId).
 */
orderController.getOrdersAllMember = async (req: Request, res: Response) => {
  try {
    console.log("getOrdersAllMember");
    const raw = req.query.memberId ? String(req.query.memberId).trim() : "";
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_MEMBER_ID);
    }
    const memberOid = shapeIntoMongooseObjectId(raw);

    const { page, limit, orderStatus } = req.query;
    const inquiry: OrderInquiry = {
      page: Number(page),
      limit: Number(limit),
      orderStatus: orderStatus as OrderStatus,
    };

    const result = await orderService.getOrdersByMemberId(memberOid, inquiry);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getOrdersAllMember:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/**
 * POST /orders/cancel-by-member — `memberId` va `customerPhone` (query yoki body);
 * telefon profil bilan mos bo‘lsa, shu memberga tegishli buyurtmalar va orderItems DB dan o‘chiriladi.
 */
orderController.cancelOrdersByMember = async (req: Request, res: Response) => {
  try {
    console.log("cancelOrdersByMember");
    const fromQuery = req.query.memberId
      ? String(req.query.memberId).trim()
      : "";
    const fromBody =
      typeof req.body?.memberId === "string" ? req.body.memberId.trim() : "";
    const raw = fromQuery || fromBody;
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_MEMBER_ID);
    }
    const memberOid = shapeIntoMongooseObjectId(raw);

    const phoneFromQuery = req.query.customerPhone
      ? String(req.query.customerPhone).trim()
      : "";
    const phoneFromBody =
      typeof req.body?.customerPhone === "string"
        ? req.body.customerPhone.trim()
        : "";
    const customerPhone = phoneFromQuery || phoneFromBody;
    if (!customerPhone) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CUSTOMER_PHONE_REQUIRED);
    }

    const result = await orderService.deleteOrdersByMemberVerifiedPhone(
      memberOid,
      customerPhone
    );

    res.status(HttpCode.OK).json({
      success: true,
      message: "Orders deleted",
      deletedOrders: result.deletedOrders,
      deletedItems: result.deletedItems,
    });
  } catch (err) {
    console.log("Error, cancelOrdersByMember:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/**
 * POST|DELETE /admin/order/purge-by-member — admin cookie.
 * Body yoki query: `memberId` (ixtiyoriy, lekin berilsa to‘g‘ri ObjectId) va/yoki `customerPhone`.
 */
orderController.deleteOrdersByMemberId = async (
  req: Request,
  res: Response
) => {
  try {
    const rawMember =
      (typeof req.body?.memberId === "string" && req.body.memberId) ||
      (typeof req.query.memberId === "string" && req.query.memberId) ||
      "";
    const rawPhone =
      (typeof req.body?.customerPhone === "string" &&
        req.body.customerPhone) ||
      (typeof req.query.customerPhone === "string" &&
        req.query.customerPhone) ||
      "";

    const memberTrimmed = rawMember.trim();
    const phoneTrimmed = rawPhone.trim();

    const hasMember = memberTrimmed.length > 0;
    const hasPhone = phoneTrimmed.length > 0;

    if (!hasMember && !hasPhone) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.PURGE_ORDERS_CRITERIA);
    }
    if (hasMember && !mongoose.Types.ObjectId.isValid(memberTrimmed)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_MEMBER_ID);
    }

    const memberOid = hasMember
      ? shapeIntoMongooseObjectId(memberTrimmed)
      : undefined;
    const result = await orderService.deleteOrdersByMemberOrPhone({
      memberId: memberOid,
      customerPhone: hasPhone ? phoneTrimmed : undefined,
    });
    res.status(HttpCode.OK).json({
      success: true,
      deletedOrders: result.deletedOrders,
      deletedItems: result.deletedItems,
    });
  } catch (err) {
    console.log("Error, deleteOrdersByMemberId:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** POST|DELETE /admin/order/purge-by-table — body yoki query `tableId` */
orderController.deleteOrdersByTableId = async (req: Request, res: Response) => {
  try {
    const raw =
      (typeof req.body?.tableId === "string" && req.body.tableId) ||
      (typeof req.query.tableId === "string" && req.query.tableId) ||
      "";
    const trimmed = raw.trim();
    if (!trimmed || !mongoose.Types.ObjectId.isValid(trimmed)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_TABLE_ID);
    }
    const tableOid = shapeIntoMongooseObjectId(trimmed);
    const result = await orderService.deleteOrdersByTableId(tableOid);
    res.status(HttpCode.OK).json({
      success: true,
      deletedOrders: result.deletedOrders,
      deletedItems: result.deletedItems,
    });
  } catch (err) {
    console.log("Error, deleteOrdersByTableId:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
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

    const result = await orderService.getMyOrders(
      req.member,
      req.table,
      inquiry
    );

    res.status(HttpCode.CREATED).json(result);
  } catch (err) {
    console.log("Error, getMyOrders:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.updateOrder = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("updateOrder");
    const input = req.body as OrderUpdateInput;
    if (!input?.orderId) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.ORDER_UPDATE_PAYLOAD);
    }
    if (
      input.orderStatus === undefined &&
      (!input.itemUpdates || input.itemUpdates.length === 0)
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.ORDER_UPDATE_PAYLOAD);
    }

    const oid = shapeIntoMongooseObjectId(input.orderId as unknown as string);

    if (input.itemUpdates && input.itemUpdates.length > 0) {
      for (const u of input.itemUpdates) {
        const iidRaw = String(u.orderItemId ?? "").trim();
        if (!iidRaw || !mongoose.Types.ObjectId.isValid(iidRaw)) {
          throw new Errors(HttpCode.BAD_REQUEST, Message.ORDER_ITEM_ID_INVALID);
        }
        const updated = await orderService.updateOrderItemQuantity(
          req.member,
          req.table,
          oid,
          shapeIntoMongooseObjectId(iidRaw),
          Number(u.quantity)
        );
        if (updated === null) {
          res.status(HttpCode.OK).json({
            success: true,
            order: null,
            orderDeleted: true,
          });
          return;
        }
      }
    }

    if (input.orderStatus !== undefined) {
      await orderService.updateOrder(req.member, req.table, input);
    }

    const full = await orderService.getOrderByIdWithDetails(String(oid));
    if (!full) {
      res.status(HttpCode.OK).json({
        success: true,
        order: null,
        orderDeleted: true,
      });
      return;
    }

    res.status(HttpCode.OK).json({ success: true, order: full });
  } catch (err) {
    console.log("Error, updateOrder:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/**
 * PATCH /order/:orderId/item/:orderItemId/quantity — cookie kerak emas;
 * body: { "quantity": number } (0 = qatorni o‘chirish). ID bilgan har kim o‘zgartira oladi.
 */
orderController.patchOrderItemQuantity = async (req: Request, res: Response) => {
  try {
    console.log("patchOrderItemQuantity");
    const { orderId, orderItemId } = req.params;
    const oRaw = String(orderId ?? "").trim();
    const iRaw = String(orderItemId ?? "").trim();
    if (
      !oRaw ||
      !iRaw ||
      !mongoose.Types.ObjectId.isValid(oRaw) ||
      !mongoose.Types.ObjectId.isValid(iRaw)
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.ORDER_PATH_IDS_INVALID);
    }

    const q = (req.body as { quantity?: unknown })?.quantity;
    const quantity = Number(q);
    if (
      q === undefined ||
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ITEM_QUANTITY);
    }

    const result = await orderService.updateOrderItemQuantity(
      null,
      null,
      shapeIntoMongooseObjectId(oRaw),
      shapeIntoMongooseObjectId(iRaw),
      quantity
    );

    if (result === null) {
      res.status(HttpCode.OK).json({
        success: true,
        order: null,
        orderDeleted: true,
      });
      return;
    }

    res.status(HttpCode.OK).json({ success: true, order: result });
  } catch (err) {
    console.log("Error, patchOrderItemQuantity:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** ADMIN */
orderController.getAllOrders = async (req: Request, res: Response) => {
  try {
    console.log("getAllOrders");
    const { page, limit, status, payStatus, search, type, payMeth } = req.query;
    const inquiry: OrderInquiry = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    };
    if (search) inquiry.search = String(search);
    if (status) inquiry.status = status as OrderStatus;
    if (payStatus) inquiry.payStatus = payStatus as PaymentStatus;
    if (payMeth) inquiry.payMeth = payMeth as PaymentMethod;
    if (type) inquiry.type = type as OrderType;

    const data = await orderService.getAllOrders(inquiry);
    res.status(HttpCode.OK).json(data);
  } catch (err) {
    console.log("Error, getAllOrders:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.getAllOrdersPanel = async (req: Request, res: Response) => {
  try {
    console.log("getAllOrdersPanel");
    const { page, limit, status, payStatus, search, type, payMeth } = req.query;
    const inquiry: OrderInquiry = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    };
    if (search) inquiry.search = String(search);
    if (status) inquiry.status = status as OrderStatus;
    if (payStatus) inquiry.payStatus = payStatus as PaymentStatus;
    if (payMeth) inquiry.payMeth = payMeth as PaymentMethod;
    if (type) inquiry.type = type as OrderType;

    const data = await orderService.getAllOrdersPanel(inquiry);
    res.status(HttpCode.OK).json(data);
  } catch (err) {
    console.log("Error, getAllOrdersPanel:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** POST /admin/order/:id/notify-accepted-sms — mijozga “buyurtma qabul qilindi” SMS */
orderController.notifyOrderAcceptedSms = async (
  req: Request,
  res: Response
) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
    await orderService.sendOrderAcceptedSms(id);
    res.status(HttpCode.OK).json({
      success: true,
      message: "SMS sent",
    });
  } catch (err) {
    console.log("Error, notifyOrderAcceptedSms:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.updateChosenOrder = async (req: Request, res: Response) => {
  try {
    console.log("updateChosenOrder");
    const id = req.params.id;
    console.log("id", id);
    const result = await orderService.updateChosenOrder(id, req.body);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, updateChosenOrder:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
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
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.completeTableOrders = async (req: Request, res: Response) => {
  try {
    const tableId = req.params.id;
    if (!tableId) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
    const result = await orderService.completeTableOrders(tableId);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, completeTableOrders:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** Admin: link orqali yaratilgan buyurtmalar (GET + har 5s Socket) */
orderController.getLinkOrders = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const inquiry: OrderInquiry = {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    };
    const data = await orderService.getLinkOrders(inquiry);
    res.status(HttpCode.OK).json(data);
  } catch (err) {
    console.log("Error, getLinkOrders:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** Admin: faqat `/order/link` + o‘tirib yeyish (`TABLE`) */
orderController.getLinkOrdersDineInAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("getLinkOrdersDineInAdmin");
    const { page, limit } = req.query;
    const inquiry: OrderInquiry = {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    };
    const data = await orderService.getLinkOrdersDineInAdmin(inquiry);
    res.status(HttpCode.OK).json(data);
  } catch (err) {
    console.log("Error, getLinkOrdersDineInAdmin:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

/** Admin: link orqali olib ketish (`TAKEOUT` + LINK / LINK_TAKEOUT) */
orderController.getLinkOrdersTakeoutAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("getLinkOrdersTakeoutAdmin");
    const { page, limit } = req.query;
    const inquiry: OrderInquiry = {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    };
    const data = await orderService.getLinkOrdersTakeoutAdmin(inquiry);
    res.status(HttpCode.OK).json(data);
  } catch (err) {
    console.log("Error, getLinkOrdersTakeoutAdmin:", err);
    if (err instanceof Errors) res.status(err.code).json(err.toJSON());
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default orderController;
