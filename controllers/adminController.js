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
          return res.json({ status: "ok", admins  });
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
    const adminId = req.user.adminId;
    try{
      dbConn.query("SELECT * FROM admins WHERE admin_id=?",
        [adminId],
        function (error, results) {
          console.log(results[0].admin_id);
          if (results[0].admin_id !== adminId) {
            return res.json({ status: "error", message: "ไม่พบผู้ใช้" });
          }
          // return res.json({ status: "ok", users, urs_token });
          dbConn.query(
            "SELECT * FROM admins WHERE admin_type != 0 and deleted_at IS NULL",
            function (error, admins) {
              if (admins) {
                return res.json({ status: "ok", results, admins,});
              } else {
                return res.json({ status: "error", message: error });
              }
            }
          );
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
          pass: "uzklexxuegiwcehr",
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
        "INSERT INTO faq (faq_heading, faq_desc, admin_id) VALUES (?, ?, ?)",
        [question, answer, adminId],
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
