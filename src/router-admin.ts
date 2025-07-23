import { Router } from "express";
import adminController from "./controllers/admin.controller";
import productController from "./controllers/product.controller";
import makeUploader from "./libs/utils/uploader";
const routerAdmin = Router();



// Admin
routerAdmin.get('/', adminController.goHome);
routerAdmin
.get('/signup', adminController.getSignup)
.post('/signup', adminController.processSignup);
routerAdmin
.get('/login', adminController.getLogin)
.post('/login', adminController.processLogin);


// Products
routerAdmin
.get(
  '/product/all',
  // restaurantController.verifyRestaurant, 
  productController.getAllProducts
);
routerAdmin
.post(
  '/product/create',
  // restaurantController.verifyRestaurant,
  makeUploader("products").array("productImages", 5), 
  productController.createNewProduct
);
routerAdmin
.post(
  '/product/:id',
  // restaurantController.verifyRestaurant,
  productController.updateChosenProduct
);
// User
routerAdmin
.get(
  '/user/all', 
  adminController.getUsers
);
routerAdmin
.post(
  '/user/edit',
  adminController.updateChosenUser
);

// Table


// Call


// Dashboard

export default routerAdmin;