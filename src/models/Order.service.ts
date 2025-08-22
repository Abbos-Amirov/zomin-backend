import {
  Order,
  OrderInput,
  OrderInquiry,
  OrderUpdateInput,
} from "../libs/types/order";
import Errors, { HttpCode, Message } from "../libs/Errors";
import OrderModel from "../schema/Order.model";
import { OrderType } from "../libs/enums/order.enum";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { T } from "../libs/types/common";

class OrderService {
  private readonly orderModel;

  constructor() {
    this.orderModel = OrderModel;
  }

  /** SPA */

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
    id = shapeIntoMongooseObjectId(id);
    const result = await this.orderModel
      .findByIdAndUpdate({ _id: id }, input, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result;
  }
}

export default OrderService;
