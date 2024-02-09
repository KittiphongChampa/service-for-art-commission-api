
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
          // console.log(partner);
          if (error) {
            return res.json({ status: "error", message: "status error" });
          }
          return res.json(partner);
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

// exports.allchat = (req, res) => {
//     const myId = req.params.id;
//     dbConn.query(
//       "SELECT users.id, users.urs_name, users.urs_profile_img, messages.sender, messages.receiver, messages.message_text, MAX(messages.created_at) AS last_message_time " +
//       "FROM users " +
//       "JOIN messages ON ((users.id = messages.receiver) OR (users.id = messages.sender)) WHERE ((messages.receiver = ?) OR (messages.sender = ?)) AND users.id != ? " +
//       "GROUP BY users.id, users.urs_name, users.urs_profile_img, messages.sender, messages.receiver, messages.message_text " +
//       "ORDER BY last_message_time DESC", // เพิ่ม ORDER BY เพื่อเรียงลำดับตามเวลาของข้อความที่ถูกส่งล่าสุด
//       [myId,myId,myId],
//       function (error, users) {
//         if (error) {
//           return res.json({ status: "error", message: "status error" });
//         } else {
//           return res.json(users);
//         }
//       }
//     );
// };

// exports.getMessages = (req, res, next) => {
//     // console.log('เข้า getMessages ', req.body);
//     try {
//       const { from, to } = req.body;
//       dbConn.query(
//         "SELECT sender, receiver, message_text, created_at FROM messages WHERE sender IN (?, ?) AND receiver IN (?, ?)",
//         [from, to, from, to],
//         function (error, results) {
//           const projectedMessages = results.map((row) => {
//             return {
//               fromSelf: row.sender.toString() == from,
//               message: row.message_text,
//               created_at: row.created_at,
//             };
//           });
//           res.json(projectedMessages);
//         }
//       );
//     } catch (ex) {
//       next(ex);
//     }
// };

// exports.addMessages = (req, res, next) => {
//     try {
//       if (req.files === undefined) {
//         // return res.json({ status: "error", message: "No File Uploaded" });
//         //-----------------------------------------------------------------------------
//         const { from, to, message } = req.body;
//         dbConn.query(
//           "INSERT INTO messages (sender, receiver, message_text) VALUES (?, ?, ?)",
//           [from, to, message],
//           function(error, result){
//             // console.log(result.affectedRows);
//             if (result.affectedRows > 0) {
//               return res.json({ msg: "Message added successfully." });
//             } else {
//               return res.json({ msg: "Failed to add message to the database." });
//             }
//           }
//         )
//         //-----------------------------------------------------------------------------
//       } else {
//         const { from, to } = req.body;
//         const file = req.files.image;
//         var filename_random = __dirname.split("controllers")[0] + "/public/images_chat/" + randomstring.generate(50) + ".jpg";
//         if (fs.existsSync("filename_random")) {
//           filename_random =
//             __dirname.split("controllers")[0] +
//             "/public/images_chat/" +
//             randomstring.generate(60) +
//             ".jpg";
//           file.mv(filename_random);
//         } else {
//           file.mv(filename_random);
//         }
//         const image = filename_random.split("/public")[1];
//         const image_chat = `${req.protocol}://${req.get("host")}${image}`;
//         // console.log(image_chat);
//         dbConn.query(
//           "INSERT INTO messages (sender, receiver, message_text) VALUES (?, ?, ?)",
//           [from, to, image_chat],
//           function(error, result){
//             // console.log(result.affectedRows);
//             if (result.affectedRows > 0) {
//               return res.json({ image_chat, msg: "Message added successfully." });
//             } else {
//               return res.json({ msg: "Failed to add message to the database." });
//             }
//           }
//         )
//       }
//     } catch (ex) {
//       next(ex);
//     }
// };

exports.allchat = (req, res) => {
  const myId = req.user.userId;
  // const sql1 = `
  // SELECT 
  //   cms_order.artist_id,
  //   messages.od_id,
  //   users.id,
  //   users.urs_name,
  //   users.urs_profile_img,
  //   messages.sender,
  //   messages.receiver,
  //   (SELECT MAX(sub_messages.step_id) FROM messages AS sub_messages WHERE messages.od_id = sub_messages.od_id) AS current_step,
  //   (SELECT step_name FROM cms_steps WHERE current_step = cms_steps.step_id) AS current_step_name,
  //   messages.od_id,
  //   messages.step_id,
  //   MAX(messages.created_at) AS last_message_time,
  //   IFNULL(messages.od_id, 0) AS od_id
  // FROM users
  // JOIN messages ON (users.id = messages.receiver OR users.id = messages.sender)
  // LEFT JOIN cms_steps ON cms_steps.step_id = messages.step_id
  // LEFT JOIN cms_order ON (users.id = cms_order.customer_id OR users.id = cms_order.artist_id) AND cms_order.od_id = messages.od_id
  // WHERE (messages.receiver = ? OR messages.sender = ?) AND users.id != ?
  // GROUP BY users.id, messages.sender, messages.receiver, messages.od_id, messages.step_id
  // ORDER BY last_message_time DESC;

  // `

  const sql1 = `
    SELECT 
    cms_order.artist_id,
    messages.od_id,
    users.id,
    users.urs_name,
    users.urs_profile_img,
    messages.sender,
    messages.receiver,
    (
        SELECT MAX(sub_messages.step_id) 
        FROM messages AS sub_messages 
        WHERE messages.od_id = sub_messages.od_id
    ) AS current_step,
    (
        SELECT step_name 
        FROM cms_steps 
        WHERE current_step = cms_steps.step_id
    ) AS current_step_name,
    messages.od_id,
    messages.step_id,
    MAX(messages.created_at) AS last_message_time,
    IFNULL(messages.od_id, 0) AS od_id
    FROM users
    JOIN messages ON (users.id = messages.receiver OR users.id = messages.sender)
    LEFT JOIN cms_steps ON cms_steps.step_id = messages.step_id
    LEFT JOIN cms_order ON (users.id = cms_order.customer_id OR users.id = cms_order.artist_id) AND cms_order.od_id = messages.od_id
    WHERE (messages.receiver = ? OR messages.sender = ?) AND users.id != ?
    GROUP BY users.id, messages.sender, messages.receiver, messages.od_id, messages.step_id
    ORDER BY last_message_time DESC;

    `
  dbConn.query(sql1, 
    [myId, myId, myId],
    function (error, users) {
      if (error) {
        console.log(error);
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
    const { from, to, od_id } = req.body;
    if (od_id == 0 || od_id == null || od_id == undefined) {
      // console.log('ออเดอร์ไอดีนี้เป็น 0 = แชทส่วนตัว')
      dbConn.query(
        `SELECT sender, receiver, message_text, created_at 
      FROM messages
      WHERE sender IN (?, ?) AND receiver IN (?, ?) AND (od_id IS NULL )` ,
        [from, to, from, to],
        function (error, results) {
          const projectedMessages = results.map((row) => {
            return {
              fromSelf: row.sender.toString() == from,
              message: row.message_text,
              created_at: row.created_at,
              sender: row.sender,
              isSystemMsg: false
            };
          });
          res.json(projectedMessages);
        }
      );
    } else {
      const resImg = `
        SELECT * FROM attach_img 
        JOIN messages ON messages.id = attach_img.chat_id
        WHERE messages.od_id = ?
      `
      dbConn.query(resImg,[od_id], (error, resImgResult) => {
        if (error) {
          console.log(error);
        }
        // console.log("resImgResult : ",resImgResult);
        dbConn.query(
          `SELECT messages.id AS msgId, sender, receiver, message_text, created_at,messages.step_id,cms_steps.checked_at,cms_steps.step_name,cms_steps.step_type,messages.od_id, messages.checked,messages.status,
          (SELECT MAX(messages.step_id) FROM messages JOIN cms_steps ON messages.step_id = cms_steps.step_id WHERE (messages.od_id = cms_steps.od_id AND messages.checked = 0) AND cms_steps.step_name LIKE '%ภาพ%' ) AS wip_sent
        FROM messages
        LEFT JOIN cms_steps ON cms_steps.od_id = messages.od_id AND messages.step_id = cms_steps.step_id
        WHERE (sender IN (?, ?) OR sender IS NULL) AND (receiver IN (?, ?) OR receiver IS NULL) AND (messages.od_id = ?) AND (messages.deleted_at IS NULL)` ,
          //สำหรับข้อความจากระบบ sender reciever จะเป็น null 
          [from, to, from, to, od_id],
          function (error, results) {
            const projectedMessages = results.map((row) => {
              let imgArray = []
              // console.log(resImg)
  
              if(resImgResult){
                resImgResult.map((r)=>{ 
                  if(r.chat_id == row.msgId){
                    imgArray.push(r.att_img_path)
                  }
                })
              }
              return {
                img : imgArray,
                fromSelf: row.sender?.toString() == from,
                message: row.message_text,
                sender: row.sender,
                created_at: row.created_at,
                checked_at: row.checked_at,
                step_name: row.step_name,
                step_type: row.step_type,
                step_id: row.step_id,
                od_id: row.od_id,
                status: row.status,
                checked: row.checked,
                isSystemMsg: row.step_id !== 0,
                wip_sent: row.wip_sent,
                msgId: row.msgId
                // sender: row.sender
              };
            });
            res.json(projectedMessages);
          }
        );
      } )
    }
  } catch (ex) {
    next(ex);
  }
};

exports.addMessages = (req, res, next) => {
  try {
    if (req.files === undefined) {
      // return res.json({ status: "error", message: "No File Uploaded" });
      //-----------------------------------------------------------------------------
      const { from, to, message, od_id, step_id, checked, status } = req.body;
      let order_id = od_id;
      if (od_id == 0 || od_id == undefined) {
        order_id = null
      }
      // ข้อมูลจากระบบ
      if (step_id !== undefined && checked !== undefined) {
        // order_id = null
        // console.log('dssdsdsdsd=',req.body);
        dbConn.query(
          "INSERT INTO messages (sender, receiver, message_text,od_id,step_id,checked,status) VALUES (?, ?, ?, ?, ?, ?,?)",
          [from, to, message, order_id, step_id, checked, status],
          function (error, result) {
            if (result.affectedRows > 0) {
              return res.json({ msg: "Message added successfully." });
            } else {
              console.log(error);
              return res.json({ msg: "Failed to add message to the database." });
            }
          }
        )
      } else {
        dbConn.query(
          "INSERT INTO messages (sender, receiver, message_text,od_id) VALUES (?, ?, ?, ?)",
          [from, to, message, order_id],
          function (error, result) {
            // console.log(result.affectedRows);
            if (result.affectedRows > 0) {
              return res.json({ msg: "Message added successfully." });
            } else {
              return res.json({ msg: "Failed to add message to the database." });
            }
          }
        )

      }


      //-----------------------------------------------------------------------------
    } else {
      const { from, to } = req.body;
      const file = req.files.image;
      let order_id = od_id;
      if (od_id == 0) {
        order_id = null
      }
      // console.log('request : ',req.body);
      // console.log(file);
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
        "INSERT INTO messages (sender, receiver, message_text,od_id) VALUES (?, ?, ?,?)",
        [from, to, image_chat, od_id],
        function (error, result) {
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

}