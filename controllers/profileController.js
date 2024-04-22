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

exports.profile = (req, res) => {
  try {
    const myId = req.user.userId;
    let MyFollowerIds = [];
    let IFollowingsIds = [];
    dbConn.query(
      `SELECT * ,
      (SELECT COUNT(*)
        FROM review
        JOIN cms_order ON review.od_id = cms_order.od_id
        WHERE users.id = cms_order.artist_id
      ) AS rw_number,
      (SELECT COUNT(*)
        FROM cms_order
        WHERE users.id = cms_order.artist_id AND finished_at IS NOT NULL
      ) AS success,
      (SELECT COUNT(*)
        FROM cms_order
        WHERE users.id = cms_order.artist_id AND od_cancel_by IS NOT NULL
      ) AS cancel
      FROM users WHERE id=?`,
      [myId],
      // [test],
      function (error, users) {
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          // console.log(users);
          dbConn.query(
            "SELECT * FROM follow WHERE following_id =? ", [myId], //ค้นหาเรา
            function (error, results) {
              // console.log('ผลลัพธ์ :', results);
              if (error) {
                console.error('เกิดข้อผิดพลาดในการดึงข้อมูล', error);
                return res.json({ status: "error", message: "เข้า error" });;
              }
              for (let x = 0; x < results.length; x++) {
                MyFollowerIds.push(results[x].follower_id);//ใครที่ติดตามเราบ้าง
              }
              dbConn.query(
                "SELECT * FROM follow WHERE follower_id =? ", [myId],
                function (err, result) {
                  if (error) {
                    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล', error);
                  } else {
                    for (let x = 0; x < result.length; x++) {
                      IFollowingsIds.push(result[x].following_id);//เราติดตามใครบ้าง
                    }
                    // ทั้งสองจะ log ออกมาเป็น array ที่มี id แสดง
                    // console.log(MyFollowerIds);
                    // console.log(IFollowingsIds);
                    return res.json({ status: "ok", users, MyFollowerIds, IFollowingsIds });
                  }
                }
              )
            }
          )
        }
      }
    );
  } catch (err) {
    return res.json({ status: "error", message: "เข้า catch" });
  }
};


exports.update_profile = (req, res) => {
    const userId = req.user.userId;
    const username = req.body.name;
    const bio = req.body.bio;
    try {
      dbConn.query(
        "UPDATE users SET urs_name = ?, urs_bio=? WHERE id = ?",
        [username, bio, userId],
        function (error, result) {
          if (error) {
            return res.json({ status: "error", message: "เข้า error" });
          } else {
            return res.json({
              status: "ok",
              message: "update success",
              result,
            });
          }
        }
      );
    } catch (error) {
      return res.json({ status: "error", message: error.message });
    }
};

exports.openFollower = (req, res) => {
  const myFollower = req.query.myFollower || '0';
    const followerIDs = myFollower.split(',').map(id => parseInt(id.trim(), 10));
  dbConn.query(
      `SELECT 
        u.id,
        u.urs_email, 
        u.urs_name, 
        u.urs_profile_img,
        u.urs_all_review,
        COALESCE(total_reviews, 0) AS total_reviews
      FROM users u
      LEFT JOIN (
        SELECT artist_id,
            COUNT(rw_id) AS total_reviews
        FROM cms_order
        WHERE artist_id IN (${followerIDs}) AND rw_id IS NOT NULL
        GROUP BY artist_id
      ) AS order_counts ON u.id = order_counts.artist_id
      WHERE u.id IN (${followerIDs})
      `,
      function(error, results){
      if (error) {
          console.error(error);
          return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดในการค้นหาผู้ใช้" });
      }
      // ส่งข้อมูลผู้ใช้ที่ค้นหาได้กลับเป็น JSON
      return res.status(200).json({ status: "ok", myfollower : results });
      }
  )
}

exports.openFollowing = (req, res) => {
    const iFollowing = req.query.iFollowing || '0';
    const followingIDs = iFollowing.split(',').map(id => parseInt(id.trim(), 10));
    dbConn.query(
        `SELECT 
          u.id,
          u.urs_email, 
          u.urs_name, 
          u.urs_profile_img,
          u.urs_all_review,
          COALESCE(total_reviews, 0) AS total_reviews
        FROM users u
        LEFT JOIN (
          SELECT artist_id,
              COUNT(rw_id) AS total_reviews
          FROM cms_order
          WHERE artist_id IN (${followingIDs}) AND rw_id IS NOT NULL
          GROUP BY artist_id
        ) AS order_counts ON u.id = order_counts.artist_id
        WHERE id IN (${followingIDs})`,
        function(error, results){
        if (error) {
            console.error(error);
            return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดในการค้นหาผู้ใช้" });
        }
        // ส่งข้อมูลผู้ใช้ที่ค้นหาได้กลับเป็น JSON
        return res.status(200).json({ status: "ok", ifollowing : results });
        }
    )
}

exports.update_cover_color = (req, res) => {
    const userId = req.user.userId;
    const {cover_color} = req.body;
    dbConn.query(
      "UPDATE users SET urs_cover_color = ? WHERE id = ?",[cover_color, userId],
      function (error, results) {
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          return res.json({
            status: "ok",
            message: "บันทึกสำเร็จ",
            results,
          });
        }
      }
    )
}
  
exports.update_profile_img = (req, res) => {
    const userId = req.user.userId;
    try {
      if (req.files === null) {
        return res.json({ status: "error", message: "No File Uploaded" });
      }
      const file = req.files.file;

      dbConn.query(
        "SELECT urs_profile_img FROM users WHERE id = ?",
        [userId],
        function (error, result) {
          console.log(result[0]);

          if (result[0].urs_profile_img === "") {
            var filename_random =
              __dirname.split("controllers")[0] +
              "/public/images/" +
              randomstring.generate(50) +
              ".jpg";
            file.mv(filename_random);
            const image = filename_random.split("/public")[1];
            const profile = `${req.protocol}://${req.get("host")}${image}`;

            const secure_profile = profile.replace(/^http:/, 'https:');

            dbConn.query(
              "UPDATE users SET urs_profile_img =? WHERE id = ? ",
              [profile, userId],
              function (error, results) {
                if (error) {
                  return res.json({ status: "error", message: error.message });
                } else {
                  return res.json({
                    status: "ok",
                    message: "add profile success",
                  });
                }
              }
            );
          } else {
            const new_profile = result[0].urs_profile_img.split("images/")[1];
            file.mv(`./public/images/${new_profile}`, async err => {
              if (err) {
                console.log(err);
              } else {
                return res.json({ status: "ok", message: "update success" });
              }
            })
          }
        }
      );
    } catch (error) {
      return res.json({ status: "error", message: error.message });
    }
};
  
exports.update_profile = (req, res) => {
    const userId = req.user.userId;
    const username = req.body.name;
    const bio = req.body.bio;
    try {
      dbConn.query(
        "UPDATE users SET urs_name = ?, urs_bio=? WHERE id = ?",
        [username, bio, userId],
        function (error, result) {
          if (error) {
            return res.json({ status: "error", message: "เข้า error" });
          } else {
            return res.json({
              status: "ok",
              message: "update success",
              result,
            });
          }
        }
      );
    } catch (error) {
      return res.json({ status: "error", message: error.message });
    }
};

exports.update_bank = (req, res) => {
    const userId = req.user.userId;
    const { bankAccName, ppNumber } = req.body
    try {
      dbConn.query(
        "UPDATE users SET urs_account_name = ?, urs_promptpay_number=? WHERE id = ?",
        [bankAccName, ppNumber, userId],
        function (error, result) {
          if (error) {
            return res.json({ status: "error", message: "เข้า error" });
          } else {
            return res.json({ status: "ok", message: "update success", result });
          }
        }
      );
    } catch (error) {
      return res.json({ status: "error", message: error.message });
    }
};
  
exports.delete_account = (req, res) => {
    // const token = req.headers.authorization.split(" ")[1];
    // let decoded = jwt.verify(token, secret_token);
    // console.log(req.body);
    const userId = req.user.userId;
    try {
      dbConn.query(
        "UPDATE users SET deleted_at = ? WHERE id = ?",
        [date, userId],
        function (error, results) {
          if (error) {
            return res.json({ status: "error", message: "เข้า error" });
          } else {
            return res.json({
              status: "ok",
              message: "User successfully deleted.",
              results,
            });
          }
        }
      );
    } catch (err) {
      return res.json({ status: "error", message: "เข้า catch" });
    }
};

exports.changePassword = (req, res) => {
    const {oldPassword, newPassword} = req.body;
    const userId = req.user.userId;
    try {
      dbConn.query(
        "SELECT * FROM users WHERE id=?",[userId],
        function (error, users) {
          if (error) {
            return res.json({ status: "error", message: "เข้า error" });
          }
          const hash = users[0].urs_password;
          bcrypt.compare(oldPassword, hash, function(err, results) {
            if (err) {
              console.log('Error comparing passwords:', err);
              return res.json({ status: "error", message: "Error comparing passwords"});
            } else if (results) {
              console.log('Password matches hash!');
              bcrypt.hash(newPassword, saltRounds, function (err, hash) {
                dbConn.query(
                  "UPDATE users SET urs_password=? WHERE id = ?",[hash, userId],
                  function (error, result) {
                    if (error) {
                      console.log(error);
                      return res.json({ status: "error", message: "เข้า error" });
                    } 
                    return res.json({
                      status: "ok",
                      message: "update success",
                      result
                    });
                  }
                );
              })
            } else {
              console.log('Password does not match hash');
              return res.json({ status: "error", message: "Password does not match hash"});
            }
          });
        }
      );
    }catch{
      return res.json({
        status: "error",
        message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง",
      });
    }
};

exports.delete_account = (req, res) => {
    // const token = req.headers.authorization.split(" ")[1];
    // let decoded = jwt.verify(token, secret_token);
    // console.log(req.body);
    const userId = req.user.userId;
    try {
      dbConn.query(
        "UPDATE users SET deleted_at = ? WHERE id = ?",
        [date, userId],
        function (error, results) {
          if (error) {
            return res.json({ status: "error", message: "เข้า error" });
          } else {
            return res.json({
              status: "ok",
              message: "User successfully deleted.",
              results,
            });
          }
        }
      );
    } catch (err) {
      return res.json({ status: "error", message: "เข้า catch" });
    }
};

exports.getAllReview = (req, res) => {
  const userId = req.user.userId;
  const sql = `
    SELECT
      o.cms_id, u.id, u.urs_name, u.urs_profile_img,
      rw.rw_score, rw.rw_comment, rw.created_at
    FROM
      cms_order o
    JOIN
      users u ON u.id = o.customer_id
    JOIN
      review rw ON rw.rw_id = o.rw_id
    WHERE
      o.artist_id IN (${userId})
  `
  dbConn.query(sql, function(error, results){
    if (error) {
      console.log(error);
      return res.status(500).json({error})
    }
    return res.status(200).json(results)
  })
};