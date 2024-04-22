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


// หาแค่ข้อมูลของผู้ใช้ธรรมดาทั่วไป
exports.index = (req, res) => {
    const userId = req.user.userId;
    try {
      dbConn.query(
        "SELECT * FROM users WHERE id=?",
        [userId],
        function (error, users) {
          // if (userId === 'undefined') {
          //   return res.json({ status: "ok_butnotuser" });
          // } else if (users[0].id !== userId) {
          //   return res.json({ status: "error", message: "ไม่พบผู้ใช้" });
          // }
          if (error) {
            res.status(500).json({status: error})
          }
          // const urs_token = decrypt(users[0].urs_token);
          return res.json({ status: "ok", users, type: 'user'});
        }
      );
    } catch (err) {
      return res.json({ status: "error", message: err.message });
    }
};

exports.myCommission = (req, res) => {
    const myId = req.user.userId;
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
    
    dbConn.query(query, [myId], function (error, results) {
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
        }
      });
  
      // console.log(uniqueResults); // แสดงผลลัพธ์ใน console เพื่อตรวจสอบ
      return res.status(200).json({ status: "ok", commissions: uniqueResults });
    });
};

exports.myGallery = (req, res) => {
  const myId = req.user.userId;
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
  dbConn.query(query, [myId, myId], function (error, results) {
    if (error) {
      console.log(error); // แสดงข้อผิดพลาดใน console เพื่อตรวจสอบ
      return res.json({ status: "error", message: "status error" });
    }
    res.status(200).json({myGallery : results})
  })
};

exports.getMyReview = (req, res) => {
  const myId = req.user.userId;
  const sql = `
    SELECT 
      u.id, u.urs_name, u.urs_profile_img,
      o.pkg_id, o.pkg_name, 
      rw.rw_score, rw.rw_comment,
    FROM 
      cms_order o
    JOIN  
      package_in_cms pk ON pk.pkg_id = o.pkg_id
    JOIN
      users u ON u.id = o.customer_id
    JOIN
      review rw ON rw.rw_id = o.rw_id
    WHERE o.artist_id IN (?)
  `
  dbConn.query(sql, [myId], function(error, results) {
    if (error) {
      console.log(error);
      return res.status(500).json({error})
    }
    console.log(results);
    return res.status(200).json(results)
  })
};

