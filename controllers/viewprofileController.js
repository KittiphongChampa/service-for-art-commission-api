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
    const MyFollowerIds = [];
    const IFollowingsIds = [];
    try {
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
        // "SELECT * FROM users JOIN follow ON users.id = follow.follower_id",
        [userId],
        function (error, users) {
          if (error) {
            console.error('เกิดข้อผิดพลาดในการดึงข้อมูล', error);
            return res.status(500);
          } else {
            dbConn.query(
              "SELECT * FROM follow WHERE following_id =? ", [userId],
              function (error, results) {
                if (error) {
                  return res.json({ status: "error", message: "เข้า error" });
                }     
                for (let x = 0; x < results.length; x++) {
                  MyFollowerIds.push(results[x].follower_id);//ใครที่ติดตามบ้าง
                }
                dbConn.query(
                  "SELECT * FROM follow WHERE follower_id =? ", [userId],
                  function (err, result) {
                    if (error) {
                      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล', error);
                    } else {
                      for (let x = 0; x < result.length; x++) {
                        IFollowingsIds.push(result[x].following_id);//เราติดตามใครบ้าง
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
                        return res.json({ status: "ok", users, message: 'follow', MyFollowerIds, IFollowingsIds});
                        
                      } else {
                        return res.json({ status: "ok", users, message: 'no_follow', MyFollowerIds, IFollowingsIds});
                      }
          
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

exports.viewProfile_notlogin = (req, res) => {
  const userId = req.params.id;
  const MyFollowerIds = [];
  const IFollowingsIds = [];
  try {
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
      [userId],
      function (error, users) {
        if (error) {
          console.error('เกิดข้อผิดพลาดในการดึงข้อมูล', error);
          return res.status(500);
        } else {
          dbConn.query(
            "SELECT * FROM follow WHERE following_id =? ", [userId],
            function (error, results) {
              if (error) {
                return res.json({ status: "error", message: "เข้า error" });
              }   
              // let totalFollowers = results.length; //จำนวนผู้ติดตามทั้งหมด
              for (let x = 0; x < results.length; x++) {
                MyFollowerIds.push(results[x].follower_id);//ใครที่ติดตามบ้าง
              }
              dbConn.query(
                "SELECT * FROM follow WHERE follower_id =? ", [userId],
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
                    return res.json({ status: "ok", users, message: 'no_follow', MyFollowerIds, IFollowingsIds });
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
}
  
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

exports.userCommission = (req, res) => {
  const userID = req.params.id;
  const query = `
    SELECT 
      commission.cms_id, 
      commission.cms_name, 
      commission.cms_desc, 
      commission.cms_status,
      IFNULL(commission.cms_all_review, 0) AS cms_all_review,
      example_img.ex_img_path, 
      example_img.status,
      users.id, 
      users.urs_name,
      package_in_cms.pkg_id, 
      package_in_cms.pkg_min_price,
      COUNT(cms_order.rw_id) AS total_reviews
    FROM 
      commission
    JOIN 
      example_img ON commission.cms_id = example_img.cms_id
    JOIN 
      users ON commission.usr_id = users.id
    JOIN 
      package_in_cms ON commission.cms_id = package_in_cms.cms_id
    LEFT JOIN
      cms_order ON commission.cms_id = cms_order.cms_id 
    WHERE 
      commission.usr_id IN (?) 
      AND commission.deleted_at IS NULL
      AND (commission.cms_status != "similar" OR commission.cms_status IS NULL)
      AND commission.cms_id IN (
        SELECT cms_id
        FROM example_img
        WHERE status IS NOT NULL
      )
    GROUP BY 
      commission.cms_id, 
      commission.cms_name, 
      commission.cms_desc, 
      commission.cms_all_review,
      commission.cms_status,
      example_img.ex_img_path, 
      example_img.status,
      users.id, 
      users.urs_name,
      package_in_cms.pkg_id, 
      package_in_cms.pkg_min_price
    ORDER BY commission.created_at DESC
  `;
  
  dbConn.query(query, [userID], function (error, results) {
    if (error) {
      console.log(error); // แสดงข้อผิดพลาดใน console เพื่อตรวจสอบ
      return res.json({ status: "error", message: "status error" });
    }

    const uniqueCmsIds = new Set();
    const uniqueResults = [];

    results.forEach((row) => {
      const cmsId = row.cms_id;
      if (!uniqueCmsIds.has(cmsId)) {
        uniqueCmsIds.add(cmsId);
        uniqueResults.push(row);
      } else {
        const existingResult = uniqueResults.find((item) => item.cms_id === cmsId);
        if (row.pkg_min_price < existingResult.pkg_min_price) {
          // หาก pkg_min_price น้อยกว่าในแถวที่มีอยู่แล้ว
          // ให้อัพเดทข้อมูล
          Object.assign(existingResult, row);
        }
      }
    });

    // console.log(uniqueResults); // แสดงผลลัพธ์ใน console เพื่อตรวจสอบ
    return res.status(200).json({ status: "ok", commissions: uniqueResults });
  });
}

exports.userGallerry = (req, res) => {
  const userID = req.params.id;
  const query = `
    SELECT 
      artwork.artw_id, artwork.artw_desc, artwork.ex_img_id,
      example_img.ex_img_path, example_img.ex_img_name, artwork.created_at
    FROM 
      artwork
    JOIN 
      example_img ON artwork.ex_img_id = example_img.ex_img_id
    WHERE 
      artwork.deleted_at IS NULL AND artwork.usr_id = ?
    UNION
    SELECT
      example_img.artw2_id, artwork.artw_desc, artwork.ex_img_id,
      example_img.ex_img_path, example_img.ex_img_name, example_img.created_at
    FROM
      example_img
    JOIN
      artwork ON example_img.artw2_id = artwork.artw_id
    WHERE
      example_img.cms_id IS NULL AND artwork.deleted_at IS NULL AND example_img.usr_id = ?
    ORDER BY created_at DESC
  `
  dbConn.query(query, [userID, userID], function (error, results) {
    if (error) {
      console.log(error); // แสดงข้อผิดพลาดใน console เพื่อตรวจสอบ
      return res.json({ status: "error", message: "status error" });
    }
    res.status(200).json({myGallery : results})
  })
}

exports.getYourReview = (req, res) => {
  const userId = req.params.id
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