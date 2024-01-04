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

// exports.user_addOrder = (req, res) => {
//     const userID = req.user.userId;
//     const { cmsID, artistId, pkgId, od_use_for, od_detail } = req.body;
  
//     // 1. ดึงค่าลำดับคิว (Queue) จากตาราง commission
//     dbConn.query(`SELECT cms_amount_q FROM commission WHERE cms_id=?`, [cmsID],
//       function(error, results) {
//         if (error) {
//           return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
//         } else {
//           const Queue = results[0].cms_amount_q;
  
//           dbConn.query(`SELECT od_q_number FROM cms_order WHERE cms_id=? ORDER BY od_id DESC LIMIT 1`, [cmsID],
//           function (error, result) {
//             if (error) {
//               console.log('เกิดข้อผิดพลาดในการค้นหาค่า od_q_number');
//               return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดในการค้นหาค่า od_q_number" });
//             } else {
  
//               //เช็กค่าว่ามี od_q_number ไหม
//               if (result.length > 0) {
//                 const latestOdQNumber = result[0].od_q_number;
//                 if (Queue === latestOdQNumber) {
//                   return res.status(200).json({ status: "order_full", message: "ไม่สามารถบันทึกข้อมูลของ cms_order ได้เนื่อง commission นี้เต็มแล้ว" });
//                 } else {
//                   dbConn.query(
//                     `INSERT INTO cms_order SET cms_id=?, customer_id=?, artist_id=?, pkg_id=?, od_use_for=?, od_detail=?, od_q_number=?`,
//                     [cmsID, userID, artistId, pkgId, od_use_for, od_detail, latestOdQNumber + 1],
//                     function(errors, cms_order_result) {
//                       if (errors) {
//                         console.log(errors);
//                         return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
//                       } else {

//                         const orderId = cms_order_result.insertId;
//                         //----------------------------------------------เพิ่มการ insert ข้อมูลใส่ cms_steps table---------------------------------------------
                        
//                         console.log('เข้า 1');
//                         let arrayTest = [];
//                         const sql1 = `
//                           SELECT cms_step 
//                           FROM package_in_cms 
//                           JOIN cms_order ON package_in_cms.pkg_id = cms_order.pkg_id
//                           WHERE cms_order.od_id = ?
//                         `
//                         // function insert ข้อมูลของ cms_step ใน package ไปเก็บที่ cms_step
//                         dbConn.query(sql1, [orderId],(error, result) => {
//                           if (error) {
//                             console.log(error);
//                             return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
//                           }

//                           // result log = [ { cms_step: 'ภาพร่าง,test1,test2,test3,ภาพไฟนัล' } ]
//                           if (result.length > 0) {
//                             const cmsStep = result[0].cms_step;

//                             // ใช้ split เพื่อแยกข้อมูล
//                             arrayTest = cmsStep.split(',');
//                               arrayTest.forEach((step_name, index) => {
//                                 const checked_at = (index === 0) ? new Date() : null;
                            
//                                 const sql = `INSERT INTO cms_steps SET od_id = ?, step_name = ?, checked_at = ?`;
                                
//                                 dbConn.query(sql, [orderId, step_name, checked_at], (error, result) => {
//                                     if (error) {
//                                         console.log('Error inserting data:', error);
//                                         return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
//                                     } else {
//                                         console.log('Data inserted successfully:', result);
//                                         return res.status(200).json({ 
//                                           status: 'ok',
//                                           message: "คำขอจ้างถูกส่งเรียบร้อย",
//                                           orderId
//                                         });
//                                     }
//                                 });
//                             });
                            
//                           }
//                         })


//                         //-------------------------------------------------------------------------------------------------------------------------------
//                         // return res.status(200).json({ 
//                         //   status: 'ok',
//                         //   message: "คำขอจ้างถูกส่งเรียบร้อย",
//                         //   orderId
//                         // });
//                       }
//                     }
//                   );
//                 }
//               } else {
//                 dbConn.query(
//                   `INSERT INTO cms_order SET cms_id=?, customer_id=?, artist_id=?, pkg_id=?, od_use_for=?, od_detail=?, od_q_number=?`,
//                   [cmsID, userID, artistId, pkgId, od_use_for, od_detail, 1],
//                   function(errors, cms_order_result) {
//                     if (errors) {
//                       console.log(errors);
//                       return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
//                     } else {


//                       // console.log('เข้าการทำงานสำหรับยังไม่มี order');
//                       const orderId = cms_order_result.insertId;


//                       //----------------------------------------------เพิ่มการ insert ข้อมูลใส่ cms_steps table---------------------------------------------
                        
//                       console.log('เข้า 2');
//                       let arrayTest = [];
//                       const sql1 = `
//                         SELECT cms_step 
//                         FROM package_in_cms 
//                         JOIN cms_order ON package_in_cms.pkg_id = cms_order.pkg_id
//                         WHERE cms_order.od_id = ?
//                       `
//                       // function insert ข้อมูลของ cms_step ใน package ไปเก็บที่ cms_step
//                       dbConn.query(sql1, [orderId],(error, result) => {
//                         if (error) {
//                           console.log(error);
//                           return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
//                         }

//                         // result log = [ { cms_step: 'ภาพร่าง,test1,test2,test3,ภาพไฟนัล' } ]
//                         if (result.length > 0) {
//                           const cmsStep = result[0].cms_step;

//                           // ใช้ split เพื่อแยกข้อมูล
//                           arrayTest = cmsStep.split(',');
//                             arrayTest.forEach((step_name, index) => {
//                               const checked_at = (index === 0) ? new Date() : null;
                          
//                               const sql = `INSERT INTO cms_steps SET od_id = ?, step_name = ?, checked_at = ?`;
                              
//                               dbConn.query(sql, [orderId, step_name, checked_at], (error, result) => {
//                                   if (error) {
//                                       console.log('Error inserting data:', error);
//                                       return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
//                                   } else {
//                                       console.log('Data inserted successfully:', result);
//                                       return res.status(200).json({ 
//                                         status: 'ok',
//                                         message: "คำขอจ้างถูกส่งเรียบร้อย",
//                                         orderId
//                                       });
//                                   }
//                               });
//                           });
                          
//                         }
//                       })


//                       //-------------------------------------------------------------------------------------------------------------------------------
//                       // return res.status(200).json({ 
//                       //   status: 'ok',
//                       //   message: "คำขอจ้างถูกส่งเรียบร้อย",
//                       //   orderId
//                       // });
//                     }
//                   }
//                 );
//               }
//             }
//           })
//         }
//       }
//     );
// };

exports.user_addOrder = async (req, res) => {
  try {
      const userID = req.user.userId;
      const { cmsID, artistId, pkgId, od_use_for, od_detail } = req.body;

      const Queue = await getCmsQueue(cmsID);

      const latestOdQNumber = await getLatestOdQNumber(cmsID);

      if (latestOdQNumber !== null && Queue === latestOdQNumber) {
          return res.status(200).json({ status: "order_full", message: "ไม่สามารถบันทึกข้อมูลของ cms_order ได้เนื่อง commission นี้เต็มแล้ว" });
      }

      const cmsOrderResult = await insertCmsOrder(cmsID, userID, artistId, pkgId, od_use_for, od_detail, latestOdQNumber + 1);

      const orderId = cmsOrderResult.insertId;

      const cmsStepResult = await insertCmsSteps(orderId);

      return res.status(200).json({
          status: 'ok',
          message: "คำขอจ้างถูกส่งเรียบร้อย",
          orderId
      });
  } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
  }
};

async function getCmsQueue(cmsID) {
  return new Promise((resolve, reject) => {
      dbConn.query(`SELECT cms_amount_q FROM commission WHERE cms_id=?`, [cmsID], (error, results) => {
          if (error) {
              reject(error);
          } else {
              resolve(results[0].cms_amount_q);
          }
      });
  });
}

async function getLatestOdQNumber(cmsID) {
  return new Promise((resolve, reject) => {
      dbConn.query(`SELECT od_q_number FROM cms_order WHERE cms_id=? ORDER BY od_id DESC LIMIT 1`, [cmsID], (error, result) => {
          if (error) {
              reject(error);
          } else {
              resolve(result.length > 0 ? result[0].od_q_number : null);
          }
      });
  });
}

async function insertCmsOrder(cmsID, userID, artistId, pkgId, od_use_for, od_detail, od_q_number) {
  return new Promise((resolve, reject) => {
      dbConn.query(`INSERT INTO cms_order SET cms_id=?, customer_id=?, artist_id=?, pkg_id=?, od_use_for=?, od_detail=?, od_q_number=?`,
          [cmsID, userID, artistId, pkgId, od_use_for, od_detail, od_q_number],
          (errors, cms_order_result) => {
              if (errors) {
                  reject(errors);
              } else {
                  resolve(cms_order_result);
              }
          }
      );
  });
}

async function insertCmsSteps(orderId) {
  return new Promise((resolve, reject) => {
      let arrayTest = [];
      const sql1 = `
          SELECT cms_step 
          FROM package_in_cms 
          JOIN cms_order ON package_in_cms.pkg_id = cms_order.pkg_id
          WHERE cms_order.od_id = ?
      `;
      dbConn.query(sql1, [orderId], async (error, result) => {
          if (error) {
              reject(error);
          }

          if (result.length > 0) {
              const cmsStep = result[0].cms_step;
              arrayTest = cmsStep.split(',');

              for (let index = 0; index < arrayTest.length; index++) {
                  const step_name = arrayTest[index];
                  const checked_at = (index === 0) ? new Date() : null;

                  await insertCmsStep(orderId, step_name, checked_at);
              }

              resolve(arrayTest);
          }
      });
  });
}

async function insertCmsStep(orderId, step_name, checked_at) {
  return new Promise((resolve, reject) => {
      const sql = `INSERT INTO cms_steps SET od_id = ?, step_name = ?, checked_at = ?`;

      dbConn.query(sql, [orderId, step_name, checked_at], (error, result) => {
          if (error) {
              reject(error);
          } else {
              resolve(result);
          }
      });
  });
}


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

//------------test---------------
// ต้องบันทึกข้อมูลที่ cms_step
exports.test = (req, res) => {
  
  const od_id = req.params.id;
  let arrayTest = [];
  const sql1 = `
    SELECT cms_step 
    FROM package_in_cms 
    JOIN cms_order ON package_in_cms.pkg_id = cms_order.pkg_id
    WHERE cms_order.od_id = ?
  `
  // function insert ข้อมูลของ cms_step ใน package ไปเก็บที่ cms_step
  dbConn.query(sql1, [od_id],(error, result) => {
    if (error) {
      console.log('error');
    }
    // result log = [ { cms_step: 'ภาพร่าง,test1,test2,test3,ภาพไฟนัล' } ]

    if (result.length > 0) {
      const cmsStep = result[0].cms_step;

      // ใช้ split เพื่อแยกข้อมูล
      arrayTest = cmsStep.split(',');
        arrayTest.forEach((step_name, index) => {
          const checked_at = (index === 0) ? new Date() : null;
      
          const sql = `INSERT INTO cms_steps SET od_id = ?, step_name = ?, checked_at = ?`;
          
          dbConn.query(sql, [od_id, step_name, checked_at], (error, result) => {
              if (error) {
                  console.log('Error inserting data:', error);
              } else {
                  console.log('Data inserted successfully:', result);
              }
          });
      });
      
    }
  })
}

//------------test---------------

//!------------------------------------------------------------
//!------------------------------------------------------------
//!------------------------------------------------------------
//!------------------------------------------------------------
//!------------------------------------------------------------//!------------------------------------------------------------
//!------------------------------------------------------------
//!------------------------------------------------------------
//!------------------------------------------------------------
//!------------------------------------------------------------
//!------------------------------------------------------------

exports.updateStep = (req, res) => {
  const { step_id, od_id, od_price, od_edit, deleted } = req.body;
  try {

    if (od_price !== undefined) {
      const price = parseInt(od_price)
      const halfPrice = price / 2
      dbConn.query(
        `UPDATE cms_order SET od_price=?, od_first_pay=?, od_final_pay = ?
      WHERE od_id = ? `,
        [price, halfPrice, halfPrice, od_id]
      )
    }

    if (od_edit) {
      //กรณีแก้ไขภาพ
      dbConn.query(
        `UPDATE cms_order SET od_number_of_edit = od_number_of_edit+1
      WHERE od_id = ? `,
        [od_id]
      )
    } else if (deleted) {
      dbConn.query(
        "UPDATE messages SET deleted_at = ? WHERE step_id = ?", [date, step_id],
      )
    } else {
      //กรณีไม่ได้แก้ไขภาพ เช็คสเต็ป succeed ตามเดิม
      dbConn.query(
        "UPDATE cms_steps SET checked_at = ? WHERE step_id = ?", [date, step_id],
      )
      dbConn.query(
        `SELECT step_id, od_id , checked_at,step_name,(SELECT MAX(messages.id) fROM messages WHERE messages.od_id = ? AND messages.checked = 0 AND messages.step_id != 0) AS msgId
      FROM cms_steps
      WHERE od_id = ? AND checked_at IS NULL` ,
        [od_id, od_id],
        function (error, results) {
          res.json(results[0]);
        }
      );
    }
    dbConn.query(
      //เช็ค1ทุกอันที่มีการดำเนินการแล้ว
      //ให้เอาแมสไอดีมาด้วยตัวนี้เพื่อเปลี่ยนแวลู่ข้างใน
      `UPDATE messages SET checked = 1
      WHERE step_id = ? `,
      [step_id]
    )

  } catch {
    return res.json({
      status: "error",
      message: "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
}

exports.getCurrentOrderData = (req, res) => {
  const { od_id } = req.body;
  try {
    dbConn.query(
      `SELECT *,(SELECT urs_name FROM users WHERE cms_order.artist_id = users.id) AS artist_name, (SELECT urs_name FROM users WHERE cms_order.customer_id = users.id) AS customer_name
      FROM cms_order
      JOIN  package_in_cms ON cms_order.pkg_id = package_in_cms.pkg_id
      JOIN commission ON package_in_cms.cms_id = commission.cms_id
      WHERE od_id = ?`
      , [od_id],
      function (error, results) {
        res.json(results[0]);
      }
    );
  }
  catch {
    return res.json({
      status: "error",
      message: "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
}

exports.getAllOrderDetail = (req, res) => {
  const { artist_id } = req.body;
  try {
    dbConn.query(
      `SELECT od_number_of_edit,ordered_at,cms_name,od_id,pkg_edits,pkg_duration,pkg_name,od_q_number,customer_id,od_price,od_number_of_edit,od_edit_amount_price,
      (SELECT MAX(messages.step_id)
    FROM messages
    JOIN cms_steps ON cms_steps.step_id = messages.step_id
    WHERE cms_order.od_id = messages.od_id) AS current_stepid ,
      (SELECT step_name FROM cms_steps WHERE step_id = current_stepid) AS current_step
      FROM cms_order
      JOIN package_in_cms ON ? = artist_id
      JOIN commission ON package_in_cms.cms_id = commission.cms_id
      WHERE artist_id = ?
      GROUP BY cms_order.od_id`
      , [artist_id, artist_id],
      function (error, results) {
        res.json(results);
      }
    );
  }
  catch {
    return res.json({
      status: "error",
      message: "",
    });
  }
}
