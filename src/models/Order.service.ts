import { Member } from "../libs/types/member";
import { ObjectId } from "mongoose";
import OrderModel from "../schema/Order.model";
import OrderItemModel from "../schema/OrderItem.model";
import TableModel from "../schema/Table.model";
import ProductModel from "../schema/Product.model";
import {
  Order,
  OrderInput,
  OrderInquiry,
  OrderItemInput,
  OrdersByCategory,
  OrderStatis,
  OrderUpdateInput,
  TodayIncomeAndAOV,
  TopSellingItems,
  LinkOrderInput,
  LinkOrderItemInput,
  LinkTakeoutOrderInput,
} from "../libs/types/order";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import MemberService from "./Member.service";
import {
  OrderSource,
  OrderStatus,
  OrderType,
  PaymentStatus,
} from "../libs/enums/order.enum";
import { T } from "../libs/types/common";
import { TableStatus } from "../libs/enums/table.enum";
import { Table } from "../libs/types/table";
import { isMember, isTable } from "../libs/utils/validators";
import { isSameGuestAsOrder } from "../libs/utils/orderTableGuest";
import { emitTableStatusToClients } from "../socket/tableBroadcast";
import NotifService from "./Notif.service";
import { NotifStatus, NotifType } from "../libs/enums/notif.enum";
import { MessageNotif, Title } from "../libs/notif";
import { sendTwilioSms } from "../libs/twilioSms";

/** Link buyurtmalarda telefon formatlari farq qiladi — `$customerPhone` dan ajratuvchilarni olib tashlab raqamlarni solishtirish. */
function customerPhoneDigitsEqualsExpr(memberDigits: string): T | null {
  if (!memberDigits || memberDigits.length < 5) return null;
  const chars = [" ", "\t", "-", "(", ")", "+", "."];
  let input: any = { $ifNull: ["$customerPhone", ""] };
  for (const ch of chars) {
    input = { $replaceAll: { input, find: ch, replacement: "" } };
  }
  return {
    $expr: {
      $and: [
        { $gte: [{ $strLenCP: input }, 5] },
        { $eq: [input, memberDigits] },
      ],
    },
  };
}

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

    if (!isMember(client) && !isTable(client)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.NO_MEMBER_NICK);
    }

    /** `/order/create`: barcha yangi buyurtmalar DB da `orderType: DELIVERY`. */
    const orderType = OrderType.DELIVERY;
    const orderDelivery = amount < 100 ? 5 : 0;

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

  private async buildNormalizedLinkItems(
    orderItems: LinkOrderItemInput[]
  ): Promise<{ normalizedItems: OrderItemInput[]; amount: number }> {
    if (
      !orderItems ||
      !Array.isArray(orderItems) ||
      orderItems.length === 0
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
    const productIds = orderItems.map((i) =>
      shapeIntoMongooseObjectId(i.productId)
    );
    const products = await ProductModel.find({
      _id: { $in: productIds },
    }).exec();
    if (!products || products.length !== orderItems.length) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);
    }
    const priceMap = new Map<string, number>();
    products.forEach((p) => {
      priceMap.set(String(p._id), p.productPrice);
    });

    const normalizedItems: OrderItemInput[] = [];
    let amount = 0;
    for (const item of orderItems) {
      const qty = Number((item as any).quantity);
      if (!item.productId || !qty || qty <= 0) {
        throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
      }
      const pid = shapeIntoMongooseObjectId(item.productId as any);
      const price = priceMap.get(String(pid));
      if (price === undefined) {
        throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);
      }
      amount += price * qty;
      normalizedItems.push({
        itemQuantity: qty,
        itemPrice: price,
        productId: pid,
      });
    }
    return { normalizedItems, amount };
  }

  /**
   * LINK ORDER — `viewerMember` cookie (retrieveAuth) bo‘lsa, band stolni boshqa mijozdan ajratish.
   */
  public async createLinkOrder(
    payload: LinkOrderInput,
    viewerMember?: Member | null
  ): Promise<Order> {
    const {
      tableId,
      customerName,
      customerPhone,
      arrivalInMinutes,
      orderItems,
      orderType: linkOrderTypeInput,
    } = payload;

    const linkOrderType =
      linkOrderTypeInput !== undefined && linkOrderTypeInput !== null
        ? linkOrderTypeInput
        : OrderType.TABLE;
    if (
      linkOrderType !== OrderType.TABLE &&
      linkOrderType !== OrderType.TAKEOUT
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

    if (
      !tableId ||
      !customerName ||
      !customerPhone ||
      typeof arrivalInMinutes !== "number" ||
      arrivalInMinutes <= 0 ||
      !orderItems ||
      !Array.isArray(orderItems) ||
      orderItems.length === 0
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

    const tableObjectId = shapeIntoMongooseObjectId(tableId);
    const table = await TableModel.findById(tableObjectId).exec();
    if (!table) throw new Errors(HttpCode.NOT_FOUND, Message.NOT_TABLE);

    if (linkOrderType === OrderType.TABLE) {
      const activeOrders = await this.orderModel
        .find({
          tableId: tableObjectId,
          orderType: OrderType.TABLE,
          orderStatus: {
            $nin: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
          },
        })
        .lean()
        .exec();

      for (const o of activeOrders) {
        if (
          !isSameGuestAsOrder(o, {
            viewer: viewerMember ?? null,
            requestPhone: customerPhone,
          })
        ) {
          throw new Errors(
            HttpCode.FORBIDDEN,
            Message.TABLE_OCCUPIED_BY_ANOTHER
          );
        }
      }
    }

    const { normalizedItems, amount } = await this.buildNormalizedLinkItems(
      orderItems
    );

    const orderDelivery = 0;
    const orderInput: OrderInput = {
      orderType: linkOrderType,
      orderStatus: OrderStatus.PENDING,
      orderTotal: amount,
      orderDelivery,
      tableId: tableObjectId,
      customerName,
      customerPhone,
      arrivalInMinutes,
      orderSource: OrderSource.LINK,
      paymentStatus: PaymentStatus.UNPAID,
    };

    const newOrderDoc = await this.orderModel.create(orderInput);
    const orderId = newOrderDoc._id as ObjectId;
    await this.recordOrderItem(orderId, normalizedItems);

    /** Shu yerda yeyish: tanlangan stolni band qilish (QR dagidek), AVAILABLE/CLEANING ham OCCUPIED */
    if (linkOrderType === OrderType.TABLE) {
      await TableModel.findByIdAndUpdate(tableObjectId, {
        tableStatus: TableStatus.OCCUPIED,
      }).exec();
      void emitTableStatusToClients().catch(() => {});
    }

    const plainOrder = newOrderDoc.toObject() as Order;
    (plainOrder as any).orderItems = normalizedItems;
    return plainOrder;
  }

  /** Stolsiz link: faqat olib ketish (`TAKEOUT`), `tableId` yo‘q */
  public async createLinkTakeoutOrder(
    payload: LinkTakeoutOrderInput
  ): Promise<Order> {
    const { customerName, customerPhone, arrivalInMinutes, orderItems } =
      payload;

    if (
      !customerName ||
      !customerPhone ||
      typeof arrivalInMinutes !== "number" ||
      arrivalInMinutes <= 0
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

    const { normalizedItems, amount } = await this.buildNormalizedLinkItems(
      orderItems
    );

    const orderDelivery = 0;
    const orderInput: OrderInput = {
      orderType: OrderType.TAKEOUT,
      orderStatus: OrderStatus.PENDING,
      orderTotal: amount,
      orderDelivery,
      customerName,
      customerPhone,
      arrivalInMinutes,
      orderSource: OrderSource.LINK_TAKEOUT,
      paymentStatus: PaymentStatus.UNPAID,
    };

    const newOrderDoc = await this.orderModel.create(orderInput);
    const orderId = newOrderDoc._id as ObjectId;
    await this.recordOrderItem(orderId, normalizedItems);

    const plainOrder = newOrderDoc.toObject() as Order;
    (plainOrder as any).orderItems = normalizedItems;
    return plainOrder;
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

  /** `getOrdersByMemberId` / `deleteOrdersByMemberVerifiedPhone` uchun bir xil `$or` shartlari. */
  private async buildMemberOrdersOrMatch(memberId: ObjectId): Promise<T[]> {
    const idStr = String(memberId);
    const orParts: T[] = [{ memberId }, { memberId: idStr }];

    const phone = await this.memberService.getMemberPhoneById(memberId);
    if (phone) {
      const trimmed = phone.trim();
      if (trimmed) {
        orParts.push({ customerPhone: trimmed });
        const digits = trimmed.replace(/\D/g, "");
        if (digits.length >= 5) {
          orParts.push({ customerPhone: digits });
          orParts.push({ customerPhone: `+${digits}` });
          const digitExpr = customerPhoneDigitsEqualsExpr(digits);
          if (digitExpr) orParts.push(digitExpr);
        }
      }
    }
    return orParts;
  }

  /**
   * `memberId` bo‘yicha buyurtmalar — `/orders/all-member`.
   * - `memberId` maydoni ObjectId yoki (eski yozuvlar) string bo‘lishi mumkin.
   * - Link buyurtmalar: `customerPhone` — profil `memberPhone` bilan aniq yoki format farqi.
   */
  public async getOrdersByMemberId(
    memberId: ObjectId,
    inquiry: OrderInquiry
  ): Promise<Order[]> {
    const page = Math.max(1, Number(inquiry.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(inquiry.limit) || 20));

    const orParts = await this.buildMemberOrdersOrMatch(memberId);
    const match: T = { $or: orParts };
    if (inquiry.orderStatus) match.orderStatus = inquiry.orderStatus;

    const result = await this.orderModel
      .aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
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
    return result || [];
  }

  /**
   * `/orders/cancel-by-member`: `memberId`, `customerPhone` (profil bilan), `orderId`.
   * Faqat shu `orderId` dagi buyurtma `buildMemberOrdersOrMatch` bo‘yicha mijozga tegishli bo‘lsa,
   * uning `orderItems`lari va o‘zi o‘chiriladi.
   */
  public async deleteOrdersByMemberVerifiedPhone(
    memberId: ObjectId,
    customerPhone: string,
    orderId: string
  ): Promise<{ deletedOrders: number; deletedItems: number }> {
    const p = customerPhone.trim();
    if (!p) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CUSTOMER_PHONE_REQUIRED);
    }

    const oidTrim = orderId.trim();
    if (!oidTrim) {
      throw new Errors(
        HttpCode.BAD_REQUEST,
        Message.CANCEL_BY_MEMBER_ORDER_ID_REQUIRED
      );
    }

    const exists = await this.memberService.memberExistsById(memberId);
    if (!exists) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    const profilePhone = await this.memberService.getMemberPhoneById(memberId);
    if (!profilePhone) {
      throw new Errors(
        HttpCode.BAD_REQUEST,
        Message.MEMBER_NO_PHONE_ON_PROFILE
      );
    }

    const digits = (s: string) => s.replace(/\D/g, "");
    const dProfile = digits(profilePhone);
    const dReq = digits(p);
    if (dReq.length < 5 || dProfile !== dReq) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.MEMBER_PHONE_MISMATCH);
    }

    let orderOid: ObjectId;
    try {
      orderOid = shapeIntoMongooseObjectId(oidTrim);
    } catch {
      throw new Errors(
        HttpCode.BAD_REQUEST,
        Message.ORDER_PURGE_ORDER_ID_INVALID
      );
    }

    const orParts = await this.buildMemberOrdersOrMatch(memberId);
    const orderMatch: T = { $or: orParts };

    const doc = await this.orderModel
      .findOne({ $and: [{ _id: orderOid }, orderMatch] })
      .select("_id")
      .lean()
      .exec();
    if (!doc) {
      const any = await this.orderModel
        .findById(orderOid)
        .select("_id")
        .lean()
        .exec();
      if (!any) {
        throw new Errors(
          HttpCode.NOT_FOUND,
          Message.ORDER_PURGE_ORDER_NOT_FOUND
        );
      }
      throw new Errors(
        HttpCode.FORBIDDEN,
        Message.ORDER_PURGE_ORDER_MISMATCH
      );
    }

    const itemResult = await this.orderItemModel.deleteMany({
      orderId: orderOid,
    });
    const orderResult = await this.orderModel.deleteOne({ _id: orderOid });
    return {
      deletedOrders: orderResult.deletedCount ?? 0,
      deletedItems: itemResult.deletedCount ?? 0,
    };
  }

  /**
   * Admin `/order/purge-by-member`: `paymentStatus` → `PAID`.
   * - `orderId` berilsa: faqat shu buyurtma, `memberId` / `customerPhone` bilan mosligi tekshiriladi.
   * - `orderId` bo‘lmasa: `memberId` va/yoki `customerPhone` bo‘yicha barcha mos buyurtmalar.
   */
  public async markOrdersPaidByMemberOrPhone(criteria: {
    memberId?: ObjectId;
    customerPhone?: string;
    orderId?: string;
  }): Promise<{
    matchedOrders: number;
    paymentStatusUpdated: number;
  }> {
    const { memberId, customerPhone, orderId } = criteria;
    const hasMember = !!memberId;
    const hasPhone = !!customerPhone && customerPhone.length > 0;
    if (!hasMember && !hasPhone) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.PURGE_ORDERS_CRITERIA);
    }

    const match: T =
      hasMember && hasPhone
        ? { $or: [{ memberId }, { customerPhone }] }
        : hasMember
          ? { memberId }
          : { customerPhone };

    const hasOrderId = !!orderId && orderId.trim().length > 0;
    if (hasOrderId) {
      const trimmed = orderId!.trim();
      let orderOid: ObjectId;
      try {
        orderOid = shapeIntoMongooseObjectId(trimmed);
      } catch {
        throw new Errors(
          HttpCode.BAD_REQUEST,
          Message.ORDER_PURGE_ORDER_ID_INVALID
        );
      }

      const doc = await this.orderModel
        .findOne({ $and: [{ _id: orderOid }, match] })
        .select("_id")
        .lean()
        .exec();
      if (!doc) {
        const any = await this.orderModel
          .findById(orderOid)
          .select("_id")
          .lean()
          .exec();
        if (!any) {
          throw new Errors(
            HttpCode.NOT_FOUND,
            Message.ORDER_PURGE_ORDER_NOT_FOUND
          );
        }
        throw new Errors(
          HttpCode.FORBIDDEN,
          Message.ORDER_PURGE_ORDER_MISMATCH
        );
      }

      const orderResult = await this.orderModel
        .updateOne(
          { _id: orderOid },
          { $set: { paymentStatus: PaymentStatus.PAID } }
        )
        .exec();

      return {
        matchedOrders: 1,
        paymentStatusUpdated: orderResult.modifiedCount ?? 0,
      };
    }

    const orders = await this.orderModel
      .find(match)
      .select("_id")
      .lean()
      .exec();
    const orderIds = orders.map((o) => o._id);
    if (orderIds.length === 0) {
      return { matchedOrders: 0, paymentStatusUpdated: 0 };
    }

    const orderResult = await this.orderModel
      .updateMany(
        { _id: { $in: orderIds } },
        { $set: { paymentStatus: PaymentStatus.PAID } }
      )
      .exec();

    return {
      matchedOrders: orderIds.length,
      paymentStatusUpdated: orderResult.modifiedCount ?? 0,
    };
  }

  /**
   * Admin: `tableId`, `orderId`, `orderType === DELIVERY`, `paymentStatus === UNPAID`
   * bo‘lsa → `PAID`.
   */
  public async markDeliveryTableOrderUnpaidToPaid(
    tableId: ObjectId,
    orderId: ObjectId
  ): Promise<{ paymentStatusUpdated: number; alreadyPaid: boolean }> {
    const result = await this.orderModel
      .updateOne(
        {
          _id: orderId,
          tableId,
          orderType: OrderType.DELIVERY,
          paymentStatus: PaymentStatus.UNPAID,
        },
        { $set: { paymentStatus: PaymentStatus.PAID } }
      )
      .exec();

    if ((result.matchedCount ?? 0) > 0) {
      return {
        paymentStatusUpdated: result.modifiedCount ?? 0,
        alreadyPaid: false,
      };
    }

    const order = await this.orderModel.findById(orderId).lean();
    if (!order) {
      throw new Errors(
        HttpCode.NOT_FOUND,
        Message.ORDER_PURGE_ORDER_NOT_FOUND
      );
    }
    const tidOrder = order.tableId != null ? String(order.tableId) : "";
    const tidReq = String(tableId);
    if (tidOrder !== tidReq) {
      throw new Errors(
        HttpCode.FORBIDDEN,
        Message.DELIVERY_TABLE_PAY_TABLE_MISMATCH
      );
    }
    if (order.orderType !== OrderType.DELIVERY) {
      throw new Errors(
        HttpCode.BAD_REQUEST,
        Message.DELIVERY_TABLE_PAY_ORDER_TYPE
      );
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      return { paymentStatusUpdated: 0, alreadyPaid: true };
    }
    throw new Errors(
      HttpCode.BAD_REQUEST,
      Message.DELIVERY_TABLE_PAY_NOT_UNPAID
    );
  }

  /** `tableId` ga bog‘langan barcha buyurtmalar va ularning `orderItems` */
  public async deleteOrdersByTableId(tableId: ObjectId): Promise<{
    deletedOrders: number;
    deletedItems: number;
  }> {
    const orders = await this.orderModel
      .find({ tableId })
      .select("_id")
      .lean()
      .exec();
    const orderIds = orders.map((o) => o._id);
    if (orderIds.length === 0) {
      return { deletedOrders: 0, deletedItems: 0 };
    }
    const itemResult = await this.orderItemModel.deleteMany({
      orderId: { $in: orderIds },
    });
    const orderResult = await this.orderModel.deleteMany({
      _id: { $in: orderIds },
    });
    return {
      deletedOrders: orderResult.deletedCount ?? 0,
      deletedItems: itemResult.deletedCount ?? 0,
    };
  }

  /** Mijoz/stol faqat o‘z buyurtmasini yangilashi uchun filtr. */
  private buildOrderAccessMatch(
    member: Member | null | undefined,
    table: Table | null | undefined
  ): T {
    const mid = member?._id
      ? shapeIntoMongooseObjectId(member._id)
      : null;
    const tid = table?._id
      ? shapeIntoMongooseObjectId(table._id)
      : null;
    if (mid && tid) return { $or: [{ memberId: mid }, { tableId: tid }] };
    if (mid) return { memberId: mid };
    if (tid) return { tableId: tid };
    throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
  }

  private assertOrderQuantityEditable(order: {
    orderStatus?: string;
  }): void {
    const ok =
      order.orderStatus === OrderStatus.PAUSE ||
      order.orderStatus === OrderStatus.PENDING;
    if (!ok) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.ORDER_NOT_EDITABLE);
    }
  }

  /** Buyurtma qatorlari bo‘yicha `orderTotal` / `orderDelivery` (DELIVERY qoidasi createOrder bilan bir xil). */
  private async recalculateOrderTotals(orderId: ObjectId): Promise<void> {
    const order = await this.orderModel.findById(orderId).lean().exec();
    if (!order) return;
    const items = await this.orderItemModel
      .find({ orderId })
      .select("itemPrice itemQuantity")
      .lean()
      .exec();
    const amount = items.reduce(
      (s, i) =>
        s +
        (Number(i.itemPrice) || 0) * (Number(i.itemQuantity) || 0),
      0
    );
    let orderDelivery = 0;
    if (order.orderType === OrderType.DELIVERY) {
      orderDelivery = amount < 100 ? 5 : 0;
    }
    await this.orderModel
      .updateOne(
        { _id: orderId },
        { $set: { orderTotal: amount + orderDelivery, orderDelivery } }
      )
      .exec();
  }

  /**
   * Bitta orderItem `itemQuantity` (0 = qatorni o‘chirish; oxirgi qator bo‘lsa buyurtma ham o‘chadi).
   * `orderTotal` qayta hisoblanadi.
   */
  public async updateOrderItemQuantity(
    member: Member | null,
    table: Table | null,
    orderId: ObjectId,
    orderItemId: ObjectId,
    quantity: number
  ): Promise<Order | null> {
    if (
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ITEM_QUANTITY);
    }

    const hasClient = !!(member?._id ?? table?._id);
    const order = hasClient
      ? await this.orderModel
          .findOne({
            _id: orderId,
            ...this.buildOrderAccessMatch(member, table),
          })
          .exec()
      : await this.orderModel.findOne({ _id: orderId }).exec();
    if (!order) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    this.assertOrderQuantityEditable(order);

    const item = await this.orderItemModel
      .findOne({ _id: orderItemId, orderId })
      .exec();
    if (!item) {
      throw new Errors(HttpCode.NOT_FOUND, Message.ORDER_ITEM_NOT_FOUND);
    }

    if (quantity === 0) {
      await this.orderItemModel.deleteOne({ _id: orderItemId }).exec();
    } else {
      await this.orderItemModel
        .updateOne({ _id: orderItemId }, { $set: { itemQuantity: quantity } })
        .exec();
    }

    const remaining = await this.orderItemModel.countDocuments({ orderId });
    if (remaining === 0) {
      await this.orderModel.deleteOne({ _id: orderId }).exec();
      return null;
    }

    await this.recalculateOrderTotals(orderId);
    return this.getOrderByIdWithDetails(String(orderId));
  }

  public async updateOrder(
    member: Member | null,
    table: Table | null,
    input: OrderUpdateInput
  ): Promise<Order> {
    if (input.orderStatus === undefined) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.ORDER_UPDATE_PAYLOAD);
    }

    const orderId = shapeIntoMongooseObjectId(input.orderId);
    const orderStatus = input.orderStatus;
    const access = this.buildOrderAccessMatch(member, table);

    const result = await this.orderModel
      .findOneAndUpdate(
        {
          _id: orderId,
          ...access,
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

  /**
   * Admin panel: `orderType` i `TABLE` yoki `TAKEOUT` bo‘lganlar va `paymentStatus: PAID`
   * bo‘lgan buyurtmalar qaytarilmaydi.
   */
  public async getAllOrdersPanel(inquiry: OrderInquiry): Promise<Order[]> {
    const andClauses: T[] = [
      { orderStatus: { $ne: OrderStatus.PAUSE } },
      { orderType: { $nin: [OrderType.TABLE, OrderType.TAKEOUT] } },
      { paymentStatus: { $ne: PaymentStatus.PAID } },
    ];

    if (inquiry.payStatus) andClauses.push({ paymentStatus: inquiry.payStatus });
    if (inquiry.payMeth) andClauses.push({ paymentMethod: inquiry.payMeth });
    if (inquiry.status) andClauses.push({ orderStatus: inquiry.status });
    if (inquiry.type) andClauses.push({ orderType: inquiry.type });
    if (inquiry.search)
      andClauses.push({
        orderType: { $regex: new RegExp(inquiry.search, "i") },
      });

    const match: T = { $and: andClauses };

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

  /** LINK + LINK_TAKEOUT buyurtmalar — admin uchun */
  public async getLinkOrders(inquiry?: OrderInquiry): Promise<Order[]> {
    const match: T = {
      orderSource: {
        $in: [OrderSource.LINK, OrderSource.LINK_TAKEOUT],
      },
      orderStatus: { $ne: OrderStatus.PAUSE },
    };
    const page = Math.max(1, Number(inquiry?.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(inquiry?.limit) || 50));

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
    return result || [];
  }

  /**
   * Admin: faqat `/order/link` + `orderType: TABLE` (o‘tirib yeyish), `LINK_TAKEOUT` emas;
   * `paymentStatus: PAID` bo‘lganlar ro‘yxatga kirmaydi.
   */
  public async getLinkOrdersDineInAdmin(
    inquiry?: OrderInquiry
  ): Promise<Order[]> {
    const match: T = {
      orderSource: OrderSource.LINK,
      orderType: OrderType.TABLE,
      orderStatus: { $ne: OrderStatus.PAUSE },
      paymentStatus: { $ne: PaymentStatus.PAID },
    };
    const page = Math.max(1, Number(inquiry?.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(inquiry?.limit) || 50));

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
    return result || [];
  }

  /**
   * Admin: olib ketish — `/order/link` (`TAKEOUT`) va `/order/link-takeout` (`LINK_TAKEOUT`);
   * `paymentStatus: PAID` bo‘lganlar ro‘yxatga kirmaydi.
   */
  public async getLinkOrdersTakeoutAdmin(
    inquiry?: OrderInquiry
  ): Promise<Order[]> {
    const match: T = {
      orderType: OrderType.TAKEOUT,
      orderSource: {
        $in: [OrderSource.LINK, OrderSource.LINK_TAKEOUT],
      },
      orderStatus: { $ne: OrderStatus.PAUSE },
      paymentStatus: { $ne: PaymentStatus.PAID },
    };
    const page = Math.max(1, Number(inquiry?.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(inquiry?.limit) || 50));

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
    return result || [];
  }

  /** Birta buyurtmani to'liq (orderItems, productData, tableNumber, memberNick) qaytaradi — Socket orderCreated uchun */
  public async getOrderByIdWithDetails(orderId: string): Promise<Order | null> {
    const id = shapeIntoMongooseObjectId(orderId);
    const result = await this.orderModel
      .aggregate([
        { $match: { _id: id } },
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
        { $project: { tableData: 0, memberData: 0 } },
      ])
      .exec();
    return result?.[0] ?? null;
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

  /**
   * Admin: buyurtma mijoziga “qabul qilindi” SMS (Twilio).
   * Telefon: `customerPhone`, bo‘lmasa `memberId` bo‘yicha `memberPhone`.
   */
  public async sendOrderAcceptedSms(orderId: string): Promise<void> {
    const oid = shapeIntoMongooseObjectId(orderId);
    const order = await this.orderModel.findById(oid).lean().exec();
    if (!order) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    let phone: string | null =
      typeof order.customerPhone === "string" && order.customerPhone.trim()
        ? order.customerPhone.trim()
        : null;
    if (!phone && order.memberId) {
      phone = await this.memberService.getMemberPhoneById(order.memberId);
    }
    if (!phone) throw new Errors(HttpCode.BAD_REQUEST, Message.SMS_NO_PHONE);

    const body =
      process.env.SMS_ORDER_ACCEPTED_TEXT?.trim() ||
      "Hurmatli mijoz, sizning buyurtmangiz qabul qilindi.";

    await sendTwilioSms(phone, body);
  }

  /** Stol bo‘yicha barcha buyurtmalarni yakunlash (PAID + COMPLETED) — bugungi daromadga kiradi */
  public async completeTableOrders(tableId: string): Promise<{ updatedCount: number; totalSum: number }> {
    const tid = shapeIntoMongooseObjectId(tableId);
    const unpaid = await this.orderModel
      .find({ tableId: tid, paymentStatus: { $ne: PaymentStatus.PAID } })
      .lean()
      .exec();
    if (!unpaid.length) {
      return { updatedCount: 0, totalSum: 0 };
    }
    const totalSum = unpaid.reduce((s, o) => s + (o.orderTotal ?? 0), 0);
    await this.orderModel
      .updateMany(
        { tableId: tid, paymentStatus: { $ne: PaymentStatus.PAID } },
        { $set: { orderStatus: OrderStatus.COMPLETED, paymentStatus: PaymentStatus.PAID } }
      )
      .exec();
    return { updatedCount: unpaid.length, totalSum };
  }

  /** Admin: `orders` da `paymentStatus: PAID` bo‘lganlar soni va `orderTotal` yig‘indisi. */
  public async getPaidOrdersTotalSummary(): Promise<{
    orderCount: number;
    orderTotalSum: number;
  }> {
    const rows = await this.orderModel
      .aggregate([
        { $match: { paymentStatus: PaymentStatus.PAID } },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            orderTotalSum: { $sum: { $ifNull: ["$orderTotal", 0] } },
          },
        },
      ])
      .exec();
    const row = rows[0];
    return {
      orderCount: row?.orderCount ?? 0,
      orderTotalSum: row?.orderTotalSum ?? 0,
    };
  }

  /**
   * Admin: oxirgi **24 soat** ichida yaratilgan (`createdAt`) va `paymentStatus: PAID`
   * bo‘lgan buyurtmalar — soni va `orderTotal` yig‘indisi (kunlik/rolling savdo uchun alohida).
   */
  public async getPaidOrdersRolling24hSummary(): Promise<{
    orderCount: number;
    orderTotalSum: number;
  }> {
    const rows = await this.orderModel
      .aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.PAID,
            $expr: {
              $and: [
                {
                  $gte: [
                    "$createdAt",
                    {
                      $dateSubtract: {
                        startDate: "$$NOW",
                        unit: "hour",
                        amount: 24,
                      },
                    },
                  ],
                },
                { $lte: ["$createdAt", "$$NOW"] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            orderTotalSum: { $sum: { $ifNull: ["$orderTotal", 0] } },
          },
        },
      ])
      .exec();
    const row = rows[0];
    return {
      orderCount: row?.orderCount ?? 0,
      orderTotalSum: row?.orderTotalSum ?? 0,
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

    const data: OrderStatis = {
      totalOrder: allOrders.length,
      pendingOrder: pendingOrder,
      complatedOrder: complatedOrder,
      ordersByCategory: ordersByCategory,
      topSellingItems: topSellingItems,
      todayIncomeAndAOV: todayIncomeAndAOV,
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
          "order.paymentStatus": "PAID",
          "order.orderStatus": { $ne: "CANCELED" },
          // "order.createdAt": { $gte: ISODate("2025-08-01"), $lt: ISODate("2025-09-01") }
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
          "order.paymentStatus": "PAID",
          "order.orderStatus": { $ne: "CANCELED" },
          // "order.createdAt": { $gte: ISODate("2025-08-01"), $lt: ISODate("2025-09-01") }
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
    // Today's Income and Avarege Order Value
    const data = await this.orderModel.aggregate([
      {
        $match: {
          paymentStatus: "PAID",
          orderStatus: { $ne: "CANCELED" },
          $expr: {
            $and: [
              {
                $gte: [
                  "$createdAt",
                  {
                    $dateSubtract: {
                      startDate: "$$NOW",
                      unit: "day",
                      amount: 23,
                      timezone: "Asia/Seoul",
                    },
                  },
                ],
              },
              { $lte: ["$createdAt", "$$NOW"] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          totalSum: { $sum: "$orderTotal" },
          deliverySum: { $sum: "$orderDelivery" },
        },
      },
      {
        $addFields: {
          aovGross: {
            $cond: [
              { $gt: ["$orders", 0] },
              { $divide: ["$totalSum", "$orders"] },
              0,
            ],
          },
        },
      },
      { $project: { _id: 0, orders: 0 } },
    ]);
    return data;
  }
}

export default OrderService;
