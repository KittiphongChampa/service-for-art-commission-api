
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
// let options = { timeZone: "Asia/Bangkok" };
// let bangkokTime = date.toLocaleString("th-TH", options);


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
    try {
      dbConn.query(
        "SELECT * FROM users WHERE id=?",
        [userId],
        function (error, users) {
          if (error) {
            return res.status(500).json({ status: "error", message: "status error" });
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
  const myId = req.user.userId;
  const sql4 = `
  SELECT 
    sub_query.id,
    sub_query.urs_name,
    sub_query.urs_profile_img,
    sub_query.sender,
    sub_query.receiver,
    sub_query.message_text,
    sub_query.od_id,
    sub_query.created_at AS last_message_time
  FROM (
    SELECT 
      users.id, 
      users.urs_name, 
      users.urs_profile_img,
      messages.sender, 
      messages.receiver, 
      messages.message_text, 
      IFNULL(messages.od_id, 0) AS od_id,
      messages.created_at,
      
      ROW_NUMBER() OVER (PARTITION BY CASE WHEN messages.sender = ? THEN messages.receiver ELSE messages.sender END ORDER BY messages.created_at DESC) AS rn
    FROM 
        users
    JOIN 
        messages ON (users.id = messages.sender OR users.id = messages.receiver)
    
    WHERE 
        (messages.sender = ? OR messages.receiver = ?) 
        AND users.id != ?
        AND messages.deleted_at IS NULL
        AND messages.od_id IS NULL
  ) AS sub_query
  WHERE rn = 1
  ORDER BY last_message_time DESC;

  `

  const contacts_order = `
  SELECT
    o.od_id, o.artist_id, o.od_q_number, o.od_cancel_by, o.finished_at, o.od_current_step_id as current_step,
    u.id, u.urs_name, u.urs_profile_img,
    SUBSTRING_INDEX(GROUP_CONCAT(m.message_text ORDER BY m.created_at DESC), ',', 1) AS message_text,
    MAX(m.created_at) AS last_message_time,
    (
        SELECT step_name 
        FROM cms_steps 
        WHERE current_step = cms_steps.step_id
    ) AS current_step_name
  FROM
    cms_order o
  JOIN 
    users u ON (u.id = o.customer_id OR u.id = o.artist_id)
  JOIN
    messages m ON (u.id = m.sender OR u.id = m.receiver) AND o.od_id = m.od_id
  WHERE
    (m.sender = ? OR m.receiver = ?) 
    AND u.id != ?
    AND m.deleted_at IS NULL
    AND o.artist_id IS NOT NULL
    AND m.od_id IS NOT NULL
  GROUP BY
    o.od_id,
    o.od_q_number,
    o.od_cancel_by,
    o.finished_at,
    u.id,
    u.urs_name,
    u.urs_profile_img
  ORDER BY
    last_message_time DESC;
  `

  const sql5 = `
  SELECT 
    sub_query.artist_id,
    sub_query.od_id,
    sub_query.od_q_number,
    sub_query.od_cancel_by,
    sub_query.finished_at,
    sub_query.id,
    sub_query.urs_name,
    sub_query.urs_profile_img,
    sub_query.sender,
    sub_query.receiver,
    sub_query.message_text,
    sub_query.last_message_time,
    sub_query.current_step,
    sub_query.current_step_name
  FROM (
    SELECT 
      cms_order.artist_id,
      IFNULL(messages.od_id, 0) AS od_id,
      od_q_number,
      od_cancel_by,
      finished_at,
      users.id, 
      users.urs_name, 
      users.urs_profile_img,
      messages.sender, 
      messages.receiver, 
      MAX(messages.message_text) as message_text,
      MAX(messages.created_at) AS last_message_time,
      (
        SELECT od_current_step_id
        FROM cms_order 
        WHERE messages.od_id = cms_order.od_id
      ) AS current_step,
      (
          SELECT step_name 
          FROM cms_steps 
          WHERE current_step = cms_steps.step_id
      ) AS current_step_name
    FROM 
        users
    JOIN 
        messages ON (users.id = messages.sender OR users.id = messages.receiver)
    LEFT JOIN 
        cms_order ON (users.id = cms_order.customer_id OR users.id = cms_order.artist_id) AND cms_order.od_id = messages.od_id
    LEFT JOIN 
        cms_steps ON cms_steps.step_id = messages.step_id
    WHERE 
        (messages.sender = ? OR messages.receiver = ?) 
        AND users.id != ?
        AND messages.deleted_at IS NULL
        AND cms_order.artist_id IS NOT NULL
        AND messages.od_id IS NOT NULL
    GROUP BY 
        users.id, 
        messages.sender, 
        messages.receiver, 
        messages.od_id,
        messages.message_text

  ) AS sub_query
  ORDER BY sub_query.last_message_time DESC;
  `

  dbConn.query(sql4, 
    [myId, myId, myId, myId],
    function (error, contacts) {
      if (error) {
        console.log(error);
        return res.json({ status: "error", message: "status error" });
      } 

      dbConn.query(contacts_order, 
        [myId, myId, myId],
        function (error, contacts_order) {
          if (error) {
            console.log(error);
            return res.json({ status: "error", message: "status error" });
          } 
          console.log(contacts);
          console.log(contacts_order);
          return res.json({contacts, contacts_order});
        }
      );
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
        //โคลนอีกตารางมาแล้วเลือกว่าMIN ของวันที่นั้นๆมา
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
                isSystemMsg: row.step_id !== 0 || row.status !== null,
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
          "INSERT INTO messages (sender, receiver, message_text, od_id, step_id, checked, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [from, to, message, order_id, step_id, checked, status],
          function (error, result) {
            if (result.affectedRows > 0) {
              return res.json({ status: "ok", msg: "Message added successfully." });
            } else {
              console.log(error);
              return res.json({ status: "error", msg: "Failed to add message to the database." });
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
              return res.json({ status : "ok",msg: "Message added successfully." });
            } else {
              return res.json({ status: "error", msg: "Failed to add message to the database." });
            }
          }
        )

      }

      //-----------------------------------------------------------------------------
    } else {
      // console.log('request : ',req.body);
      const { from, to, od_id } = req.body;
      const file = req.files.image;
      let order_id = od_id;
      if (od_id == 0) {
        order_id = null
      }

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

      const secure_image_chat = image_chat.replace(/^http:/, 'https:');
      
      // console.log(image_chat);
      dbConn.query(
        "INSERT INTO messages (sender, receiver, message_text, od_id) VALUES (?, ?, ?, ?)",
        [from, to, image_chat, order_id],
        function (error, result) {
          // console.log(result.affectedRows);
          if (result.affectedRows > 0) {
            return res.json({ status: "ok",image_chat, msg: "Message added successfully." });
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

exports.testAllchat = (req, res) => {
  const sql = `
  SELECT
    o.od_id, o.od_q_number, o.od_cancel_by, o.finished_at, o.od_current_step_id as current_step,
    u.id AS user_id, u.urs_name, u.urs_profile_img,
    SUBSTRING_INDEX(GROUP_CONCAT(m.message_text ORDER BY m.created_at DESC), ',', 1) AS message_text,
    MAX(m.created_at) AS last_message_time,
    (
        SELECT step_name 
        FROM cms_steps 
        WHERE current_step = cms_steps.step_id
    ) AS current_step_name
  FROM
    cms_order o
  JOIN 
    users u ON u.id = o.customer_id
  JOIN
    messages m ON m.od_id = o.od_id
  WHERE
    o.artist_id = ?
  GROUP BY
    o.od_id,
    o.od_q_number,
    o.od_cancel_by,
    o.finished_at,
    u.id,
    u.urs_name,
    u.urs_profile_img
  ORDER BY
    last_message_time DESC;
  `
  dbConn.query(sql, [74], function(error, results){
    if (error){
      console.log(error);
      res.status(500);
    }
    console.log(results);
    res.status(200).json(results)
  })
}