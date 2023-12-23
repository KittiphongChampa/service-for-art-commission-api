
let jwt = require("jsonwebtoken");
const secret_token = "mysecret_id";
const randomstring = require("randomstring");
const fs = require("fs");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const saltRounds = 10;

const mysql = require('mysql2')
const dbConn = mysql.createConnection(process.env.DATABASE_URL)
// let dbConn = mysql.createConnection({
//     host: "192.185.184.112",
//     user: "itweb176_itweb1766",
//     password: "XPWVySBR@a+H",
//     database: "itweb176_projectdb",
// });
// dbConn.connect();

let date = new Date();
let options = { timeZone: "Asia/Bangkok" };
let bangkokTime = date.toLocaleString("en-US", options);

exports.chatPartner = (req, res) => {
    const partnerID = req.params.id;
    try {
      dbConn.query(
        "SELECT id, urs_name, urs_profile_img  FROM users WHERE id=?",
        [partnerID],
        function (error, partner) {
          console.log(partner);
          if (error) {
            return res.json({ status: "error", message: "status error" });
          }else{
            return res.json(partner);
          }
        }
      );
    } catch (err) {
      return res.json({ status: "error", message: err.message });
    }
}

exports.index = (req, res) => {
    const userId = req.user.userId;
    // const adminId = req.user.adminId;
    // const role = req.user.role;
    try {
      dbConn.query(
        "SELECT * FROM users WHERE id=?",
        [userId],
        function (error, users) {
          if (userId === 'undefined') {
            return res.json({ status: "ok_butnotuser" });
          } else if (users[0].id !== userId) {
            return res.json({ status: "error", message: "ไม่พบผู้ใช้" });
          }
          // const urs_token = decrypt(users[0].urs_token);
          return res.json({ status: "ok", users });
        }
      );
    } catch (err) {
      return res.json({ status: "error", message: err.message });
    }
};

exports.allchat = (req, res) => {
    const myId = req.params.id;
    dbConn.query(
      "SELECT users.id, users.urs_name, users.urs_profile_img, messages.sender, messages.receiver, messages.message_text, MAX(messages.created_at) AS last_message_time " +
      "FROM users " +
      "JOIN messages ON ((users.id = messages.receiver) OR (users.id = messages.sender)) WHERE ((messages.receiver = ?) OR (messages.sender = ?)) AND users.id != ? " +
      "GROUP BY users.id, users.urs_name, users.urs_profile_img, messages.sender, messages.receiver, messages.message_text " +
      "ORDER BY last_message_time DESC", // เพิ่ม ORDER BY เพื่อเรียงลำดับตามเวลาของข้อความที่ถูกส่งล่าสุด
      [myId,myId,myId],
      function (error, users) {
        if (error) {
          return res.json({ status: "error", message: "status error" });
        } else {
          return res.json(users);
        }
      }
    );
};

exports.getMessages = (req, res, next) => {
    // console.log('เข้า getMessages ', req.body);
    try {
      const { from, to } = req.body;
      dbConn.query(
        "SELECT sender, receiver, message_text, created_at FROM messages WHERE sender IN (?, ?) AND receiver IN (?, ?)",
        [from, to, from, to],
        function (error, results) {
          const projectedMessages = results.map((row) => {
            return {
              fromSelf: row.sender.toString() == from,
              message: row.message_text,
              created_at: row.created_at,
            };
          });
          res.json(projectedMessages);
        }
      );
    } catch (ex) {
      next(ex);
    }
};

exports.addMessages = (req, res, next) => {
    try {
      if (req.files === undefined) {
        // return res.json({ status: "error", message: "No File Uploaded" });
        //-----------------------------------------------------------------------------
        const { from, to, message } = req.body;
        dbConn.query(
          "INSERT INTO messages (sender, receiver, message_text) VALUES (?, ?, ?)", 
          [from, to, message],
          function(error, result){
            // console.log(result.affectedRows);
            if (result.affectedRows > 0) {
              return res.json({ msg: "Message added successfully." });
            } else {
              return res.json({ msg: "Failed to add message to the database." });
            }
          }
        )
        //-----------------------------------------------------------------------------
      } else {
        const { from, to } = req.body;
        const file = req.files.image;
        var filename_random = __dirname.split("controllers")[0] + "/public/images_chat/" + randomstring.generate(50) + ".jpg";
        if (fs.existsSync("filename_random")) {
          filename_random =
            __dirname.split("controllers")[0] +
            "/public/images_chat/" +
            randomstring.generate(60) +
            ".jpg";
          file.mv(filename_random);
        } else {
          file.mv(filename_random);
        }
        const image = filename_random.split("/public")[1];
        const image_chat = `${req.protocol}://${req.get("host")}${image}`;
        // console.log(image_chat);
        dbConn.query(
          "INSERT INTO messages (sender, receiver, message_text) VALUES (?, ?, ?)", 
          [from, to, image_chat],
          function(error, result){
            // console.log(result.affectedRows);
            if (result.affectedRows > 0) {
              return res.json({ image_chat, msg: "Message added successfully." });
            } else {
              return res.json({ msg: "Failed to add message to the database." });
            }
          }
        )
      }
    } catch (ex) {
      next(ex);
    }
};