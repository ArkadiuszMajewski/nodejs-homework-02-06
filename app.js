const express = require("express");
const logger = require("morgan");
const cors = require("cors");
const { usersRouter } = require("./users/users.router");

const dotenv = require("dotenv");
const nodemailer = require("nodemailer");

const contactsRouter = require("./routes/api/contacts");

const app = express();

const formatsLogger = app.get("env") === "development" ? "dev" : "short";

app.use(logger(formatsLogger));
app.use(cors());
app.use(express.json());

app.use("/users", usersRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

dotenv.config();

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_PASSWORD,
//   },
// });

// transporter
//   .sendMail({
//     from: process.env.GMAIL_USER,
//     to: process.env.GMAIL_USER,
//     subject: "Hello from nodemailer!",
//     text: "Hello! I'm nodemailer",
//     html: `<h1>Hello!</h1><br/>I\'m <b>nodemailer!</b>`,
//   })
//   .then(console.log)
//   .catch(console.error);

module.exports = { app };
