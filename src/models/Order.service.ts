import { Order, OrderInput, OrderUpdateInput } from "../libs/types/order";
import Errors, { HttpCode, Message } from "../libs/Errors";
import OrderModel from "../schema/Order.model";
import { OrderType } from "../libs/enums/order.enum";
import { shapeIntoMongooseObjectId } from "../libs/config";

class OrderService {
  private readonly orderModel;

  constructor(){
      this.orderModel = OrderModel;
  };

  /** SPA */

  /** ADMIN */
  public async getAllOrders(): Promise <Order[]>{
      const result = await this.orderModel
      .find()
      .exec();
      if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
      return result;
  }

  public async updateChosenOrder(
    id: string,
    input: OrderUpdateInput
  ): Promise <Order>{
    console.log(id)
    id = shapeIntoMongooseObjectId(id);
    const result = await this.orderModel
    .findByIdAndUpdate({_id: id}, input, {new: true})
    .exec();
    if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result;
  }
};

  export default OrderService;