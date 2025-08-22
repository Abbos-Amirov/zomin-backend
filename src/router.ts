import { Router } from "express";
const router = Router();
import memberController from './controllers/member.controller';
import productController from "./controllers/product.controller";

/** MEMBER */
router.post("/member/login", memberController.login);
router.post("/member/signup", memberController.signup);
router.post("/member/logout", memberController.logout);

/** Product */
router.get("/product/all", productController.getProducts);


export default router;