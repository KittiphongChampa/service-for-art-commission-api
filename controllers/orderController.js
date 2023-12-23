let jwt = require("jsonwebtoken");
const secret_token = "mysecret_id";
const randomstring = require("randomstring");
const fs = require("fs");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const saltRounds = 10;

const mysql = require('mysql2')
const dbConn = mysql.createConnection(process.env.DATABASE_URL)

let date = new Date();
let options = { timeZone: "Asia/Bangkok" };
let bangkokTime = date.toLocaleString("en-US", options);

exports.user_addOrder = (req, res) => {
    const userID = req.user.userId;
    const { cmsID, artistId, pkgId, od_use_for, od_detail } = req.body;
  
    // 1. ดึงค่าลำดับคิว (Queue) จากตาราง commission
    dbConn.query(`SELECT cms_amount_q FROM commission WHERE cms_id=?`, [cmsID],
      function(error, results) {
        if (error) {
          return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
        } else {
          const Queue = results[0].cms_amount_q;
  
          dbConn.query(`SELECT od_q_number FROM cms_order WHERE cms_id=? ORDER BY od_id DESC LIMIT 1`, [cmsID],
          function (error, result) {
            if (error) {
              console.log('เกิดข้อผิดพลาดในการค้นหาค่า od_q_number');
              return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดในการค้นหาค่า od_q_number" });
            } else {
  
              //เช็กค่าว่ามี od_q_number ไหม
              if (result.length > 0) {
                const latestOdQNumber = result[0].od_q_number;
                if (Queue === latestOdQNumber) {
                  return res.status(200).json({ status: "order_full", message: "ไม่สามารถบันทึกข้อมูลของ cms_order ได้เนื่อง commission นี้เต็มแล้ว" });
                } else {
                  dbConn.query(
                    `INSERT INTO cms_order SET cms_id=?, customer_id=?, artist_id=?, pkg_id=?, od_use_for=?, od_detail=?, od_q_number=?`,
                    [cmsID, userID, artistId, pkgId, od_use_for, od_detail, latestOdQNumber + 1],
                    function(errors, cms_order_result) {
                      if (errors) {
                        console.log(errors);
                        return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
                      } else {
                        const orderId = cms_order_result.insertId;
                        return res.status(200).json({ 
                          status: 'ok',
                          message: "คำขอจ้างถูกส่งเรียบร้อย",
                          orderId
                        });
                      }
                    }
                  );
                }
              } else {
                dbConn.query(
                  `INSERT INTO cms_order SET cms_id=?, customer_id=?, artist_id=?, pkg_id=?, od_use_for=?, od_detail=?, od_q_number=?`,
                  [cmsID, userID, artistId, pkgId, od_use_for, od_detail, 1],
                  function(errors, cms_order_result) {
                    if (errors) {
                      console.log(errors);
                      return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
                    } else {
                      // console.log('เข้าการทำงานสำหรับยังไม่มี order');
                      const orderId = cms_order_result.insertId;
                      return res.status(200).json({ 
                        status: 'ok',
                        message: "คำขอจ้างถูกส่งเรียบร้อย",
                        orderId
                      });
                    }
                  }
                );
              }
            }
          })
        }
      }
    );
};

exports.addMessagesOrder = (req, res, next) => {
    try {
      const { from, to, od_id, step_id } = req.body;
      // console.log(req.body);
      const message = "คุณได้ส่งคำร้อง";
      dbConn.query(
        "INSERT INTO messages SET sender=?, receiver=?, message_text=?, od_id=?", 
        [from, to, message, od_id],
        function (error, result){
          if (error) {
            console.log(error);
          } 
          if (result.affectedRows > 0) {
            return res.json({ status:'ok', msg: "Message added successfully." });
          } else {
            return res.json({ status:'error', msg: "Failed to add message to the database." });
          }
        }
      )
    } catch {
      next();
      // return res.json({ status: "error", message: "status error" });
    }
};

