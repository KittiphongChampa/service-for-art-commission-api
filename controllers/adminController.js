let jwt = require("jsonwebtoken");
const secret_token = "mysecret_id";
const randomstring = require("randomstring");
const fs = require("fs");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const saltRounds = 10;
const nodemailer = require("nodemailer");

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

exports.admin =(req, res) => {
    const adminId = req.user.adminId;
    console.log(adminId);
    // const role = req.admin.role;
    try {
      dbConn.query(
        "SELECT * FROM admins WHERE admin_id=?",
        [adminId],
        function (error, admins) {
          if (admins[0].admin_id !== adminId) {
            return res.json({ status: "error", message: "ไม่พบผู้ใช้" });
          }
          return res.json({ status: "ok", admins, type: 'admin'  });
        }
      );
    } catch (err) {
      return res.json({ status: "error", message: err.message });
    }
}
  
exports.allUser = (req, res) => {
    const adminId = req.user.adminId;
    try{
      dbConn.query("SELECT * FROM admins WHERE admin_id=?",
        [adminId],
        function (error, results) {
          if (results[0].admin_id !== adminId) {
            return res.json({ status: "error", message: "ไม่พบผู้ใช้" });
          }
          // return res.json({ status: "ok", users, urs_token });
          dbConn.query(
            "SELECT * FROM users WHERE deleted_at IS NULL AND urs_type != 3",
            function (error, users) {
              if (users) {
                return res.json({ status: "ok", users, results});
              } else {
                return res.json({ status: "error", message: error });
              }
            }
          );
        }
      );
    }catch{
      return res.json({ status: "error", message: error });
    }
};

exports.allAdmin = (req, res) => {
    try{
      dbConn.query(
        "SELECT * FROM admins WHERE admin_type != 0 and deleted_at IS NULL",
        function (error, admins) {
          if (error) {
            return res.json({ status: "error", message: error });
          } else {
            console.log(admins);
            return res.json({ status: "ok", admins,});
          }
        }
      );
    }catch{
      return res.json({ status: "catch", message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง" });
    }
};
  
exports.adminVerifyEmail = async (req, res) => {
    const email = req.body.email;
    const otp = crypto.randomInt(100000, 999999).toString();
    try {
      const userResult = await queryDatabase("SELECT urs_email FROM users WHERE urs_email = ?", [email]);
      if (userResult.length >= 1) {
        return res.json({ status: "used", message: "email being used" });
      }
  
      const adminResult = await queryDatabase("SELECT admin_email FROM admins WHERE admin_email = ?", [email]);
      if (adminResult.length >= 1) {
        return res.json({ status: "used", message: "email being used" });
      }
  
      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "ktpyun@gmail.com",
          pass: process.env.GOOGLE_PASS,
        },
      });
      let mailOptions = {
        from: "ktpyun@gmail.com",
        to: email,
        subject: "Email Verification",
        html: "<b>OTP to verify your email is </b>" + "<h1 style='font-weight:bold;'>" + otp + "</h1>",
      };
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log("error", error);
          return res.json({ status: "error", message: "Failed" });
        } else {
          // const insertResult = queryDatabase("INSERT INTO admins SET admin_email=?, OTP=?", [email, otp]);
          // const insertedAdminID = insertResult.insertId;
          // console.log(insertResult);
            dbConn.query(
              "INSERT INTO admins SET OTP=?",
              [otp],
              function (error, Result) {
                const insertedAdminID = Result.insertId;
                if (error) {
                  return res.json({ status: "error", message: "Failed" });
                } else {
                  console.log(insertedAdminID);
                  return res.json({ status: "ok", otp, insertedAdminID });
                }
              }
            )
        }
      });
    } catch (error) {
      console.error(error);
      console.log("เข้า catch");
      return res.status(500).json({ status: "error", message: "Failed" });
    }

    function queryDatabase(sql, params) {
      return new Promise((resolve, reject) => {
        dbConn.query(sql, params, function (error, results) {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      });
    }
};

exports.adminVerifyOTP = (req, res) => {
    let userSendOTP = parseInt(req.body.otp);
    const id = req.body.id;
    dbConn.query(
      "SELECT OTP FROM admins WHERE admin_id=?",
      [id],
      function (error, results) {
        let otp = results[0].OTP;
        if (error) {
          console.log(error);
        } else {
          if (userSendOTP === otp) {
            return res.json({
              status: "ok",
              message: "verify email success",
            });
          } else {
            console.log("otp is incorrect");
            res.json({ status: "error", message: "otp is incorrect" });
          }
        }
      }
    )
};

exports.createAdmin = (req, res) => {
    const AdminID = req.params.id
    const {name, email, password} = req.body;
    const role = 1;
  
    if (req.files === null) {
      return res.json({ status: "error", message: "No File Uploaded" });
    }
    const file = req.files.file;
    var filename_random =
      __dirname.split("controllers")[0] +
      "/public/profile_admin/" +
      randomstring.generate(50) +
      ".jpg";
    if (fs.existsSync("filename_random")) {
      filename_random =
        __dirname.split("controllers")[0] +
        "/public/profile_admin/" +
        randomstring.generate(60) +
        ".jpg";
      file.mv(filename_random);
    } else {
      file.mv(filename_random);
    }
    const image = filename_random.split("/public")[1];
    const profile = `${req.protocol}://${req.get("host")}${image}`;
  
    try {
      bcrypt.hash(password, saltRounds, function (err, hash) {
        console.log(hash);
        dbConn.query(
          "UPDATE admins SET admin_name=?, admin_email=?, admin_password=?, admin_type=?, admin_profile=? WHERE admin_id=?",
          [name, email, hash, role, profile, AdminID],
          function (error, result) {
            if (error) {
              return res.json({ status: "error", message: error.message });
            } 
            return res.json({
              status: "ok",
              message: "create Admin success",
              result
            });
          }
        );
    })
  
    } catch {
      return res.json({ status: "catch", message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง" });
    }
};
  
exports.editAdmin = (req, res) => {
    const adminId = req.params.id;
    const {name, email, password} = req.body;
    try{
      bcrypt.hash(password, saltRounds, function (err, hash) {
        dbConn.query(
          "UPDATE admins SET admin_name=?, admin_email=?, admin_password=?  WHERE admin_id = ?",
          [name, email, hash, adminId],
          function (error, results) {
            if (results) {
              console.log(results);
              return res.json({
                status: "ok",
                message: "แก้ไขข้อมูลแอดมินสำเร็จ",
              });
            } else {
              return res.json({ status: "error", message: error });
            }
          }
        );
      })
    }catch{
      return res.json({ status: "catch", message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง" });
    }
};
  
exports.deleteAdmin = (req, res) => {
    const adminId = req.params.id;
    console.log(adminId);
    try {
      dbConn.query(
        "UPDATE admins SET deleted_at = ? WHERE admin_id = ?",
        [date, adminId],
        function (error, results) {
          if (results) {
            console.log("เข้า");
            return res.json({
              status: "ok",
              message: "ลบบัญชีแอดมินสำเร็จ",
            });
          } else {
            console.log("ไม้เข้า");
            return res.json({ status: "error", message: error });
          }
        }
      );
    } catch {
      console.log("catch");
      return res.json({
        status: "catch",
        message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง",
      });
    }
};

exports.allfaq = (req, res) => {
    const adminId = req.user.adminId;
    try {
      dbConn.query(
        "SELECT * FROM faq WHERE deleted_at IS NULL",
        function (error, results) {
          if (results) {
            return res.json({
              status: "ok",
              results,
            });
          } else {
            return res.json({ status: "error", message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง" });
          }
        }
      );
    } catch {
      return res.json({
        status: "error",
        message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง",
      });
    }
}
  
exports.addfaq = (req, res) => {
    const { question, answer } = req.body;
    const adminId = req.user.adminId;
    try {
      dbConn.query(
        "INSERT INTO faq (faq_heading, faq_desc, admin_id, created_at) VALUES (?, ?, ?, ?)",
        [question, answer, adminId, date],
        function (error, results) {
          if (results) {
            return res.json({
              status: "ok",
              results,
            });
          } else {
            return res.json({ status: "error", message: error.message });
          }
        }
      );
    } catch {
      return res.json({
        status: "error",
        message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง",
      });
    }
};
  
exports.updatefaq = (req, res) => {
    const faqID = req.params.id;
    const { question, answer } = req.body;
    try {
      dbConn.query(
        "UPDATE faq SET faq_heading=?, faq_desc=?, updated_at=? WHERE faq_id = ?",[question, answer, date, faqID],
        function(error, results){
          if (error) {
            return res.json({
              status: "error",
              message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง",
            });
          } else {
            return res.json({
              status: "ok",
            });
          }
        }
      )
    } catch {
      return res.json({
        status: "error",
        message: "เข้า catch",
      });
    }
}

exports.deletefaq = (req, res) => {
    const faqID = req.params.id;
    try {
      dbConn.query(
        "UPDATE faq SET deleted_at=? WHERE faq_id = ?",[date, faqID],
        function(error, results){
          if (error) {
            return res.json({
              status: "error",
              message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง",
            });
          } else {
            return res.json({
              status: "ok",
            });
          }
        }
      )
    } catch {
      return res.json({
        status: "error",
        message: "เข้า catch",
      });
    }
}

exports.getYearData = (req, res) => {
  let sql = `
    SELECT
      DATE_FORMAT(created_at, '%Y-%m') AS date,
      COUNT(*) AS signup_count,
      SUM(CASE WHEN urs_type = 1 THEN 1 ELSE 0 END) AS artist_count,
      SUM(CASE WHEN urs_type = 0 THEN 1 ELSE 0 END) AS customer_count
    FROM users
    WHERE deleted_at IS NULL
  `;

  // Check for startDate and endDate parameters
  if (req.query.startDate && req.query.endDate) {
    sql += `
      AND created_at >= ? 
      AND created_at <= ?
    `;

    let startDate = `${req.query.startDate} 00:00:00`;
    let endDate = `${req.query.endDate} 23:59:59`;
    console.log(startDate);
    console.log(endDate);

    sql += `
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY date ASC
    `;

    dbConn.query(sql, [startDate, endDate], (error, results) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error occurred' });
      }
      console.log(results);
      return res.status(200).json({ results, message: 'Success' });
    });
  } else {
    sql += `
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY date ASC
    `;

    dbConn.query(sql, (error, results) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error occurred' });
      }
      console.log(results);
      return res.status(200).json({ results, message: 'Success' });
    });
  }
};
  
// exports.getdata = (req, res) => {
//     const { startDate, endDate } = req.query;
  
//     let sql = `
//       SELECT
//         DATE_FORMAT(created_at, '%Y-%m') AS date,
//         COUNT(*) AS signup_count,
//         SUM(CASE WHEN urs_type = 1 THEN 1 ELSE 0 END) AS artist_count,
//         SUM(CASE WHEN urs_type = 0 THEN 1 ELSE 0 END) AS customer_count
//       FROM users
//       WHERE deleted_at IS NULL
//     `;
  
//     // Check for startDate and endDate parameters
//     console.log(startDate);
//     console.log(endDate);
//     if (startDate && endDate) {
//       sql += `
//         AND created_at >= ? 
//         AND created_at <= ?
//       `;
  
//       sql += `
//         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
//         ORDER BY date ASC
//       `;
  
//       dbConn.query(sql, [startDate, endDate], (error, results) => {
//         if (error) {
//           console.log(error);
//           return res.status(500).json({ error: 'Error occurred' });
//         }
  
//         return res.status(200).json({ results, message: 'Success' });
//       });
//     } else {
//       sql += `
//         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
//         ORDER BY date ASC
//       `;
  
//       dbConn.query(sql, (error, results) => {
//         if (error) {
//           console.log(error);
//           return res.status(500).json({ error: 'Error occurred' });
//         }
//         console.log(results);
//         return res.status(200).json({ results, message: 'Success' });
//       });
//     }
// };

exports.getOutOfYearData = (req, res) => {
  console.log('เข้า');
    let sql = `
      SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
        COUNT(*) AS signup_count,
        SUM(CASE WHEN urs_type = 1 THEN 1 ELSE 0 END) AS artist_count,
        SUM(CASE WHEN urs_type = 0 THEN 1 ELSE 0 END) AS customer_count
      FROM users
      WHERE deleted_at IS NULL
    `;
  
    // Check for startDate and endDate parameters
    if (req.query.startDate && req.query.endDate) {
      sql += `
        AND created_at >= ? 
        AND created_at <= ?
      `;
  
      let startDate = `${req.query.startDate} 00:00:00`;
      let endDate = `${req.query.endDate} 23:59:59`;
      console.log(startDate);
      console.log(endDate);
  
      sql += `
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date ASC
      `;
  
      dbConn.query(sql, [startDate, endDate], (error, results) => {
        if (error) {
          console.log(error);
          return res.status(500).json({ error: 'Error occurred' });
        }
        console.log(results);
        return res.status(200).json({ results, message: 'Success' });
      });
    } else {
      sql += `
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date ASC
      `;
  
      dbConn.query(sql, (error, results) => {
        if (error) {
          console.log(error);
          return res.status(500).json({ error: 'Error occurred' });
        }
        console.log(results);
        return res.status(200).json({ results, message: 'Success' });
      });
    }
};
  
exports.dataPieChart = (req, res) => {
    dbConn.query(`
      SELECT
        CASE WHEN urs_type = 0 THEN 'customer' ELSE 'artist' END AS urs_type,
        COUNT(*) AS count
      FROM users
      WHERE deleted_at IS NULL
      GROUP BY urs_type
    `, function(error, results){
      if (error) {
        console.log(error);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
      }
    //   console.log(results);
      return res.status(200).json({ results ,message: 'สำเร็จ' });
    })
}

exports.allCommission = (req, res) => {
  // try {
  //   const sql = `
//   SELECT 
//   commission.cms_id, commission.cms_name, commission.usr_id, commission.created_at
// FROM commission 
// JOIN 
//   example_img ON commission.cms_id = example_img.cms_id
// WHERE example_img.status = "failed" AND commission.deleted_at IS NULL
// ORDER BY commission.created_at DESC
  //   `
  
  //   dbConn.query(sql, (error, results) => {
  //     if (error) {
  //       return res.json({ status: "error", message: error });
  //     } 
      
  //     const uniqueCmsIds = new Set();
  //     const formattedResults = [];
  
  //     results.forEach(row => {
  //       const createdAtDate = new Date(row.created_at);
  //       const formattedTime = createdAtDate.toISOString().split('T')[0];
  
  //       if (!uniqueCmsIds.has(row.cms_id)) {
  //         uniqueCmsIds.add(row.cms_id);
  //         formattedResults.push({
  //           ...row,
  //           formattedCreatedAt: formattedTime
  //         });
  //       }
  //     });
  
  //     console.log(formattedResults);
  //     return res.json({ status: "ok", data: formattedResults });
  //   });
  // } catch (error) {
  //   return res.json({ status: "error", message: error });
  // }
  try {
    const sql = `
      SELECT 
        commission.cms_id, commission.cms_name, commission.usr_id, commission.created_at, users.urs_name
      FROM commission 
      JOIN 
        example_img ON commission.cms_id = example_img.cms_id
      JOIN 
        users ON commission.usr_id = users.id
      WHERE example_img.status = "failed" AND commission.deleted_at IS NULL
      ORDER BY commission.created_at DESC
    `
  
    dbConn.query(sql, (error, results) => {
      if (error) {
        return res.json({ status: "error", message: error });
      } 
      
      const uniqueCmsIds = new Set();
      const formattedResults = [];
  
      results.forEach(row => {
        const createdAtDate = new Date(row.created_at);
        const formattedTime = createdAtDate.toISOString().replace('T', ' ').slice(0, 19);
  
        if (!uniqueCmsIds.has(row.cms_id)) {
          uniqueCmsIds.add(row.cms_id);
          formattedResults.push({
            ...row,
            formattedCreatedAt: formattedTime
          });
        }
      });
      // console.log(formattedResults);
      return res.json({ status: "ok", data: formattedResults });
    });
  } catch (error) {
    return res.json({ status: "error", message: error });
  }  
}

exports.problemCommission = (req, res) => {
  const cmsID = req.params.id;

  //ข้อมูล id ของภาพที่คล้าย และ id ของภาพที่ถูกคล้าย พร้อมกับ percentage
  const test1 = `
  SELECT 
    similar_img.ex_img_id, similar_img.similar_img, similar_img.percentage 
  FROM similar_img
  JOIN example_img ON similar_img.ex_img_id = example_img.ex_img_id
  JOIN commission ON example_img.cms_id = commission.cms_id
  WHERE commission.cms_id = ?
  `;

  //นำไอดีจากผลลัพธ์ที่แล้วไปหาว่าอยู่ cms อะไรและนำข้อมูลของ cms นั้นมา พร้อมกับข้อมูลของ users
  const test2 = `
    SELECT 
      commission.cms_id, commission.cms_name, commission.cms_amount_q, commission.cms_desc, commission.created_at,
      example_img.ex_img_id, example_img.ex_img_path, example_img.ex_img_path,
      users.id, users.urs_name, users.urs_profile_img
    FROM commission 
    JOIN 
      example_img ON commission.cms_id = example_img.cms_id
    JOIN
      users ON commission.usr_id = users.id
    WHERE example_img.ex_img_id IN (?)
    ORDER BY example_img.ex_img_id
  `;

  const test3 = `
    SELECT 
      commission.cms_id, commission.cms_name, commission.cms_amount_q, commission.cms_desc, commission.created_at,
      example_img.ex_img_id, example_img.ex_img_path, example_img.ex_img_path,
      users.id, users.urs_name, users.urs_profile_img
    FROM commission 
    JOIN 
      example_img ON commission.cms_id = example_img.cms_id
    JOIN
      users ON commission.usr_id = users.id
    WHERE example_img.ex_img_id IN (?) 
    ORDER BY example_img.ex_img_id
  `

  dbConn.query(test1, [cmsID],(error, results) => {
    if (error) {
      return res.json({ status: "error", message: error });
    }
    const array1 = []
    const array2 = []
    const percentage = []
    results.map(data=>(array1.push(data.ex_img_id)))
    results.map(data=>(array2.push(data.similar_img)))
    results.map(data=>(percentage.push(data.percentage)))

    // ใช้ Set เพื่อลบค่าที่ซ้ำออกจาก array
    const uniqueArray1 = Array.from(new Set(array1));
    const uniqueArray2 = Array.from(new Set(array2));

    // query หาข้อมูลของภาพที่เป็นปัญหา
    dbConn.query(test2, [uniqueArray1], (error, ex_img_id_Data) => {
      if (error) {
        return res.json({ status: "error", message: error });
      }

      // แยกข้อมูลคอมมิชชันออกมา
      const commissionData = ex_img_id_Data[0];
      const res_Cms_similar = {
        cms_id: commissionData.cms_id,
        cms_name: commissionData.cms_name,
        cms_desc: commissionData.cms_desc,
        cms_amount_q: commissionData.cms_amount_q,
        created_at: commissionData.created_at,
      }

      const res_User_similar = {
        usr_id : commissionData.id,
        urs_name: commissionData.urs_name,
        urs_profile_img: commissionData.urs_profile_img
      }

      // แยกผลลัพธ์ของรูปภาพออกมาจากคอมมิชชัน
      const ex_img_id_Data_split_results = ex_img_id_Data.map((result) => ({
        ex_img_id: result.ex_img_id,
        ex_img_path: result.ex_img_path,
      }));

      // เพิ่ม property 'status' ใน ex_img_id_Data_split_results
      const updatedResults1 = ex_img_id_Data_split_results.map((item) => ({
        ...item,
        status: uniqueArray1.includes(item.ex_img_id) ? 'similar' : 'no_similar',
      }));

      // console.log(res_Cms_similar);
      // console.log(res_User_similar);
      // console.log(updatedResults1);


          // query หาข้อมูลของภาพต้นฉบับ
      dbConn.query(test3, [uniqueArray2], (error, similar_img_Data) => {
        if (error) {
          return res.json({ status: "error", message: error });
        }

        const result = similar_img_Data.map((result) => ({
          // แยกผลลัพธ์ของข้อมูลของ cms ออกมาจาก result
          cms_data: {
            cms_id: result.cms_id,
            cms_name: result.cms_name,
            cms_amount_q: result.cms_amount_q,
            cms_desc: result.cms_desc,
            created_at: result.created_at
          },
          // แยกผลลัพธ์ของข้อมูลของ user ออกมาจาก result
          users_data: {
            usr_id: result.id,
            urs_name: result.urs_name,
            urs_profile_img: result.urs_profile_img
          },
          // แยกผลลัพธ์ของรูปภาพออกมาจากคอมมิชชัน
          img_data: {
            ex_img_id: result.ex_img_id,
            ex_img_path: result.ex_img_path,
            status: uniqueArray2.includes(result.ex_img_id) ? 'prototype' : 'no_prototype',
          }
        }))
        // console.log(result);

        // แยกผลลัพธ์ของรูปภาพออกมาจากคอมมิชชัน
        // const similar_img_Data_split_results = similar_img_Data.map((result) => ({
        //   ex_img_id: result.ex_img_id,
        //   ex_img_path: result.ex_img_path,
        // }));

        // เพิ่ม property 'status' ใน ex_img_id_Data_split_results
        // const updatedResults2 = similar_img_Data_split_results.map((item) => ({
        //   ...item,
        //   status: uniqueArray2.includes(item.ex_img_id) ? 'prototype' : 'no_prototype',
        // }));

        // console.log(updatedResults2);
        // console.log(percentage);

        return res.json({
          status: "ok",
          data1: { res_Cms_similar, res_User_similar, updatedResults1 },
          data2:  result ,
        });
      });
    });
  })
}

exports.problemCommissionApprove = (req, res) => {
  const cmsID = req.params.id;
  const array_imgSimilar = req.query.array_imgSimilar;
  // console.log(cmsID);
  // console.log(array_imgSimilar);
  const status = "passed";
  dbConn.query("UPDATE example_img SET status=? WHERE ex_img_id IN (?)",[status, array_imgSimilar],
  function (error, results) {
    if (results) {
      return res.json({
        status: "ok",
      });
    } else {
      return res.json({ status: "error", message: error });
    }
  })
}

exports.problemCommissionNotApprove = (req, res) => {
  const cmsID = req.params.id;
  dbConn.query("UPDATE commission SET deleted_at=? WHERE cms_id = ?",[date, cmsID],
  function (error, results) {
    if (results) {
      return res.json({
        status: "ok",
      });
    } else {
      return res.json({ status: "error", message: error });
    }
  })
}

exports.alladminIds = (req, res) => {
  dbConn.query(`SELECT admin_id FROM admins WHERE deleted_at IS NULL`, function(error, results){
    if (error) {
      console.log(error);
    }
    const adminIds = results.map(item => item.admin_id).join(',');

    return res.status(200).json({ status: "ok", adminIds });
  })
}

exports.delete_User =(req,res) => {
  const userId = req.params.id;
  const adminId = req.user.adminId;
  const banReason = req.body.banReason;
  try {
    dbConn.query(
      "UPDATE users SET deleted_at = ?, deleted_by=?, usr_banned_reason=? WHERE id = ?",
      [date, adminId, banReason, userId],
      function (error, results) {
        if (results) {
          return res.json({
            status: "ok",
            message: "ระงับบัญชีผู้ใช้สำเร็จ",
          });
        } else {
          return res.json({ status: "error", message: error });
        }
      }
    );
  } catch {
    return res.json({
      status: "error",
      message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง",
    });
  }
};