import { Router } from "express";
import adminController from "./controllers/admin.controller";
import productController from "./controllers/product.controller";
import makeUploader from "./libs/utils/uploader";
import tableController from "./controllers/table.controller";
const routerAdmin = Router();



// Admin
routerAdmin.get('/', adminController.goHome);
routerAdmin
.get('/signup', adminController.getSignup)
.post(
  '/signup',
  makeUploader("members").single("memberImage"), 
  adminController.processSignup);
routerAdmin
.get('/login', adminController.getLogin)
.post('/login', adminController.processLogin);
routerAdmin.get('/logout', adminController.logout);

// Products
routerAdmin
.get(
  '/product/all',
  adminController.verifyRestaurant,
  productController.getAllProducts
);
routerAdmin
.post(
  '/product/create',
  adminController.verifyRestaurant,
  makeUploader("products").array("productImages", 5), 
  productController.createNewProduct
);
routerAdmin
.post(
  '/product/:id',
  adminController.verifyRestaurant,
  productController.updateChosenProduct
);
// User
routerAdmin
.get(
  '/user/all',
  adminController.verifyRestaurant, 
  adminController.getUsers
);
routerAdmin
.post(
  '/user/edit',
  adminController.verifyRestaurant,
  adminController.updateChosenUser
);

// Table
routerAdmin
.get(
  '/table/all', 
  adminController.verifyRestaurant, 
  tableController.getAllTables
);
routerAdmin
.post(
  '/table/create', 
  adminController.verifyRestaurant, 
  tableController.createNewTable
)
.post(
  '/table/:id', 
  adminController.verifyRestaurant, 
  tableController.updateChosenTable
);

// TableCall


// Dashboard

export default routerAdmin;