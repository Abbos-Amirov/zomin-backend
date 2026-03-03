import { NotifStatus } from "../libs/enums/notif.enum";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { Notif, NotifInput, NotifUpdate } from "../libs/types/notif";
import NotifModel from "../schema/Notification.model";
import { ObjectId } from "mongoose";

class NotifService {
  private readonly notifModel;
  constructor() {
    this.notifModel = NotifModel;
  }

  /** Member */
  public async createNotif(input: NotifInput): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        notifType: input.notifType,
        title: input.title,
        message: input.message,
      };
      if (input.orderId != null) data.orderId = shapeIntoMongooseObjectId(input.orderId);
      if (input.tableId != null) data.tableId = shapeIntoMongooseObjectId(input.tableId);
      if (input.notifStatus) data.notifStatus = input.notifStatus;
      await this.notifModel.create(data);
      console.log("Notification created!");
    } catch (err) {
      console.log("Error: createNotif model: ", err);
    }
  }

  public async updateCallNotif(id: ObjectId, input: NotifUpdate): Promise<void> {
    try {
      await this.notifModel.findOneAndUpdate({tableId: id, notifStatus: NotifStatus.PENDING}, input, {new: true});
      console.log("Notification updated!");
    } catch (err) {
      console.log("Error: createNotif model: ", err);
    }
  }

    public async updateOrderNotif(id: ObjectId, input: NotifUpdate): Promise<void> {
    try {
      await this.notifModel.findOneAndUpdate({orderId: id, notifStatus: NotifStatus.PENDING}, input, {new: true});
      console.log("Notification updated!");
    } catch (err) {
      console.log("Error: createNotif model: ", err);
    }
  }

  /** Admin: bazadagi notificationlarni olish (real-time + sahifa yuklanganda) */
  public async getNotifications(status?: NotifStatus): Promise<Notif[]> {
    const match: Record<string, unknown> = {};
    if (status) match.notifStatus = status;
    const result = await this.notifModel
      .find(match)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    return result as Notif[];
  }
}

export default NotifService;
