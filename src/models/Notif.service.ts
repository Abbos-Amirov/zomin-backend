import { shapeIntoMongooseObjectId } from "../libs/config";
import { Notif, NotifInput } from "../libs/types/notif";
import NotifModel from "../schema/Notification.model";

class NotifService {
  private readonly notifModel;
  constructor() {
    this.notifModel = NotifModel;
  }

  /** Member */
  public async createNotif(input: NotifInput): Promise <void> {
    try {
      input.orderId = shapeIntoMongooseObjectId(input.orderId);
      input.tableId = shapeIntoMongooseObjectId(input.tableId);
      await this.notifModel.create(input);
      console.log("Notification created!")
    } catch (err) {
      console.log("Error: createNotif model: ", err);
    }
  }
}

export default NotifService;
