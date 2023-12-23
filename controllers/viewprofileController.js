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

exports.viewProfile = (req,res) => {
    const userId = req.params.id;
    const myId = req.user.userId;
    let foundFollower = false;
    const followerIds = [];
    const IFollowingsIds = [];
    try {
      dbConn.query(
        "SELECT * FROM users WHERE id=?",
        // "SELECT * FROM users JOIN follow ON users.id = follow.follower_id",
        [userId],
        function (error, users) {
          if (error) {
            console.error('เกิดข้อผิดพลาดในการดึงข้อมูล', error);
            return;
          } else {
            dbConn.query(
              "SELECT * FROM follow WHERE following_id =? ", [userId], //ค้นหาทุกคนในตารางแต่เป็นคนที่เราเสิร์ช
              function (error, results) {
                if (error) {
                  return res.json({ status: "error", message: "เข้า error" });
                }else {     
                  // let totalFollowers = results.length; //จำนวนผู้ติดตามทั้งหมด
                  for (let x = 0; x < results.length; x++) {
                    followerIds.push(results[x].follower_id);//ใครที่ติดตามบ้าง
                  }
  
                  for (let i = 0; i < results.length; i++) {//ลูปเพื่อหาว่ามีใครในผู้ติดตามที่เป็นเราหรือไม่
                    const follower = results[i];
                    if (follower.follower_id === myId) {
                      // มี follower_id เท่ากับ myId
                      foundFollower = true;
                      break; // ออกจากลูปหลังพบ follower ครั้งแรก
                    }
                  }
                  if (foundFollower) {
                    return res.json({ status: "ok", users, message: 'follow', followerIds});
                    
                  }else {
                    return res.json({ status: "ok", users, message: 'no_follow', followerIds});
                  }
  
                }
              }
            )
          }
        }
      );
    } catch (err) {
      return res.json({ status: "error", message: "เข้า catch" });
    }
};
  
exports.follow = (req,res) => {
    const {id} = req.body;
    const myId = req.user.userId;
    dbConn.query(
      "INSERT INTO follow (following_id, follower_id) VALUES (?, ?)", [id, myId],
      function(error, results){
        console.log(results);
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          return res.json({ status: "ok"});
        }
      }
    )
}
  
exports.unfollow = (req,res) => {
    const userId = req.params.id
    const myId = req.user.userId;
    dbConn.query(
      "DELETE FROM follow WHERE following_id = ? AND follower_id =?", [userId, myId],
      function(error, results){
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          return res.json({ status: "ok"});
        }
      }
    )
}