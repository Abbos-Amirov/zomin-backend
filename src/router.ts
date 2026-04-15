import { Router } from "express";
const router = Router();
import memberController from "./controllers/member.controller";
import productController from "./controllers/product.controller";
import makeUploader from "./libs/utils/uploader";
import orderController from "./controllers/order.controller";
import tableController from "./controllers/table.controller";

/** MEMBER */
router
  .get("/member/restaurant", memberController.getRestaurant)
  .post("/member/login", memberController.login)
  .post("/member/signup", memberController.signup)
  .post("/member/logout", memberController.logout)
  .get(
    "/member/detail",
    // memberController.verifyAuth,
    memberController.getMemberDetail
  )
  .post(
    "/member/update",
    memberController.verifyMember,
    makeUploader("members").single("memberImage"),
    memberController.updateMember
  )
  .get("/member/top-users", memberController.getTopUsers);

/** Product */
router
  .get("/product/all", productController.getProducts)
  .get(
    "/product/:id",
    memberController.retrieveAuth,
    productController.getProduct
  );

/** Order */
router
  .get("/orders/all-member", orderController.getOrdersAllMember)
  .post("/orders/cancel-by-member", orderController.cancelOrdersByMember)
  .post(
    "/order/create",
    memberController.verifyAuth,
    orderController.createOrder
  )
  .post("/order/link", orderController.createLinkOrder)
  .post("/order/link-takeout", orderController.createLinkTakeoutOrder)
  .get("/order/all", memberController.verifyAuth, orderController.getMyOrders)
  .post(
    "/order/update",
    memberController.verifyAuth,
    orderController.updateOrder
  );

/** Table */
router
  .get("/table/all", tableController.getPublicTables)
  .get("/table/qr/:id", tableController.qrLanding)
  .get(
    "/table/call/:id",
    tableController.verifyTable,
    tableController.clickTableCall
  )
  .post(
    "/table/logout",
    tableController.verifyTable,
    tableController.TableLogout
  );

export default router;
