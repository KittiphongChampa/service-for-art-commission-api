const bcrypt = require("bcrypt");
const crypto = require("crypto");
const saltRounds = 10;
let jwt = require("jsonwebtoken");
const secret_token = "mysecret_id";
const randomstring = require("randomstring");
const fs = require("fs");
const nodemailer = require("nodemailer");

const mysql = require('mysql2')
const dbConn = mysql.createConnection(process.env.DATABASE_URL)

exports.user = async (req, res) => {
    dbConn.query('SELECT * FROM users', function( err, results ) {
        res.send(results)
    })
}

exports.verify = async (req, res) => {
    const email = req.body.email;
    const otp = crypto.randomInt(100000, 999999).toString();
    console.log(req.body);
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
  
      transporter.sendMail(mailOptions, async function (error, info) {
        if (error) {
          console.log("error", error);
          return res.json({ status: "error", message: "Failed" });
        }
  
        try {
          const insertResult = await queryDatabase("INSERT INTO users SET OTP=?", [otp]);
          // const insertResult = await queryDatabase("INSERT INTO users (OTP, urs_email) VALUES (?, ?)", [otp, email]);
          const insertedUserID = insertResult ? insertResult.insertId : null;
          console.log(insertedUserID);
          return res.json({ status: "ok", otp, insertedUserID });
        } catch (error) {
          console.log("error", error);
          return res.json({ status: "error", message: "Failed" });
        }
      });
    } catch (error) {
      console.log("verify เข้า catch", error);
      return res.status(500).json({ status: "error", message: "Failed" });
    }
};
  
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

exports.verify_email = (req, res) => {
    const {email, userID} = req.body;
    let OTP = parseInt(req.body.otp);
    dbConn.query(
      "SELECT OTP FROM users WHERE id=?",[userID],
      function(error, results){
        let otp = results[0].OTP;
        if (error) {
          console.log(error);
        } else {
          if (OTP === otp) {
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

exports.register = (req, res) => {
    // const sum_token = 0;
    // const urs_token = sum_token.toString();
    // const urs_token_encrypted = encrypt(urs_token);
    if (req.files === null) {
      return res.json({ status: "error", message: "No File Uploaded" });
    }
    const file = req.files.file;
    var filename_random =
      __dirname.split("controllers")[0] +
      "/public/images/" +
      randomstring.generate(50) +
      ".jpg";
    if (fs.existsSync("filename_random")) {
      filename_random =
        __dirname.split("controllers")[0] +
        "/public/images/" +
        randomstring.generate(60) +
        ".jpg";
      file.mv(filename_random);
    } else {
      file.mv(filename_random);
    }
    // const email = req.body.email;
    const image = filename_random.split("/public")[1];
    const profile = `${req.protocol}://${req.get("host")}${image}`;
    const {userID ,email, password, username, pdpaAccept, bankAccName, ppNumber, roleName} = req.body
    let userType = null;
    if(roleName=="customer"){
      userType = 0
    } else if (roleName=="artist") {
      userType = 1
    }
    // console.log(userType);
    bcrypt.hash(password, saltRounds, function (err, hash) {
      if (err) {
        console.log("เข้า error 1");
        return res.json({
          status: "error",
          message: "Register failed",
        });
      } else {
        dbConn.query(
          "UPDATE users SET urs_email=?, urs_password=?, urs_name=?,  urs_profile_img=?, urs_PDPA_accept=?, urs_account_name=?, urs_promptpay_number=?, urs_type=? WHERE id=?",
          [email, hash, username, profile, pdpaAccept, bankAccName, ppNumber, userType, userID],
          function (error, results) {
            if (error) {
              return res.json({ status: "error", message: error.message });
            } else {
              dbConn.query(
                "SELECT * FROM users WHERE urs_email=?",
                [email],
                function (error, users) {
                  if (users) {
                    var token = jwt.sign(
                      {
                        email: users[0].urs_email,
                        userId: users[0].id,
                        role: users[0].urs_type,
                      },
                      secret_token,
                      { expiresIn: "1h" }
                    ); //กำหนดระยะเวลาในการใช้งาน มีอายุ 1 ชม
                    return res.json({
                      status: "ok",
                      message: "Register success",
                      token,
                    });
                  } else {
                    return res.json({
                      status: "error",
                      message: "Register failed",
                    });
                  }
                }
              );
            }
          }
        );
      }
    });
};

exports.login = (req, res) => {
    const {email, password} = req.body;
    try{
      dbConn.query(
        "SELECT * FROM admins WHERE admin_email=?",
        [email],
        function (error, admins) {
          if (admins.length == 0) {
            dbConn.query(
              "SELECT * FROM users WHERE urs_email=?",
              [email],
              function (error, users) {
                if (users.length == 0) {
                  return res.json({ status: "error", message: "no user found" });
                }
                if (users[0].deleted_at !== null) {
                  return res.json({ status: "hasDelete", message: "User has deleted" });
                }
                if (error) {
                  return res.json({ status: "error", message: error });
                }
                bcrypt.compare(
                  password,
                  users[0].urs_password,
                  function (error, islogin) {
                    if (islogin) {
                      var token = jwt.sign(
                        {
                          email: users[0].urs_email,
                          userId: users[0].id,
                          role: users[0].urs_type,
                        },
                        secret_token,
                        { expiresIn: "3h" }
                      ); //กำหนดระยะเวลาในการใช้งาน มีอายุ 3 ชม
                      return res.json({ status: "ok", message: "login success", token });
                    } else {
                      return res.json({ status: "error", message: "login failed" });
                    }
                  }
                );
              }
            );
          }else if(admins){
            if (admins[0].deleted_at !== null) {
              return res.json({ status: "hasDelete", message: "Admin has deleted" });
            }
            bcrypt.compare(
              password,
              admins[0].admin_password,
              function (error, islogin) {
                if (islogin) {
                  var token = jwt.sign(
                    {
                      email: admins[0].admin_email,
                      adminId: admins[0].admin_id,
                      role: admins[0].admin_type,
                    },
                    secret_token,
                    { expiresIn: "3h" }
                  ); //กำหนดระยะเวลาในการใช้งาน มีอายุ 3 ชม
                  return res.json({ status: "ok_admin", message: "login success", token });
                } else {
                  return res.json({ status: "error", message: "login failed" });
                }
              }
            );
          }else{
            return res.json({ status: "error", message: error });
          }
        }
      );
    }catch{
      return res.json({ status: "catch", message: "เกิดข้อผิดพลาด" });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString();
  
    dbConn.query(
      "SELECT * FROM users WHERE urs_email = ?",
      [email],
      function (error, result) {
        console.log(result.length);
        if (result.length !== 1) {
          return res.json({
            status: "error",
            message: "no User in Database",
          });
        } else {
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
            subject: "Reset your password",
            // text: `Click the link below to reset your password: ${resetPasswordLink}`,
            html: `<!DOCTYPE html>
            <html lang="en" >
            <head>
              <meta charset="UTF-8">
              <title>CodePen - OTP Email Template</title>
              
            </head>
            <body>
            <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
              <div style="margin:50px auto;width:70%;padding:20px 0">
                <div style="border-bottom:1px solid #eee">
                  <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Yun</a>
                </div>
                <p style="font-size:1.1em">Hi,</p>
                <p>Thank you for choosing Yun. Use the following OTP to complete your Password Recovery Procedure. OTP is valid for 5 minutes</p>
                <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
                <p style="font-size:0.9em;">Regards,<br />Yun</p>
                <hr style="border:none;border-top:1px solid #eee" />
                <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
                  <p>Yun Inc</p>
                  <p>1600 Amphitheatre Parkway</p>
                  <p>California</p>
                </div>
              </div>
            </div>
            <h1 style='font-weight:bold;'></h1>
              
            </body>
            </html>`,
          };
          // await transporter.sendMail(mailOptions);
          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log("Error sending email:", error);
              return res.json({
                status: "error",
                message: "Failed to send email",
              });
            } else {
              dbConn.query(
                "UPDATE users SET OTP=? WHERE urs_email=?",
                [otp, email],
                function (error, Result) {
                  if (error) {
                    return res.json({ status: "error", message: "Failed" });
                  } else {
                    return res.json({
                      status: "ok",
                      message:
                        "An email has been sent to your email address with instructions on how to reset your password.",
                    });
                  }
              }
            )
              
            }
          });
          console.log(otp);
        }
      }
    );
};

exports.check_otp = (req, res) => {
    const email = req.body.email;
    let OTP = parseInt(req.body.otp);
    dbConn.query(
      "SELECT OTP FROM users WHERE urs_email=?",[email],
      function(error, results){
        let otp = results[0].OTP;
        if (error) {
          console.log(error);
        } else {
          if (OTP === otp) {
            return res.json({
              status: "ok",
              message: "verify email success",
              results
            });
          } else {
            console.log("otp is incorrect");
            res.json({ status: "error", message: "otp is incorrect" });
          }
        }
      }
    )
};

exports.resetPassword = async (req, res) => {
    const email = req.body.email;
    const newPassword = req.body.newPassword;
    try{
      dbConn.query("SELECT * FROM users WHERE urs_email=?",[email], function(error, results){
        if(results){
          bcrypt.hash(newPassword, saltRounds, function (err, hash) {
            dbConn.query(
              "UPDATE users SET urs_password = ? WHERE urs_email = ?",
              [hash, email],
              function (error, result) {
                if (error) {
                  console.log("1");
                  return res.json({ status: "error", message: error });
                }
                return res.json({
                  status: "ok",
                  message: "update success",
                });
              }
            );
          })
        }
        else {
          return res.json({ status: "error", message: error });
        }
      })
    }catch{
      return res.json({ status: "error", message: error });
    }
};



