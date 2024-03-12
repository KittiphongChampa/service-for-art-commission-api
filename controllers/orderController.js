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

// exports.user_addOrder = async (req, res) => {
//   try {
//       const userID = req.user.userId;
//       const { cmsID, artistId, pkgId, od_use_for, od_detail } = req.body;

//       const Queue = await getCmsQueue(cmsID);

//       const latestOdQNumber = await getLatestOdQNumber(cmsID);

//       if (latestOdQNumber !== null && Queue === latestOdQNumber) {
//           return res.status(200).json({ status: "order_full", message: "ไม่สามารถบันทึกข้อมูลของ cms_order ได้เนื่อง commission นี้เต็มแล้ว" });
//       }

//       const cmsOrderResult = await insertCmsOrder(cmsID, userID, artistId, pkgId, od_use_for, od_detail, latestOdQNumber + 1);

//       const orderId = cmsOrderResult.insertId;

//       const cmsStepResult = await insertCmsSteps(orderId);

//       return res.status(200).json({
//           status: 'ok',
//           message: "คำขอจ้างถูกส่งเรียบร้อย",
//           orderId
//       });
//   } catch (error) {
//       console.error('Error:', error);
//       return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
//   }
// };

exports.user_addOrder = async (req, res) => {
  try {
    const userID = req.user.userId;
    const { cmsID, artistId, pkgId, od_use_for, od_detail } = req.body;
    const od_status = "inprogress";

    const findQueueEmpty = `
      SELECT (c.cms_amount_q - IFNULL(COUNT(o.od_id), 0)) AS available_slots
      FROM commission c
      LEFT JOIN cms_order o ON c.cms_id = o.cms_id
      WHERE c.cms_id = ? 
    `
    dbConn.query(findQueueEmpty, [cmsID], async (error, results) => {
      console.log(results);

      if (error) {
        console.log('เกิดข้อผิดพลาด');
        return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
      }
      //select เลือก max(คิว)+1

      const available_slots = results[0].available_slots;
      if (available_slots > 0) {
        dbConn.query(
          `SELECT MAX(od_q_number) AS q
          FROM cms_order
          WHERE artist_id = ?
          `, [artistId], async (error, maxQRes) => {
          let now_q;
          if (maxQRes[0].q == null || maxQRes[0].q == undefined) {
            now_q = 1
          } else {
            now_q = maxQRes[0].q + 1
          }
          const insertCmsOrder = `
          INSERT INTO cms_order SET cms_id=?, customer_id=?, artist_id=?, pkg_id=?, od_use_for=?, od_detail=?, od_status=? ,od_q_number=?
        `
          dbConn.query(insertCmsOrder, [cmsID, userID, artistId, pkgId, od_use_for, od_detail, od_status, now_q], async (err, result) => {
            if (err) {
              console.log("เกิดข้อผิดพลาดที่ ERR");
              return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดที่ ERR" });
            }
            // ดึงข้อมูล orderId มาจากไอดีของข้อมูลที่ถูกสร้าง
            const orderId = result.insertId;
            try {
              await insertCmsSteps(orderId);
              return res.status(200).json({
                status: 'ok',
                message: "คำขอจ้างถูกส่งเรียบร้อย",
                orderId
              });
            } catch (error) {
              console.error('Error:', error);
              return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
            }

          })

        }
        )

      } else {
        return res.status(200).json({ status: "order_full", message: "ไม่สามารถบันทึกข้อมูลของ cms_order ได้เนื่อง commission นี้เต็มแล้ว" });
      }
    })

  } catch {
    console.error('Error:', error);
    return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดที่ catch" });
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

        // เมื่อเสร็จสิ้นการเพิ่มข้อมูลลำดับคิวแล้ว ก่อน resolve ค่าออกไป ทำการอัปเดตค่า od_current_step_id ใน cms_order
        const sqlUpdateOrder = `
                  UPDATE cms_order 
                  SET od_current_step_id = (SELECT MIN(step_id) FROM cms_steps WHERE checked_at IS NULL AND od_id = ?)
                  WHERE od_id = ?
              `;
        dbConn.query(sqlUpdateOrder, [orderId, orderId], (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(arrayTest);
          }
        });
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
  const from = req.user.userId;
  try {
    const { to, od_id, step_id } = req.body;
    // console.log(req.body);
    const message = "ส่งคำขอจ้างแล้ว";
    dbConn.query(
      `INSERT INTO messages (sender, receiver, message_text, od_id,checked, step_id)
        VALUES (?, ?, ?, ?, 0, (SELECT MIN(cms_steps.step_id) FROM cms_steps WHERE messages.od_id = cms_steps.od_id))`,
      [from, to, message, od_id],
      function (error, result) {
        if (error) {
          console.log(error);
        }
        if (result.affectedRows > 0) {
          return res.json({ status: 'ok', msg: "Message added successfully.", result });
        } else {
          return res.json({ status: 'error', msg: "Failed to add message to the database." });
        }
      }
    )
  } catch {
    next();
    return res.json({ status: "error", message: "status error" });
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
  dbConn.query(sql1, [od_id], (error, result) => {
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
  console.log('ทำงาน req.body : ', req.body);
  const { step_id, od_id, od_price, od_edit, deleted, paid, first_pay_paid } = req.body;
  try {

    if (od_price !== undefined) {
      //ตั้งราคา
      const price = parseInt(od_price)
      dbConn.query(
        `UPDATE cms_order SET od_price=?
      WHERE od_id = ? `,
        [price, od_id]
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
      //ลบภาพ
      dbConn.query(
        "UPDATE messages SET deleted_at = ? WHERE step_id = ?", [date, step_id],
      )
    } else {
      if (first_pay_paid == null && paid !== undefined) {
        //ถ้ายังไม่จ่ายครั้งแรก
        dbConn.query(
          "UPDATE cms_order SET od_first_pay = ?, od_deadline=? WHERE od_id = ?", [paid, date, od_id])
      } else {
        dbConn.query(
          "UPDATE cms_order SET od_final_pay = ? WHERE od_id = ?", [paid, od_id])
      }

      //กรณีไม่ได้แก้ไขภาพ เช็คสเต็ป succeed ตามเดิม
      dbConn.query(
        "UPDATE cms_steps SET checked_at = ? WHERE step_id = ?", [date, step_id],
        function (error, aa) {
          //เอาสเตปล่าสุดมา
          dbConn.query(
            `SELECT MIN(step_id) AS id
            FROM cms_steps
            WHERE od_id = ? AND checked_at IS NULL` ,
            [od_id],
            function (error, curStep) {
              console.log("--------------")
              dbConn.query(
                `UPDATE cms_order
                SET od_current_step_id = ?
                WHERE od_id = ?` ,
                [curStep[0].id, od_id],
                function (error) {
                  dbConn.query(
                    `SELECT step_id, od_id ,
                    checked_at,step_name,(SELECT MAX(messages.id) fROM messages WHERE messages.od_id = ? AND messages.checked = 0 AND messages.step_id != 0) AS msgId
                    FROM cms_steps
                    WHERE od_id = ? AND checked_at IS NULL` ,
                    [od_id, od_id],
                    function (error, results) {
                      if (error) {
                        console.log(error);
                      }
                      res.json(results[0]);
                      console.log(results[0])
                    }
                  );

                }
              )
            }
          )

        }
      )
    }
    //เช็ค1ทุกอันที่มีการดำเนินการแล้ว
    //ให้เอาแมสไอดีมาด้วยตัวนี้เพื่อเปลี่ยนแวลู่ข้างใน
    dbConn.query(
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
      `SELECT *,(SELECT urs_name FROM users WHERE cms_order.artist_id = users.id) AS artist_name, (SELECT urs_name FROM users WHERE cms_order.customer_id = users.id) AS customer_name,
      (SELECT tou_name FROM type_of_use WHERE od_tou = tou_id) AS tou
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
      `SELECT od_number_of_edit,ordered_at,cms_name,od_id,pkg_edits,pkg_duration,pkg_name,od_q_number,customer_id,od_price,od_number_of_edit,
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

exports.getAllSteps = (req, res, next) => {
  // console.log('เข้า getMessages ', req.body);
  try {
    const { od_id } = req.body;
    dbConn.query(
      // `SELECT step_id, od_id , checked_at,step_name,step_type ,
      // (SELECT MAX(messages.step_id) FROM messages
      // JOIN cms_steps ON messages.step_id = cms_steps.step_id
      // WHERE (messages.od_id = cms_steps.od_id AND messages.checked = 0) AND cms_steps.step_name LIKE '%ภาพ%' ) AS wip_sent
      // FROM cms_steps WHERE od_id = ?` ,
      `SELECT step_id, od_id , checked_at,step_name ,
      
      (SELECT MAX(messages.step_id) FROM messages
      JOIN cms_steps ON messages.step_id = cms_steps.step_id
      WHERE (messages.od_id = ? AND messages.checked = 0) ) AS wip_sent

      FROM cms_steps WHERE od_id = ?` ,
      [od_id, od_id],
      function (error, results) {
        const allSteps = results.map((step) => {
          return {
            // fromSelf: step.step_id.toString() == from,
            od_id: step.od_id,
            checked_at: step.checked_at,
            step_name: step.step_name,
            // step_type: step.step_type,
            step_id: step.step_id,
            wip_sent: step.wip_sent
          };
        });
        res.json(allSteps);
      }
    );
  } catch (ex) {
    next(ex);
  }
};

exports.getCurrentStep = (req, res, next) => {
  // console.log('เข้า getMessages ', req.body);
  try {
    const { od_id } = req.body;
    dbConn.query(
      `SELECT step_id, od_id , checked_at,step_name,(SELECT MAX(messages.id) fROM messages WHERE messages.od_id = ? AND messages.checked = 0 AND messages.step_id != 0) AS msgId
      FROM cms_steps
      WHERE od_id = ? AND checked_at IS NULL` ,
      [od_id, od_id],
      function (error, results) {
        res.json(results[0]);
      }
    );
  } catch (ex) {
    next(ex);
  }
};

// exports.sendImageProgress = async (req, res) => {
//   try {
//     function insert(image_chat, msgId) {
//       console.log('msgId : ', msgId);
//       return new Promise((resolve, reject) => {
//         dbConn.query(
//           'INSERT INTO attach_img SET att_img_path=?, chat_id=?',
//           [image_chat, msgId],
//           (error, results) => {
//             if (error) {
//               console.error('เกิดข้อผิดพลาดในการดำเนินการ: ', error);
//               reject(error);
//             }
//             console.log('บันทึกสำเร็จ');
//             resolve(results);
//           }
//         );
//       });
//     }

//     const msgId = req.params.id;
//     console.log('msgId : ', msgId);
//     const file = req.files.image_file;
//     if (!file || file.length === 0) {
//       return res.status(400).json({ error: 'No files uploaded' });
//     }

//     if (file.length >= 2) {
//       console.log('2 ไฟล์');
//       await Promise.all(
//         file.map((file) => {
//           return new Promise((resolve, reject) => {
//             const filename_random =
//               __dirname.split('controllers')[0] +
//               '/public/images_chat/' +
//               randomstring.generate(50) +
//               '.jpg';
//             while (fs.existsSync(filename_random)) {
//               filename_random =
//                 __dirname.split('controllers')[0] +
//                 '/public/images_chat/' +
//                 randomstring.generate(60) +
//                 '.jpg';
//             }

//             file.mv(filename_random, (error) => {
//               if (error) {
//                 console.error('Error moving file:', error);
//                 reject(error);
//               } else {
//                 const image = filename_random.split('/public')[1];
//                 const image_chat = `${req.protocol}://${req.get('host')}${image}`;
//                 insert(image_chat, msgId).then(resolve).catch(reject);
//               }
//             });
//           });
//         })
//       );
//     } else {
//       console.log('1 ไฟล์');
//       var filename_random = __dirname.split('controllers')[0] + '/public/images_chat/' + randomstring.generate(50) + '.jpg';
//       while (fs.existsSync(filename_random)) {
//         filename_random =
//           __dirname.split('controllers')[0] +
//           '/public/images_chat/' +
//           randomstring.generate(60) +
//           '.jpg';
//       }

//       await new Promise((resolve, reject) => {
//         file.mv(filename_random, (error) => {
//           if (error) {
//             console.error('Error moving file:', error);
//             reject(error);
//           } else {
//             const image = filename_random.split('/public')[1];
//             const image_chat = `${req.protocol}://${req.get('host')}${image}`;
//             insert(image_chat, msgId).then(resolve).catch(reject);
//           }
//         });
//       });
//     }

//     res.status(200).json({ status: 'ok' });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ status: 'error' });
//   }
// };

exports.sendImageProgress = async (req, res) => {
  try {
    function insert(image_chat, msgId) {
      console.log('msgId : ', msgId);
      return new Promise((resolve, reject) => {
        dbConn.query(
          'INSERT INTO attach_img SET att_img_path=?, chat_id=?',
          [image_chat, msgId],
          (error, results) => {
            if (error) {
              console.error('เกิดข้อผิดพลาดในการดำเนินการ: ', error);
              reject(error);
            }
            const att_img_path = image_chat; // นำค่า image_chat มาใช้เป็น att_img_path
            console.log('บันทึกสำเร็จ');
            resolve({ results, att_img_path }); // ส่งค่า att_img_path กลับ
          }
        );
      });
    }

    const msgId = req.params.id;
    console.log('msgId : ', msgId);
    const file = req.files.image_file;
    if (!file || file.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (file.length >= 2) {
      console.log('2 ไฟล์');
      const result = await Promise.all(
        file.map((file) => {
          return new Promise((resolve, reject) => {
            const filename_random =
              __dirname.split('controllers')[0] +
              '/public/images_chat/' +
              randomstring.generate(50) +
              '.jpg';
            while (fs.existsSync(filename_random)) {
              filename_random =
                __dirname.split('controllers')[0] +
                '/public/images_chat/' +
                randomstring.generate(60) +
                '.jpg';
            }

            file.mv(filename_random, (error) => {
              if (error) {
                console.error('Error moving file:', error);
                reject(error);
              } else {
                const image = filename_random.split('/public')[1];
                const image_chat = `${req.protocol}://${req.get('host')}${image}`;
                insert(image_chat, msgId).then(resolve).catch(reject);
              }
            });
          });
        })
      );

      const att_img_paths = result.map(({ att_img_path }) => att_img_path);
      res.status(200).json({ status: 'ok', att_img_paths });
    } else {
      console.log('1 ไฟล์');
      var filename_random = __dirname.split('controllers')[0] + '/public/images_chat/' + randomstring.generate(50) + '.jpg';
      while (fs.existsSync(filename_random)) {
        filename_random =
          __dirname.split('controllers')[0] +
          '/public/images_chat/' +
          randomstring.generate(60) +
          '.jpg';
      }

      await new Promise((resolve, reject) => {
        file.mv(filename_random, (error) => {
          if (error) {
            console.error('Error moving file:', error);
            reject(error);
          } else {
            const image = filename_random.split('/public')[1];
            const image_chat = `${req.protocol}://${req.get('host')}${image}`;
            insert(image_chat, msgId).then((result) => {
              const { att_img_path } = result;
              res.status(200).json({ status: 'ok', att_img_path });
            }).catch(reject);
          }
        });
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: 'error' });
  }
};

//ส่งข้อมูลของ cms_order และ users
exports.getPayment = (req, res) => {
  const orderId = req.params.id;
  const sql = `
  SELECT cms_order.od_first_pay, cms_order.od_final_pay, cms_order.od_price, users.urs_account_name, users.urs_promptpay_number,
  cms_order.od_price AS allprice
  FROM cms_order 
  JOIN users ON cms_order.artist_id = users.id
  WHERE od_id = ?
  `
  dbConn.query(sql, [orderId], (error, PaymentData) => {
    if (error) {
      console.log(error);
      return res.status(500).json({ status: 'error' })
    }
    return res.status(200).json({ status: 'ok', PaymentData })
  })
};

exports.sendReview = (req, res) => {
  const { od_id, rw_comment, rw_score, cms_id, artist_id, all } = req.body;
  try {
    dbConn.query(
      `INSERT INTO review (rw_comment,rw_score,od_id) VALUES (?,?,?)`
      , [rw_comment, rw_score, od_id],
      function (error, insertResult) {
        if (error) {
          console.error(error);
          // จัดการข้อผิดพลาดตามต้องการ
          return;
        }
        // query ถูกเรียกใช้งานเสร็จสมบูรณ์ ทำการ query ต่อ
        dbConn.query(
          `SELECT rw_score
      FROM review
      JOIN cms_order ON cms_order.od_id = review.od_id
      WHERE cms_order.cms_id = ? `,
          [cms_id],
          function (error, allOdRw) {
            if (error) {
              console.error(error);
              return;
            }
            const total = allOdRw.reduce(function (previousValue, currentValue) {
              return {
                rw_score: previousValue.rw_score + currentValue.rw_score
              };
            });
            const sum_score = total.rw_score / allOdRw.length
            const avg_cms_review = sum_score.toFixed(1)
            console.log(avg_cms_review);

            //อัปเดตลงใน commission

            dbConn.query(
              `UPDATE commission
              SET cms_all_review = ?
              WHERE cms_id = ?`
              , [avg_cms_review, cms_id],
              function (error, aaa) {
                if (error) {
                  console.error(error);
                  return;
                }
                dbConn.query(
                  `SELECT cms_all_review
                  FROM commission
                  WHERE usr_id = ? AND cms_all_review IS NOT NULL`,
                  [artist_id],
                  function (error, allCmsRw) {
                    const total2 = allCmsRw.reduce(function (previousValue, currentValue) {
                      return {
                        cms_all_review: previousValue.cms_all_review + currentValue.cms_all_review
                      };
                    });

                    const sum_score2 = total2.cms_all_review / allCmsRw.length
                    const avg_urs_review = sum_score2.toFixed(1)
                    console.log(allCmsRw.length, avg_urs_review)
                    // console.log(artist_id)
                    dbConn.query(
                      `UPDATE users
                      SET urs_all_review = ?
                      WHERE id = ?`
                      , [avg_urs_review, artist_id],
                      function (error, res) {
                        if (error) {
                          console.error(error);
                          return;
                        }
                      }
                    )
                  }
                )
              }
            )

          }
        );
      }
    )
  }
  catch {
    return res.json({
      status: "error",
      message: "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง",
    });
  }
}


exports.getMyReq = (req, res) => {
  const userID = req.user.userId;
  try {
    dbConn.query(
      `SELECT od_id,od_price , cms_name,od_cancel_by , pkg_name,cms_order.pkg_id , ordered_at, (SELECT urs_name FROM users WHERE id = cms_order.artist_id) AS artist_name,
      (SELECT step_name FROM cms_steps WHERE od_current_step_id = step_id) AS step_name
      FROM cms_order
      JOIN commission ON commission.cms_id = cms_order.cms_id
      JOIN package_in_cms ON package_in_cms.cms_id = commission.cms_id AND cms_order.pkg_id = package_in_cms.pkg_id
      WHERE cms_order.customer_id = ?
      ORDER BY ordered_at` ,
      [userID],
      function (error, results) {
        if (error) {
          console.log(error);
          res.status(500)
        }
        console.log(results);
        res.status(200).json(results);
      }
    );
  } catch (error) {
    console.log(error)
  }
}

exports.getCmsReq = (req, res) => {
  const userID = req.user.userId;
  try {
    dbConn.query(
      `SELECT od_q_number,finished_at,od_id,cms_name,pkg_name,od_price,od_number_of_edit,od_price,ordered_at,finished_at,od_cancel_by,od_deadline,
      (SELECT pkg_duration FROM package_in_cms WHERE cms_order.pkg_id = package_in_cms.pkg_id ) AS pkg_duration ,
      (SELECT urs_name FROM users WHERE id = cms_order.customer_id) AS customer_name,
      (SELECT step_name FROM cms_steps WHERE od_current_step_id = step_id) AS step_name
      FROM cms_order
      JOIN commission ON commission.cms_id = cms_order.cms_id
      JOIN package_in_cms ON package_in_cms.cms_id = commission.cms_id AND commission.cms_id AND cms_order.pkg_id = package_in_cms.pkg_id
      WHERE cms_order.artist_id = ?
      ORDER BY
      CASE
        WHEN od_q_number IS NULL
        THEN 'Infinity'
        ELSE od_q_number
        END ASC, ordered_at DESC` ,
      [userID],
      function (error, results) {
        res.json(results);
        console.log(results)
        //od_q_number,od_id,cms_name,pkg_name,od_price,od_number_of_edit,od_edit_amount_price,od_price
      }
    );
  } catch (error) {
    console.log(error)
  }
}

exports.getAllTou = (req, res) => {
  const od_id = req.params.od_id;
  try {
    dbConn.query(
      `SELECT *,
      (SELECT od_tou FROM cms_order WHERE od_id = ?) AS old_tou,
      (SELECT t.tou_name FROM type_of_use t WHERE t.tou_id = old_tou) AS old_tou_name
      FROM type_of_use`,
      [od_id, od_id],
      function (error, results) {
        res.json(results);
        console.log(results)
      }
    );
  } catch (error) {
    console.log(error)
  }

}

exports.setDeadline = (req, res) => {
  const { od_id, pkg_duration } = req.body;
  // const deadline = new Date(startDate.setDate(startDate.getDate() + pkg_duration));

  const deadline = new Date();
  const sumDay = deadline.getDate() + pkg_duration; io
  deadline.setDate(sumDay)
  console.log(deadline);

  try {
    dbConn.query(
      `UPDATE cms_order,
      SET od_deadline = ?
      WHERE od_id = ?` ,
      [deadline, od_id]
    );

  } catch (error) {

  }


}



exports.changeOrder = (req, res) => {
  const { od_id, od_price, tou_id, checkPrice, checkTou } = req.body;
  console.log(req.body)
  try {
    if (checkPrice) {
      console.log("เช้คราคา")
      dbConn.query(
        `UPDATE cms_order
      SET od_price = ?
      WHERE od_id = ?` ,
        [od_price, od_id]
      );
    }
    if (checkTou) {
      console.log("เช้ค tou")
      dbConn.query(
        `UPDATE cms_order
      SET od_tou = ?
      WHERE od_id = ?` ,
        [tou_id, od_id]
      );
    }
  } catch (error) {
    console.log(error)
  }

}


exports.cancelOrder = (req, res) => {
  const od_id = req.body.od_id;
  console.log(req.body)
  try {
    dbConn.query(
      `UPDATE cms_order
      SET od_cancel_by = ?,od_q_number = NULL
      WHERE od_id = ?` ,
      [date, od_id], function (error) {

        
        dbConn.query(
          //โค้ดเลื่อนคิว
          `
          UPDATE cms_order AS c1
          JOIN (
            SELECT od_id,
            ROW_NUMBER() OVER (ORDER BY ordered_at) AS new_q
            FROM cms_order WHERE finished_at IS NULL AND od_cancel_by IS NULL
        ) AS c2 ON c1.od_id = c2.od_id
          SET od_q_number = new_q
          WHERE finished_at IS NULL AND od_cancel_by IS NULL
          `,
          function (error, result) {
            if (error) {
              res.status(500).json({
                status: "error",
                message: "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง",
              });
            } else {
              console.log(result);
              res.status(200).json({
                status: "success",
                message: "อัปเดตสถานะเรียบร้อย",
              });
            }
          }
        );


      }
    )
    //ให้ทำการขยับคิวต่อ
  } catch (error) {
    console.log(error)
  }
}

exports.finishOrder = (req, res) => {
  const od_id = req.body.od_id;
  try {
    dbConn.query(
      `UPDATE cms_order
      SET finished_at = ?, od_q_number = NULL
      WHERE od_id = ?` ,
      [date, od_id], function (error, result) {
        if (error) {
          console.log(error)
        }

        dbConn.query(
          //โค้ดเลื่อนคิว
          `
          UPDATE cms_order AS c1
          JOIN (
            SELECT od_id,
            ROW_NUMBER() OVER (ORDER BY ordered_at) AS new_q
            FROM cms_order WHERE finished_at IS NULL AND od_cancel_by IS NULL
        ) AS c2 ON c1.od_id = c2.od_id
          SET od_q_number = new_q
          WHERE finished_at IS NULL AND od_cancel_by IS NULL
          `,
          function (error, result) {
            if (error) {
              res.status(500).json({
                status: "error",
                message: "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง",
              });
            } else {
              console.log(result);
              res.status(200).json({
                status: "success",
                message: "อัปเดตสถานะเรียบร้อย",
              });
            }
          }
        );

      }
    )

  } catch (error) {
    console.log(error)
  }


}


exports.cancelSlip = (req, res) => {
  const { od_id } = req.body;
  dbConn.query(
    //เลือกสเตปแนบสลิปมา
    `SELECT MAX(step_id) AS step_id
        FROM cms_steps
        WHERE checked_at IS NOT NULL AND od_id = ?
        `, [od_id], function (error, now_stepRes) {
    if (error) {

    } else {
      dbConn.query(
        //ให้สเตปแนบสลิปเป็น null
        `UPDATE cms_steps
            SET checked_at = NULL
            WHERE step_id = ?`
        , [now_stepRes[0].step_id], function (error, ssss) {
          dbConn.query(
            //เลือกสเตป
            `SELECT MIN(step_id) AS id
            FROM cms_steps
            WHERE od_id = ? AND checked_at IS NULL` ,
            [od_id],
            function (error, curStep) {
              console.log("--------------")
              dbConn.query(
                `UPDATE cms_order
                SET od_current_step_id = ?
                WHERE od_id = ?` ,
                [curStep[0].id, od_id],
                function (error) {
                  dbConn.query(
                    `SELECT step_id, od_id ,
                    checked_at,step_name,(SELECT MAX(messages.id) fROM messages WHERE messages.od_id = ? AND messages.checked = 0 AND messages.step_id != 0) AS msgId
                    FROM cms_steps
                    WHERE od_id = ? AND checked_at IS NULL` ,
                    [od_id, od_id],
                    function (error, results) {
                      if (error) {
                        console.log(error);
                      }
                      res.json(results[0]);
                      console.log(results[0])
                    }
                  );

                }
              )
            }
          )

        }
      )
    }
  }
  )

}

//ยกเลิกออเดอร์ถ้าหากว่าขั้นตอนส่งคำขอจ้างยังไม่ checked_at  ให้ message เป็น check1
