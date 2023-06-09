var db = require("../config/connection");
var collection = require("../config/collection");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const Razorpay = require("razorpay");
const { resolve } = require("path");
const crypto = require("crypto");
const { object } = require("joi");
var instance = new Razorpay({
  key_id: "rzp_test_bYaik8BIHFQdLC",
  key_secret: "Otf2FtyERzKpwAk9DY2OrGLp",
});

module.exports = {
  doSignup: (userData) => {
    let amount = 0;
    userData.wallet = +amount;
    userData.isAllowed = true;
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      db.get().collection(collection.USER_COLLECTION).insertOne(userData);
      resolve(userData);
    });
  },
  
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            resolve({ status: false });
          }
        });
      } else if (user) {
        resolve({ status: false });
      }
    });
  },

  getUser: (userData) => {
    return new Promise(async (resolve, reject) => {
      var user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });
      resolve(user);
    });
  },

  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;

      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },

  getUserByMobile: (mobile) => {
    return new Promise(async (resolve, reject) => {
      var user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ mobile: mobile });
      resolve(user);
    });
  },

  updateUser: (userId, userDetails) => {
    return new Promise((resolve, reject) => {
      // productDetails.price=parseInt(productDetails.price)
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(userId) },
          {
            $set: {
              username: userDetails.username,
              email: userDetails.email,
              firstname: userDetails.firstname,
              lastname: userDetails.lastname,
              mobile: userDetails.mobile,
            },
          },
          { upsert: true }
        )
        .then(() => {
          resolve();
        });
    });
  },

  updatePassword: (userId, password) => {
    return new Promise(async (resolve, reject) => {
      let passwordBcrypt = await bcrypt.hash(password, 10);
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(userId) },
          {
            $set: {
              password: passwordBcrypt,
            },
          }
        )
        .then((result) => {
          resolve(result);
        });
    });
  },

  changeProductQuantity: (details) => {
    details.count = +details.count;
    details.quantity = 1;
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          {
            _id: ObjectId(details.cartId),
            "products.item": ObjectId(details.proId),
          },
          {
            $inc: { "products.$.quantity": details.count },
          }
        )
        .then((response) => {
          resolve({ status: true });
        });
    });
  },
  deleteCartProduct: (details) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: ObjectId(details.cartId) },
          {
            $pull: { products: { item: ObjectId(details.proId) } },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  deleteWishlistProduct: (details) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.WISHLIST_COLLECTION)
        .updateOne(
          { _id: ObjectId(details.cartId) },
          {
            $pull: { products: { item: ObjectId(details.proId) } },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.price"] } },
            },
          },
        ])
        .toArray();
      resolve(total);
    });
  },

  placeOrder: (order, products, total, user) => {
    return new Promise((resolve, reject) => {
      let status =
        user.paymentmethod == "COD" || "wallet" ? "Placed" : "Pending";

      let orderObj = {
        orderId: crypto.randomBytes(8).toString("hex"),
        deliveryDetails: {
          username: order.username,
          address: order.address,
          postalCode: order.pincode,
          state: order.state,
          district: order.district,
          mobile: order.mobile,
          altMobile: order.alternatemobile,
        },
        userId: ObjectId(user.userId),
        products: products,
        paymentMethod: user.paymentmethod,
        status: status,
        total: parseInt(total),
        date: new Date(),
      };
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          resolve(response);
        });
    });
  },
  walletPayment: (user, totalAmount) => {
    let amount = +totalAmount;
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(user.userId) },
          {
            $inc: {
              wallet: -amount,
            },
          }
        );
      resolve();
    });
  },

  decreaseStock: (id, quantity) => {
    return new Promise(async (resolve, reject) => {
      let result = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: ObjectId(id) },
          {
            $inc: { stock: -quantity },
          }
        );
      resolve(result);
    });
  },

  getCartProductList: (order) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(order) });
      resolve(cart.products);
    });
  },

  addAddress: (address, user) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(user) },
          {
            $push: {
              address,
            },
          },
          {
            upsert: true,
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  getAddress: (userId) => {
    return new Promise(async (resolve, reject) => {
      let address = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: ObjectId(userId) });
      resolve(address.address);
    });
  },

  updateCartProductList: (order) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { user: ObjectId(order) },
          {
            $set: {
              brought: true,
            },
          }
        );
      resolve(cart);
    });
  },

  deleteCart: (userId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .deleteOne({ user: ObjectId(userId) })
        .then((response) => {
          resolve(response);
        });
    });
  },

  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: total * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        if (err) {
        } else {
          resolve(order);
        }
      });
    });
  },

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "Otf2FtyERzKpwAk9DY2OrGLp");
      hmac.update(
        details.payment.razorpay_order_id +
          "|" +
          details.payment.razorpay_payment_id
      );
      hmac = hmac.digest("hex");
      if (hmac === details.payment.razorpay_signature) {
        resolve();
      } else {
        reject();
      }
    });
  },
  changeStock: (productId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          {
            _id: ObjectId(productId),
          },
          {
            stock: { $inc: -1 },
          }
        );
    }).then((response) => {
      resolve();
    });
  },

  changeStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          {
            _id: ObjectId(orderId),
          },
          {
            $set: {
              status: "Placed",
            },
          }
        );
    }).then((response) => {
      resolve();
    });
  },
  orderCount: () => {
    return new Promise(async (resolve, reject) => {
      let stats = db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $group: {
              _id: { $month: "$date" }, // Group by month of the "date" field
              totalAmount: { $sum: "$total" }, // Calculate the sum of the "amount" field
            },
          },
        ])
        .toArray();
      resolve(stats);
    });
  },
};
