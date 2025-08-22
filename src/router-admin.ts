import { Router } from "express";
import adminController from "./controllers/admin.controller";
import productController from "./controllers/product.controller";
import makeUploader from "./libs/utils/uploader";
import tableController from "./controllers/table.controller";
import orderController from "./controllers/order.controller";
const routerAdmin = Router();


// Products
routerAdmin
.post(
  '/product/create',
  // TODO: AUTH
  makeUploader("products").array("productImages", 5), 
  productController.createNewProduct
);
routerAdmin
.post(
  '/product/:id',
  // TODO: AUTH
  makeUploader("products").array("productImages", 5), 
  productController.updateChosenProduct
);

// User
routerAdmin
.get(
  '/user/all',
  // TODO: AUTH
  adminController.getUsers
);
routerAdmin
.post(
  '/user/edit',
  // TODO: AUTH
  adminController.updateChosenUser
);

// Table
routerAdmin
.get(
  '/table/all', 
  // TODO: AUTH
  tableController.getAllTables
);
routerAdmin
.post(
  '/table/create', 
  // TODO: AUTH
  tableController.createNewTable
)
.post(
  '/table/:id', 
  // TODO: AUTH
  tableController.updateChosenTable
);

// Orders
routerAdmin
.get(
  '/order/all',
  // TODO: AUTH
  orderController.getAllOrders
);
routerAdmin
.post(
  '/order/:id',
  // TODO: AUTH
  orderController.updateChosenOrder
);

// Dashboard

export default routerAdmin;