import dotenv from "dotenv";
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});
import mongoose from "mongoose";
import app from "./app";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT ?? 4010;

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
        origin: "*",
        credentials: true,
      },
      transports: ["websocket"],
    });

    ioInstance.on("connection", (socket) => {
      console.log(" Admin connected:", socket.id);
      socket.join("admins");
    });

    httpServer.listen(PORT, () => {
      console.info(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("ERROR on MongoDB connection:", err);
  });
