import { Member } from "../libs/types/member";
import { ObjectId } from "mongoose";
import OrderModel from "../schema/Order.model";
import OrderItemModel from "../schema/OrderItem.model";
import {
  Order,
  OrderInput,
  OrderInquiry,
  OrderItemInput,
  OrdersByCategory,
  OrderStatis,
  OrderUpdateInput,
  SalesByTable,
  TodayIncomeAndAOV,
  TodaySoldItems,
  TopSellingItems,
} from "../libs/types/order";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import MemberService from "./Member.service";
import { OrderStatus, OrderType, PaymentStatus } from "../libs/enums/order.enum";
import { T } from "../libs/types/common";
import { MemberType } from "../libs/enums/member.enum";
import { Table } from "../libs/types/table";
import { isMember, isTable } from "../libs/utils/validators";
import NotifService from "./Notif.service";
import TableService from "./Table.service";
import { NotifStatus, NotifType } from "../libs/enums/notif.enum";
import { MessageNotif, Title } from "../libs/notif";

class OrderService {
  private readonly orderModel;
  private readonly orderItemModel;
  private readonly memberService;
  private readonly notifService;

  private readonly tableService;

  constructor() {
    this.orderModel = OrderModel;
    this.orderItemModel = OrderItemModel;
    this.memberService = new MemberService();
    this.notifService = new NotifService();
    this.tableService = new TableService();
  }

  /** MEMBER **/
  public async createOrder(
    client: Member | Table,
    input: OrderItemInput[]
  ): Promise<Order> {
    if (!client || !client._id) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.NO_MEMBER_NICK);
    }
    
    if (!input || !Array.isArray(input) || input.length === 0) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
    
    const amount = input.reduce((accumulator: number, item: OrderItemInput) => {
      if (!item.itemPrice || !item.itemQuantity) {
        throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
      }
      return accumulator + item.itemPrice * item.itemQuantity;
    }, 0);

    let orderType: OrderType;
    if (isMember(client)) {
      orderType =
        client.memberType === MemberType.USER
          ? OrderType.DELIVERY
          : OrderType.TAKEOUT; // restaurant
    } else if (isTable(client)) {
      console.log("alajdsf", client.activeIdentifier);
      orderType = OrderType.TABLE;
    } else {
      throw new Errors(HttpCode.BAD_REQUEST, Message.NO_MEMBER_NICK);
    }

    const orderDelivery =
      orderType === OrderType.DELIVERY ? (amount < 100 ? 5 : 0) : 0;

    const order: OrderInput = {
      orderTotal: amount + orderDelivery,
      orderDelivery,
      orderType,
      memberId: isMember(client) ? shapeIntoMongooseObjectId(client._id) : null,
      tableId: isTable(client) ? shapeIntoMongooseObjectId(client._id) : null,
    };
    try {
      const newOrder: Order = await this.orderModel.create(order);
      const orderId = newOrder._id;
      await this.recordOrderItem(orderId, input);
      /** Create Order Notification */
      await this.notifService.createNotif({
        notifType: NotifType.ORDER,
        orderId: isMember(client) ? orderId : null,
        tableId: isTable(client) ? orderId : null,
        title: isMember(client)
          ? Title.USER_ORDER + `${client.memberNick || ''}`
          : Title.TABLE_ORDER + `${client.tableNumber || ''}`,
        message: isMember(client) ? MessageNotif.USER_ORDER : MessageNotif.TABLE_ORDER,
      });

      return newOrder;
    } catch (err) {
      console.log("Error, model: createOrder: ", err);
      console.log("Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        client: client ? { hasId: !!client._id, type: isMember(client) ? 'member' : isTable(client) ? 'table' : 'unknown' } : 'undefined'
      });
      if (err instanceof Errors) {
        throw err;
      }
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  private async recordOrderItem(
    orderId: ObjectId,
    input: OrderItemInput[]
  ): Promise<void> {
    const promisedList = input.map(async (item: OrderItemInput) => {
      item.orderId = orderId;
      item.productId = shapeIntoMongooseObjectId(item.productId);
      await this.orderItemModel.create(item);
      return "INSERTED";
    });
    const orderItemsState = await Promise.all(promisedList);
    console.log("orderItemsState", orderItemsState);
  }

  public async getMyOrders(
    member: Member | null,
    table: Table | null,
    inquiry: OrderInquiry
  ): Promise<Order[]> {
    const memberId = shapeIntoMongooseObjectId(member?._id);
    const tableId = shapeIntoMongooseObjectId(table?._id);
    const matches = {
      memberId: memberId,
      tableId: tableId,
      orderStatus: inquiry.orderStatus,
    };

    const result = await this.orderModel
      .aggregate([
        { $match: matches },
        { $sort: { updateAt: -1 } },
        { $skip: (inquiry.page - 1) * inquiry.limit },
        { $limit: inquiry.limit },
        {
          $lookup: {
            from: "orderItems",
            localField: "_id",
            foreignField: "orderId",
            as: "orderItems",
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "orderItems.productId",
            foreignField: "_id",
            as: "productData",
          },
        },
      ])
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async updateOrder(
    member: Member | null,
    table: Table | null,
    input: OrderUpdateInput
  ): Promise<Order> {
    const memberId = shapeIntoMongooseObjectId(member?._id);
    const tableId = shapeIntoMongooseObjectId(table?._id);
    const orderId = shapeIntoMongooseObjectId(input.orderId);
    const orderStatus = input.orderStatus;

    const result = await this.orderModel
      .findOneAndUpdate(
        {
          tableId: tableId,
          memberId: memberId,
          _id: orderId,
        },
        { orderStatus: orderStatus },
        { new: true }
      )
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

    if (member && orderStatus === OrderStatus.PENDING) {
      await this.memberService.addUserPoint(member, 1);
    }
    return result;
  }

  /** ADMIN */
  public async getAllOrders(inquiry: OrderInquiry): Promise<Order[]> {
    const match: T = { orderStatus: { $ne: OrderStatus.PAUSE } };

    if (inquiry.payStatus) match.paymentStatus = inquiry.payStatus;
    if (inquiry.payMeth) match.paymentMethod = inquiry.payMeth;
    if (inquiry.status) match.orderStatus = inquiry.status;
    if (inquiry.type) match.orderType = inquiry.type;
    if (inquiry.search)
      match.orderType = { $regex: new RegExp(inquiry.search, "i") };
    console.log(match);
    const page = Math.max(1, Number(inquiry.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(inquiry.limit) || 10));

    const result = await this.orderModel
      .aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: "tables",
            localField: "tableId",
            foreignField: "_id",
            as: "tableData",
          },
        },
        {
          $lookup: {
            from: "members",
            localField: "memberId",
            foreignField: "_id",
            as: "memberData",
          },
        },
        {
          $lookup: {
            from: "orderItems",
            localField: "_id",
            foreignField: "orderId",
            as: "orderItems",
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "orderItems.productId",
            foreignField: "_id",
            as: "productData",
          },
        },
        {
          $addFields: {
            tableNumber: { $arrayElemAt: ["$tableData.tableNumber", 0] },
            memberNick: { $arrayElemAt: ["$memberData.memberNick", 0] },
          },
        },
        {
          $project: {
            tableData: 0,
            memberData: 0,
          },
        },
      ])
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async updateChosenOrder(
    id: string,
    input: OrderUpdateInput
  ): Promise<Order> {
    console.log(id);
    const orderId = shapeIntoMongooseObjectId(id);
    const result = await this.orderModel
      .findByIdAndUpdate({ _id: id }, input, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    if (result.orderStatus !== OrderStatus.PENDING)
      await this.notifService.updateOrderNotif(orderId, {
        notifStatus: NotifStatus.READ,
      });
    return result;
  }

  /** Stol buyurtmalarini to'landi deb belgilash — bugungi savdo ga qo'shiladi */
  public async completeTableOrders(tableId: string): Promise<{ updated: number; totalSum: number }> {
    const id = shapeIntoMongooseObjectId(tableId);

    const ordersToUpdate = await this.orderModel
      .find({
        tableId: id,
        orderType: OrderType.TABLE,
        orderStatus: { $nin: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
      })
      .lean()
      .exec();

    const totalSum = ordersToUpdate.reduce((sum: number, o: any) => sum + (o.orderTotal || 0), 0);

    const result = await this.orderModel
      .updateMany(
        {
          tableId: id,
          orderType: OrderType.TABLE,
          orderStatus: { $nin: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
        },
        {
          $set: {
            orderStatus: OrderStatus.COMPLETED,
            paymentStatus: PaymentStatus.PAID,
          },
        }
      )
      .exec();

    if (result.modifiedCount > 0) {
      await this.tableService.setTableCleaning(id);
    }

    return {
      updated: result.modifiedCount || 0,
      totalSum,
    };
  }

  public async getStatis(): Promise<OrderStatis> {
    // Order Status
    const allOrders = await this.orderModel.find().exec();
    const pendingOrder = allOrders.filter((val) => {
      return val.orderStatus === OrderStatus.PENDING;
    }).length;
    const complatedOrder = allOrders.filter((val) => {
      return val.orderStatus === OrderStatus.COMPLETED;
    }).length;

    const ordersByCategory = await this.ordersByCategory();
    const topSellingItems = await this.topSellingItems();
    const todayIncomeAndAOV = await this.todayIncomeAndAOV();
    const todaySoldItems = await this.todaySoldItems();
    const salesByTable = await this.salesByTable();

    const data: OrderStatis = {
      totalOrder: allOrders.length,
      pendingOrder: pendingOrder,
      complatedOrder: complatedOrder,
      ordersByCategory: ordersByCategory,
      topSellingItems: topSellingItems,
      todayIncomeAndAOV: todayIncomeAndAOV,
      todaySoldItems: todaySoldItems,
      salesByTable: salesByTable,
    };
    return data;
  }

  private async ordersByCategory(): Promise<OrdersByCategory[]> {
    const data = await this.orderItemModel.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },
      {
        $match: {
          "order.paymentStatus": PaymentStatus.PAID,
          "order.orderStatus": { $ne: OrderStatus.CANCELLED },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.productCollection",
          totalQuantity: { $sum: "$itemQuantity" },
          revenue: { $sum: { $multiply: ["$itemQuantity", "$itemPrice"] } },
          orderIds: { $addToSet: "$orderId" },
        },
      },
      { $addFields: { orders: { $size: "$orderIds" } } },
      {
        $project: {
          collection: "$_id",
          totalQuantity: 1,
          revenue: 1,
          orders: 1,
          _id: 0,
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);
    return data;
  }

  private async topSellingItems(): Promise<TopSellingItems[]> {
    // Top selling Items
    const data = await this.orderItemModel.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },
      {
        $match: {
          "order.paymentStatus": PaymentStatus.PAID,
          "order.orderStatus": { $ne: OrderStatus.CANCELLED },
        },
      },
      {
        $group: {
          _id: "$productId",
          totalQuantity: { $sum: "$itemQuantity" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          productName: "$product.productName",
          totalQuantity: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 6 },
    ]);
    return data;
  }

  private async todayIncomeAndAOV(): Promise<TodayIncomeAndAOV[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const data = await this.orderModel.aggregate([
      {
        $match: {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.COMPLETED,
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          totalSum: { $sum: "$orderTotal" },
          deliverySum: { $sum: "$orderDelivery" },
        },
      },
      {
        $addFields: {
          aovGross: {
            $cond: [
              { $gt: ["$orderCount", 0] },
              { $divide: ["$totalSum", "$orderCount"] },
              0,
            ],
          },
        },
      },
      { $project: { _id: 0 } },
    ]);
    return data.length > 0 ? data : [{ totalSum: 0, deliverySum: 0, aovGross: 0, orderCount: 0 }];
  }

  private async todaySoldItems(): Promise<TodaySoldItems[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const data = await this.orderItemModel.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },
      {
        $match: {
          "order.paymentStatus": PaymentStatus.PAID,
          "order.orderStatus": OrderStatus.COMPLETED,
          "order.createdAt": { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: "$productId",
          totalQuantity: { $sum: "$itemQuantity" },
          totalRevenue: { $sum: { $multiply: ["$itemQuantity", "$itemPrice"] } },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          productId: { $toString: "$_id" },
          productName: "$product.productName",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);
    return data;
  }

  private async salesByTable(): Promise<SalesByTable[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const data = await this.orderModel.aggregate([
      {
        $match: {
          orderType: OrderType.TABLE,
          tableId: { $ne: null },
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.COMPLETED,
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $lookup: {
          from: "tables",
          localField: "tableId",
          foreignField: "_id",
          as: "tableData",
        },
      },
      { $unwind: "$tableData" },
      {
        $group: {
          _id: "$tableId",
          tableNumber: { $first: "$tableData.tableNumber" },
          orderCount: { $sum: 1 },
          totalSum: { $sum: "$orderTotal" },
        },
      },
      {
        $project: {
          _id: 0,
          tableId: { $toString: "$_id" },
          tableNumber: 1,
          orderCount: 1,
          totalSum: 1,
        },
      },
      { $sort: { totalSum: -1 } },
    ]);
    return data;
  }
}

export default OrderService;
