import { Member } from "../libs/types/member";
import { ObjectId } from "mongoose";
import OrderModel from "../schema/Order.model";
import OrderItemModel from "../schema/OrderItem.model";
import {
  Order,
  OrderInput,
  OrderInquiry,
  OrderItemInput,
  OrderUpdateInput,
} from "../libs/types/order";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import MemberService from "./Member.service";
import { OrderStatus, OrderType } from "../libs/enums/order.enum";
import { T } from "../libs/types/common";
import { MemberStatus } from "../libs/enums/member.enum";
import { MemberType } from "../libs/enums/member.enum";
import { Table } from "../libs/types/table";
import { isMember, isTable } from "../libs/utils/validators";
import NotifService from "./Notif.service";
import { Notif, NotifInput } from "../libs/types/notif";
import { NotifStatus, NotifType } from "../libs/enums/notif.enum";
import { MessageNotif, Title } from "../libs/notif";

class OrderService {
  private readonly orderModel;
  private readonly orderItemModel;
  private readonly memberService;
  private readonly notifService;

  constructor() {
    this.orderModel = OrderModel;
    this.orderItemModel = OrderItemModel;
    this.memberService = new MemberService();
    this.notifService = new NotifService();
  }

  /** MEMBER **/
  public async createOrder(
    client: Member | Table,
    input: OrderItemInput[]
  ): Promise<Order> {
    const memberId = shapeIntoMongooseObjectId(client._id);
    const amount = input.reduce((accumulator: number, item: OrderItemInput) => {
      return accumulator + item.itemPrice * item.itemQuantity;
    }, 0);

    let orderType: OrderType;
    if (isMember(client)) {
      orderType =
        client.memberType === MemberType.USER
          ? OrderType.DELIVERY
          : OrderType.TAKEOUT; // restaurant
    } else if (isTable(client)) {
      console.log("alajdsf", client.activeIdentifier)
      orderType = OrderType.TABLE;
    } else {
      throw new Errors(HttpCode.BAD_REQUEST, Message.NO_MEMBER_NICK);
    }

    const deliveryFee =
      orderType === OrderType.DELIVERY ? (amount < 100 ? 5 : 0) : 0;

    const order: OrderInput = {
      orderTotal: amount + deliveryFee,
      deliveryFee,
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
          ? Title.USER_ORDER + `${client.memberNick}`
          : Title.TABLE_ORDER + `${client.tableNumber}`,
        message: MessageNotif.USER_ORDER
      });

      return newOrder;
    } catch (err) {
      console.log("Error, model: createOrder: ", err);
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
    member: Member,
    inquiry: OrderInquiry
  ): Promise<Order[]> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const matches = { memberId: memberId, orderStatus: inquiry.orderStatus };

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
    member: Member,
    input: OrderUpdateInput
  ): Promise<Order> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const orderId = shapeIntoMongooseObjectId(input.orderId);
    const orderStatus = input.orderStatus;

    const result = await this.orderModel
      .findOneAndUpdate(
        {
          memberId: memberId,
          _id: orderId,
        },
        { orderStatus: orderStatus },
        { new: true }
      )
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

    if (orderStatus === OrderStatus.PENDING) {
      await this.memberService.addUserPoint(member, 1);
    }
    return result;
  }

  /** ADMIN */
  public async getAllOrders(inquiry: OrderInquiry): Promise<Order[]> {
    const match: T = {};

    if (inquiry.payStatus) match.payStatus = inquiry.payStatus;
    if (inquiry.status) match.status = inquiry.status;
    if (inquiry.type) match.type = inquiry.type;
    if (inquiry.search) match.search = inquiry.search;
    const result = await this.orderModel
      .aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: (inquiry.page - 1) * inquiry.limit },
        { $limit: inquiry.limit },
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
    if(result.orderStatus !== OrderStatus.PENDING)
      await this.notifService.updateOrderNotif(orderId, {
      notifStatus: NotifStatus.READ
      });
    return result;
  }
}

export default OrderService;
