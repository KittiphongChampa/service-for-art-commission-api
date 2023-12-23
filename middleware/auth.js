let jwt = require("jsonwebtoken");
const secret_token = "mysecret_id";
let mysql = require("mysql2");

const dbConn = mysql.createConnection(process.env.DATABASE_URL)
// let dbConn = mysql.createConnection({
//   host: "192.185.184.112",
//   user: "itweb176_itweb1766",
//   password: "XPWVySBR@a+H",
//   database: "itweb176_projectdb",
// });
// dbConn.connect();

//เช็กว่าคนที่จะเข้ามาใช้งานมีการ authentication หรือยัง
exports.verifyToken = (req, res, next) => {
  const token =
    req.body.token ||
    req.query.token ||
    req.headers["x-access-token"] ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(403).json({ message: "กรุณาเข้าสู่ระบบ" });
  }
  try {
    let decoded = jwt.verify(token, secret_token);
    // console.log(decoded);
    const user = decoded;
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      // console.log(err + " " + "Token has expired");
      return res.status(401).send("Token has expired");
    }
    return res.status(401).send("Invalid Token");
  }
};

//สิทธิการเข้าถึงเฉพาะนักวาด
exports.artistOnly = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  try {
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [decoded.userId],
      function (error, result) {
        if (result[0].id !== decoded.userId) {
          return res.json({ status: "error", message: "ไม่พบผู้ใช้" });
        }
        if (result[0].urs_type === undefined || result[0].urs_type !== 1) {
          console.log("เข้า no_access");
          return res.json({
            status: "no_access",
            message: "ไม่มีสิทธิเข้าถึง",
          });
        }
        if (error) {
          console.log("เข้า error");
          return res.json({ status: "error", message: error.message });
        }
        next();
      }
    );
  } catch {
    return res.status(401).send("Invalid Token");
  }
};

//สิทธิการเข้าถึงเฉพาะผู้ใช้งาน
exports.user_artisOnly = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  try {
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [decoded.userId],
      function (error, result) {
        console.log(result.length === 0);
        if (result.length === 0) {
          return res.json({
            status: "no_access",
            message: "ไม่มีสิทธิเข้าถึง",
          });
        } else if (result[0].id !== decoded.userId) {
          return res.json({ status: "error", message: "ไม่พบบัญชีผู้ใช้" });
        }
        if (error) {
          console.log("เข้า error");
          return res.json({ status: "error", message: error.message });
        }
        next();
      }
    );
  } catch {
    return res.status(401).send("Invalid Token");
  }
};

//สิทธิการเข้าถึงเฉพาะแอดมิน
exports.adminOnly = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  try {
    let decoded = jwt.verify(token, secret_token);
    // console.log(decoded);
    dbConn.query(
      "SELECT * FROM admins WHERE admin_id=?",
      [decoded.adminId],
      function (error, result) {
        // console.log(result.length === 0);
        if (result.length === 0) {
          console.log("ไม่พบผู้ใช้งาน");
          return res.json({
            status: "no_access",
            message: "ไม่มีสิทธิเข้าถึง",
          });
        } else if (result[0].admin_id !== decoded.adminId) {
          return res.json({ status: "error", message: "ไม่พบบัญชีแอดมิน" });
        }
        if (error) {
          console.log("เข้า error");
          return res.json({ status: "error", message: error.message });
        }
        next();
      }
    );
  } catch {
    return res.status(401).send("Invalid Token");
  }
};
