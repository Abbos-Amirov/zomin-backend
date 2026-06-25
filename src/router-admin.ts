import { Router } from "express";
import adminController from "./controllers/admin.controller";
import productController from "./controllers/product.controller";
import makeUploader from "./libs/utils/uploader";
import tableController from "./controllers/table.controller";
import orderController from "./controllers/order.controller";
const routerAdmin = Router();

routerAdmin.use(adminController.verifyAdmin);

// Products
routerAdmin.get("/product/all", productController.getAllProducts);
routerAdmin.post(
  "/product/create",
  makeUploader("products").array("productImages", 5),
  productController.createNewProduct
);
routerAdmin.get(
  "/product/:id/toggle-status",
  productController.toggleProductStatus
);
routerAdmin.patch(
  "/product/:id/toggle-status",
  productController.toggleProductStatus
);
routerAdmin.post(
  "/product/:id/toggle-status",
  productController.toggleProductStatus
);
routerAdmin.post(
  "/product/:id",
  makeUploader("products").array("productImages", 5),
  productController.updateChosenProduct
);
routerAdmin.get(
  "/product/all/stat",
  productController.getProductsStat
);
routerAdmin.post(
  "/product/delete/:id",
  productController.deleteChosenProduct
);

// User
routerAdmin.get(
  "/user/all",
  adminController.getUsers
);
routerAdmin.post(
  "/user/edit",
  adminController.updateChosenUser
);

// Table
routerAdmin.get(
  "/table/all",
  tableController.getAllTables
);
routerAdmin
  .post(
    "/table/create",
    tableController.createNewTable
  )
  .post(
    "/table/:id",
    tableController.updateChosenTable
  )
  .post(
    "/table/delete/:id",
    tableController.deleteChosenTable
  );

// Notifications (bazadagi + real-time uchun)
routerAdmin.get("/notifications", adminController.getNotifications);

// Orders
routerAdmin.get(
  "/order/all",
  orderController.getAllOrders
);
routerAdmin.post(
  "/order/purge-by-member",
  orderController.deleteOrdersByMemberId
);
routerAdmin.post(
  "/order/purge-by-table",
  orderController.deleteOrdersByTableId
);
routerAdmin.post(
  "/order/delivery/mark-paid",
  orderController.markDeliveryTableOrderPaid
);
routerAdmin.delete(
  "/order/purge-by-table",
  orderController.deleteOrdersByTableId
);

routerAdmin.get(
  "/orders/all/panel",
  orderController.getAllOrdersPanel
);
routerAdmin.get(
  "/order/link/dine-in",
  orderController.getLinkOrdersDineInAdmin
);
routerAdmin.get(
  "/order/link/takeout",
  orderController.getLinkOrdersTakeoutAdmin
);
routerAdmin.get(
  "/order/link",
  orderController.getLinkOrders
);
routerAdmin.post(
  "/order/:id/notify-accepted-sms",
  orderController.notifyOrderAcceptedSms
);
routerAdmin.post(
  "/order/:id",
  orderController.updateChosenOrder
);
routerAdmin.get(
  "/order/paid/summary",
  orderController.getPaidOrdersTotalSummary
);
routerAdmin.get(
  "/order/paid/last-24h",
  orderController.getPaidOrdersRolling24hSummary
);
routerAdmin.get(
  "/order/statis",
  orderController.getOrderStatis
);
routerAdmin.get(
  "/order/table/:id/complete",
  orderController.completeTableOrders
);
routerAdmin.post(
  "/order/table/:id/complete",
  orderController.completeTableOrders
);

export default routerAdmin;
