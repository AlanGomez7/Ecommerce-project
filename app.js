const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const db = require("./config/connection");
const adminRouter = require("./routes/admin");
const usersRouter = require("./routes/users");
const session = require("express-session");



require("dotenv").config()

// const mongodb = require('mongodb')

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// app.use(nocache)
app.use(
  session({
    secret: "key",
    cookie: { maxAge: 6000000 },
    resave: false,
    saveUninitialized: true,
  })
);

// set for all headers cahce controller
app.use(function (req, res, next) {
  res.header(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  next();
});

// database connection
db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("Database connected");
  }
});

app.use("/admin", adminRouter);
app.use("/", usersRouter);
// app.use("/admin/*")

app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);

  if (err.message === 'Not Found') {
    res.render('404');
  } else {
    res.render('error');
  }

});

module.exports = app;
