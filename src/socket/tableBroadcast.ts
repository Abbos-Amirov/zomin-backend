import type { Socket } from "socket.io";
import TableService from "../models/Table.service";

const tableService = new TableService();

const TABLES_PAGE = { page: 1, limit: 500 } as const;
const TABLES_OPTS = { omitSensitive: true } as const;

/** Birinchi marta obuna bo‘lganda (GET /table/all bilan bir xil ma’lumot) */
export async function sendInitialTablesToSocket(socket: Socket): Promise<void> {
  socket.join("publicTables");
  const data = await tableService.getAllTables(TABLES_PAGE, TABLES_OPTS);
  socket.emit("tableStatus", data);
  socket.emit("tableAll", data);
}

/** Barcha client obunachilariga stollar holatini yuborish */
export async function emitTableStatusToClients(): Promise<void> {
  const { getIo } = await import("../server");
  const io = getIo();
  const data = await tableService.getAllTables(TABLES_PAGE, TABLES_OPTS);
  io.to("publicTables").emit("tableStatus", data);
  io.to("publicTables").emit("tableAll", data);
}
