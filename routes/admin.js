var express = require("express");
var router = express.Router();
const cloudinary = require("../utils/cloundinary");
const upload = require("../utils/multer");
const adminController = require("../controllers/adminControllers");
const productController = require("../controllers/productControllers");
const productHelpers = require("../helpers/productHelper");
const middleware = require("../middleware/loginmiddleware");
const adminHelper = require("../helpers/adminHelper");


router.get(
  "/view-product",
  middleware.verifyAdmin,
  adminController.viewProducts
);

router.route("/")
.get(adminController.login)
.post(adminController.postLogin);

router.get(
  "/add-product",
  middleware.verifyAdmin,
  productController.AddProductFunc
);

router.get('/dashboard', adminController.getDashboard)

router.post(
  "/add-product",
  upload.array("Image"),
  productController.postAddProduct
);

router.get("/manage-user", middleware.verifyAdmin, (req, res) => {
  adminHelper.getAllUsers().then((users) => {
    res.render("admin/manage-user", { users });
  });
});

router.get("/unlist-product/:id", async(req, res) => {
  productHelpers.unListProduct(req.params.id).then((response) => {
    res.redirect("/admin/view-product");
  });
})

router.get("/list-product/:id", async(req, res) => {
  productHelpers.listProduct(req.params.id).then((response) => {
    res.redirect("/admin/view-product");
  });
})

router.patch("/block-user/:id", (req, res) => {
  adminHelper.blockUser(req.params.id);
  res.redirect("/admin/manage-user");
});

router.patch("/unblock-user/:id", (req, res) => {
  adminHelper.unBlockUser(req.params.id);
  res.redirect("/admin/manage-user");
});

router.get('/banners', adminController.viewBanners);  
router.post('/banners', upload.array("Image"),adminController.addBanner);
router.get('/delete-banner/:id', adminController.deleteBanner)


router
  .route("/edit-product/:id", middleware.adminLoggedIn)
  .get(productController.editProduct)
  .post(upload.array("Image"), productController.postEditProducts);

router.get("/add-category",middleware.verifyAdmin, adminController.addCategory_get)

router.post("/add-category",upload.array("Image"), adminController.addCategory_post)

router
  .route("/view-categories")
  .get(middleware.verifyAdmin, adminController.viewCategory);
  
router.get("/orders", middleware.verifyAdmin,adminController.getOrder);

router.get("/order-details/:id",middleware.verifyAdmin,adminController.orderDetails)

router.patch('/cancel-order/:id',middleware.verifyAdmin, adminController.adminCancelOrder)
router.patch('/delivered-order/:id', middleware.verifyAdmin, adminController.deliveredOrder)

router.get('/coupons', adminController.getCoupons)
router.post('/create-code', adminController.createCode)
router.patch('/list-coupon/:id', adminController.listCoupon)
router.patch('/unlist-coupon/:id', adminController.unlistCoupon)

router.get('/verify-coupon/:id', async(req, res)=>{
  let coupon = await adminHelper.verfiyCoupon(req.params.id)

  if(coupon == null){
    res.json({message: 'Invalid coupon'})
  }else{
    if(coupon.isListed){
      res.json({status: true, offerAmount: coupon.offerAmount})
    }else{
      res.json({status: false, message: 'Expired coupon'})
    }
  }
})

router.get('/download-invoice/:id', adminController.downloadInvoice)
module.exports = router;