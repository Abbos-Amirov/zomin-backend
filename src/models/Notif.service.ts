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
      input.orderId = shapeIntoMongooseObjectId(input.orderId);
      input.tableId = shapeIntoMongooseObjectId(input.tableId);
      await this.notifModel.create(input);
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
}

export default NotifService;
