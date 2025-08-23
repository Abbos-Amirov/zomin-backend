import { Member } from "../types/member";
import { Table } from "../types/table";

export function isMember(client: Member | Table): client is Member {
  return (client as Member).memberType !== undefined;
}
export function isTable(client: Member | Table): client is Table {
  return (client as Table).tableNumber !== undefined; 
}
