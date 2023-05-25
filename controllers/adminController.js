const cloudinary = require("../utils/cloundinary");
const createError = require("http-errors");
const adminHelpers = require("../helpers/adminHelper");
const couponHelpers = require("../helpers/couponHelper");
const productHelpers = require("../helpers/productHelper");
const authSchema = require("../models/authmodel");
const userHelper = require("../helpers/userHelper");
const crypto = require("crypto");
const adminHelper = require("../helpers/adminHelper");

module.exports = {
  login: (req, res, next) => {
    if (req.session.admin) {
      res.redirect("/admin");
    } else {
      let err = "";
      res.render("admin/admin-login", { err });
      req.session.adminLoginErr = false;
    }
  },

  verifyCoupon: async (req, res) => {
    let coupon = await adminHelper.verfiyCoupon(req.params.id);
    if (coupon == null) {
      res.json({ message: "Invalid coupon" });
    } else {
      if (coupon.isListed && coupon.isActive) {
        res.json({ status: true, offerAmount: coupon.offerAmount });
      } else {
        res.json({ status: false, message: "Expired coupon" });
      }
    }
  },

  postLogin: async (req, res, next) => {
    try {
      var { error, value } = await authSchema.LoginAuthSchema.validate(
        req.body
      );
      if (error) throw createError.BadRequest("Invalid Credentials.");
      let response = await adminHelpers.doLogin(value);
      if (response.status) {
        req.session.adminLoggedIn = true;
        req.session.admin = response.admin;

        res.redirect("/admin/view-product");
      } else {
        throw createError.BadRequest("User not an administrator");
      }
    } catch (err) {
      res.render("admin/admin-login", { err });
    }
  },

  viewProducts: (req, res) => {
    productHelpers.getAllProducts().then((products) => {
      res.render("admin/view-product", { products });
    });
  },

  addCategory_post: async (req, res) => {
    try {
      let catname = req.body.categoryname;
      if (catname.length < 3) throw createError.Forbidden("Invalid Input");
      req.body.categoryname = catname.toUpperCase();
      let result = await adminHelpers.getCategory(req.body.categoryname);
      if (result == undefined){
        req.body.isListed = true;
        adminHelpers.addCategory(req.body, async (id) => {});
      }else{
        throw createError.Forbidden("Already Exsists");
      }
    } catch (err) {
      res.json({status: false, message: "Category already exists"})
    }
  },

  editCategory_post: async (req, res) => {
    try {
      let catname = req.body.categoryname;
      if (catname.length < 3) throw createError.Forbidden("Invalid Input");
      req.body.categoryname = catname.toUpperCase();
      adminHelpers.editCategory(req.body);

      req.session.submitStatus = "category Added";
      res.redirect("/admin/view-categories");
    } catch (err) {
      console.log(err);
    }
  },

  viewCategory: (req, res) => {
    adminHelpers.getCategories().then((categories) => {
      res.render("admin/view-categories", { categories, banners: false });
    });
  },

  getOrder: async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 5;
    const skip = (page - 1) * pageSize;
    let orders = await adminHelpers.getOrders(skip, pageSize);
    const count = await adminHelpers.findOrderCount();
    const totalPages = Math.ceil(count / pageSize);
    const currentPage = page > totalPages ? totalPages : page;
    res.render("admin/order", {
      orders,
      totalPages,
      currentPage,
      pageSize,
      result: 0,
    });
  },

  orderDetails: async (req, res) => {
    let orderDetails = await adminHelpers.orderDetails(req.params.id);
    let products = await adminHelpers.getOrderProducts(req.params.id);
    res.render("admin/order-details", {
      products,
      orderDetails,
      orderId: products[0]._id,
    });
  },

  adminCancelOrder: async (req, res) => {
    let order = await adminHelpers.orderDetails(req.params.id);
    adminHelpers.cancelOrder(req.params.id).then((response) => {
      if (order[0].status === "Placed" && order.paymentMethod !== "COD") {
        adminHelpers.returnMoney(order[0].userId, order[0].total);
      }
      res.send(response);
    });
  },

  deliveredOrder: async (req, res) => {
    adminHelpers.deliveredOrder(req.params.id).then((response) => {
      res.send(response);
    });
  },

  getDashboard: async (req, res) => {
    let orders = await adminHelpers.getAllOrders();
    let amount = await adminHelpers.totalOrderAmount();
    let productsCount = await adminHelpers.findProductCount()
    let cancelCount = await adminHelpers.cancelledOrderCount();
    let pendingCount = await adminHelpers.pendingOrderCount();
    let placedCount = await adminHelpers.placedOrderCount();
    let result = [];
    result.push(cancelCount, placedCount, pendingCount);
    let stats = await userHelper.orderCount();
    let data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < stats.length; i++) {
      data[stats[i]._id] = stats[i].totalAmount;
    }
    res.render("admin/dashboard", {
      result,
      order: orders.length,
      data,
      amount,
      productsCount
    });
  },

  viewBanners: async (req, res) => {
    let banners = await adminHelpers.getBanners();
    res.render("admin/view-banners", { banners });
  },

  addBanner: async (req, res) => {
    try {
      const imgUrl = [];
      for (let i = 0; i < req.files.length; i++) {
        const result = await cloudinary.uploader.upload(req.files[i].path);
        imgUrl.push(result.url);
      }
      adminHelpers.addBanner(req.body, async (id) => {
        productHelpers.addBannerImages(id, imgUrl).then((response) => {});
      });
    } catch (err) {
      console.log(err);
    } finally {
      req.session.submitStatus = "Banner Added";
      res.redirect("/admin/banners");
    }
  },
  deleteBanner: (req, res) => {
    adminHelpers.deleteBanner(req.params.id).then((response) => {
      res.json({ deleted: true });
    });
  },
  getCoupons: async (req, res) => {
    let coupons = await adminHelpers.getCoupons();

    res.render("admin/coupons", { coupons });
  },

  createCode: async (req, res) => {
    let token = "COUPON" + crypto.randomBytes(2).toString("hex");
    req.body.code = token;
    req.body.offerAmount = +req.body.offerAmount;
    req.body.minPurchase = +req.body.minPurchase;
    req.body.isListed = true;
    req.body.isActive = true;
    adminHelpers.addCoupons(req.body);
    let coupons = await adminHelpers.getCoupons();
    res.render("admin/coupons", { coupons });
  },
  listCoupon: (req, res) => {
    couponHelpers.listCoupon(req.params.id).then(() => {
      res.redirect("/admin/coupons");
    });
  },
  unlistCoupon: (req, res) => {
    couponHelpers.unlistCoupon(req.params.id).then((response) => {
      res.redirect("/admin/coupons");
    });
  },
  salesReport : async(req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 5;
    const skip = (page - 1) * pageSize;
    let orders = await adminHelpers.getOrders(skip, pageSize);
    const count = await adminHelpers.findOrderCount();
    const totalPages = Math.ceil(count / pageSize);
    const currentPage = page > totalPages ? totalPages : page;
    res.render("admin/sales-report", {
      orders,
      totalPages,
      currentPage,
      pageSize,
      result: 0,
    });
  },
};
