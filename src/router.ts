import { Router } from "express";
const router = Router();
import memberController from "./controllers/member.controller";
import productController from "./controllers/product.controller";
import makeUploader from "./libs/utils/uploader";
import orderController from "./controllers/order.controller";
import tableController from "./controllers/table.controller";

/** MEMBER */
router.get("/member/restaurant", memberController.getRestaurant);
router.post("/member/login", memberController.login);
router.post("/member/signup", memberController.signup);
router.post("/member/logout", memberController.logout);
router.get(
  "/member/detail",
  memberController.verifyAuth,
  memberController.getMemberDetail
);
router.post(
  "/member/update",
  memberController.verifyMember,
  makeUploader("members").single("memberImage"),
  memberController.updateMember
);
router.get("/member/top-users", memberController.getTopUsers);

/** Product */
router.get("/product/all", productController.getProducts);
router.get(
  "/product/:id",
  memberController.retrieveAuth,
  productController.getProduct
);

/** Order */
router.post(
  "/order/create",
  memberController.verifyAuth,
  orderController.createOrder
);
router.get(
  "/order/all",
  memberController.verifyAuth,
  orderController.getMyOrders
);
router.post(
  "/order/update",
  memberController.verifyAuth,
  orderController.updateOrder
);

/** Table */
router
  .get("/table/qr/:id", tableController.qrLanding)
  .get(
    "/table/call/:id",
    tableController.verifyTable,
    tableController.clickTableCall
  );

export default router;
