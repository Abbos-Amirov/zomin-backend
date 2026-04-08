import dotenv from "dotenv";
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});
import mongoose from "mongoose";
import app from "./app";
import { createServer } from "http";
import { Server } from "socket.io";
import OrderService from "./models/Order.service";
import {
  emitTableStatusToClients,
  sendInitialTablesToSocket,
} from "./socket/tableBroadcast";

const PORT = process.env.PORT ?? 3001;
const orderService = new OrderService();

const SOCKET_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://localhost:4009",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:4009",
  "http://38.247.134.248",
  "http://38.247.134.248:3000",
  "http://38.247.134.248:3002",
  "http://38.247.134.248:4009",
  "https://38.247.134.248",
  "https://38.247.134.248:443",
];

let ioInstance: Server;

export function getIo(): Server {
  if (!ioInstance) {
    throw new Error("Socket.io instance not initialized yet!");
  }
  return ioInstance;
}

mongoose
  .connect(process.env.MONGO_URI as string, {})
  .then(() => {
    console.log("MongoDB connection succeed");

    const httpServer = createServer(app);

    ioInstance = new Server(httpServer, {
      cors: {
        origin: SOCKET_ALLOWED_ORIGINS,
        credentials: true,
      },
      transports: ["polling", "websocket"],
    });

    ioInstance.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);
      socket.join("admins");

      const onSubscribeTables = () => {
        void sendInitialTablesToSocket(socket).catch((e) => {
          console.error("table subscribe initial emit error:", e);
        });
      };

      socket.on("subscribePublicTables", onSubscribeTables);
      socket.on("subscribeTableStatus", onSubscribeTables);

      socket.on("unsubscribePublicTables", () => {
        socket.leave("publicTables");
      });
      socket.on("unsubscribeTableStatus", () => {
        socket.leave("publicTables");
      });
    });

    httpServer.listen(PORT, () => {
      console.info(`Server running on http://localhost:${PORT}`);
      setInterval(async () => {
        try {
          const data = await orderService.getAllOrdersPanel({ page: 1, limit: 500 });
          ioInstance.to("admins").emit("panelOrders", data);
        } catch (e) {
          console.error("panelOrders emit error:", e);
        }
      }, 5000);
      setInterval(async () => {
        try {
          const linkOrders = await orderService.getLinkOrders({ page: 1, limit: 500 });
          ioInstance.to("admins").emit("linkOrders", linkOrders);
        } catch (e) {
          console.error("linkOrders emit error:", e);
        }
      }, 5000);
      setInterval(() => {
        void emitTableStatusToClients().catch((e) => {
          console.error("tableStatus emit error:", e);
        });
      }, 5000);
    });
  })
  .catch((err) => {
    console.log("ERROR on MongoDB connection:", err);
  });
