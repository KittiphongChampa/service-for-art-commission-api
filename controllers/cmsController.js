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

exports.addCommission = (req, res) => {
  // console.log(req.body);
    function insertCommission(data, userId) {
      return new Promise((resolve, reject) => {
        dbConn.query(
            "INSERT INTO commission SET cms_name=?, cms_desc=?, cms_amount_q=?, cms_good_at=?, cms_bad_at=?, cms_no_talking=?, cms_status=?, usr_id=?",
            [...data, userId],
            (error, results) => {
            if (error) {
                reject(error);
            } else {
              // console.log("CMS Success");
              resolve(results.insertId);
            }
            }
        );
      });
    }
  
    function insertPackage(data, step, commissionId, userId) {
      const allWipArr = step.split(',');
      const halfWip = Math.floor(allWipArr.length / 2); //หารครึี่งปัดเศษลงหลังจากสเตปนี้ต้องจ่ายสลิป2
      let newAllSteps = "";
    
      allWipArr.forEach((wip, index) => {
        //ภาพเส้นเปล่า ภาพลงสีพื้น ภาพลงสีเต็ม
        if (index == 0) {
          newAllSteps += "ส่งคำขอจ้าง,รับคำขอจ้าง,ภาพร่าง,ระบุราคา,แนบสลิป,ตรวจสอบใบเสร็จ,";
        }
        newAllSteps += "ภาพ" + wip + ",";
        if (index == allWipArr.length - 1) {
          newAllSteps += "ภาพไฟนัล,แนบสลิป2,ตรวจสอบใบเสร็จ2,รีวิว";
        }
      });
    
      console.log("newAllSteps=" + newAllSteps);
    
      return new Promise((resolve, reject) => {
        dbConn.query(
          "INSERT INTO package_in_cms SET pkg_name=?, pkg_desc=?, pkg_min_price=?, pkg_duration=?, pkg_edits=?, cms_step=?, cms_id=?, usr_id=?",
          [...data, newAllSteps, commissionId, userId],
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              console.log("package Success");
              resolve(result);
            }
          }
        );
      });
    }
    
    
    function insertCms_has_topic(commission_topic, commissionId, userId) {
      const topics = commission_topic.split(','); // แยกค่า commission_topic เป็นรายการ
      const records = topics.map((topic) => ({
          commission_topic: topic,
          userId,
          cms: commissionId,
      }));
  
      // ทำการบันทึกลงในฐานข้อมูล โดยวนลูปเพื่อบันทึกแต่ละรายการ
      records.forEach((record) => {
        dbConn.query(
            "INSERT INTO commission_has_topic (tp_id, usr_id, cms_id) VALUES (?, ?, ?)",
            [record.commission_topic, record.userId, record.cms],
            (error, result) => {
            if (error) {
                console.error('Error inserting record:', error);
            } else {
                console.log('insertCms_has_topic success:', result.insertId);
            }
            }
        );
      });
    }
  
    function insertArtw_has_topic(commission_topic, ExampleImageId, userId) {
      const topics = commission_topic.split(',');
      const records = topics.map((topic) => ({
        commission_topic: topic,
        userId,
        ExampleImageId: ExampleImageId,
      }));
      records.forEach((record) => {
        dbConn.query(
            "INSERT INTO artwork_has_topic (tp_id, usr_id, artw_id) VALUES (?, ?, ?)",
            [record.commission_topic, record.userId, record.ExampleImageId],
            (error, result) => {
            if (error) {
                console.error('Error inserting record:', error);
            } else {
                console.log('artwork_has_topic success:', result.insertId);
            }
          }
        );
      });
    }
  
    function insertCms_has_type_of_use(typeofuse, commissionId, userId) {
      const tous = typeofuse.split(',');
      const records = tous.map((tou) => ({
        typeofused: tou,
        commissionId,
        userId,
      }));
      records.forEach((record) => {
        dbConn.query(
            "INSERT INTO commission_has_type_of_use (cms_id, usr_id, tou_id) VALUES (?, ?, ?)",
            [record.commissionId, record.userId, record.typeofused],
            (error, result) => {
            if (error) {
                console.error('Error inserting record:', error);
            } else {
                console.log('commission_has_type_of_use success:', result.insertId);
            }
          }
        );
      });
    }
  
    function insertExampleImage(image, commissionId, userId) {
      return new Promise((resolve, reject) => {
        dbConn.query(
          "INSERT INTO example_img SET ex_img_name=?, ex_img_path=?, cms_id=?, usr_id=?",
          [...image, commissionId, userId],
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              console.log("CMS Success");
              const exampleImageInfo = {
                image_name: image[0], // Assuming image_name is the first element in the image array
                ExampleImageId: result.insertId,
              };
              resolve(exampleImageInfo);
            }
          }
        );
      });
    }
    
    try {
      const userId = req.user.userId;
      const file = req.files.image_file;
      if (!file || file.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
  
      const {
          commission_name,
          commission_description,
          commission_que,
          typeofuse,
          good,
          bad,
          no_talking,
          commission_topic,
      } = req.body;
      
      const {
          package_name,
          package_detail,
          duration,
          price,
          edits,
          step,
      } = req.body;
  
      // const sumStep = "ภาพร่าง,"+step+",ภาพไฟนัล"
      // console.log(step);
      // console.log(sumStep);
  
      //insert cms
      const cms_status = "open";
      const commissionPromise = insertCommission(
          [commission_name, commission_description, commission_que, good, bad, no_talking, cms_status],userId
      );
      commissionPromise.then((commissionId) => {
  
        //insert package
        if (Array.isArray(package_name)) {
          const numberOfPackages = package_name.length;
          for (let i = 0; i < numberOfPackages; i++) {
            insertPackage(
              [package_name[i], package_detail[i], price[i], duration[i], edits[i]],
              step[i],
              commissionId,
              userId,
            );
          }
          console.log();
        } else {
          insertPackage(
            [package_name, package_detail, price, duration, edits],
            step,
            commissionId,
            userId,
          );
        }
  
        //insert cms has topic
        insertCms_has_topic(commission_topic, commissionId, userId);
  
        //insert cms has type of use
        insertCms_has_type_of_use(typeofuse, commissionId, userId);
  
        //insert artwork_img
        const allQueries = [];
        if (file.length >= 2) {
          console.log('2 ไฟล์');
          file.forEach((file) => {
            const filename_random =
              __dirname.split("controllers")[0] +
              '/public/images_cms/' +
              randomstring.generate(50) +
              ".jpg";
            while (fs.existsSync(filename_random)) {
              filename_random =
                __dirname.split("controllers")[0] +
                '/public/images_cms/' +
                randomstring.generate(60) +
                ".jpg";
            }
            allQueries.push(
              new Promise((resolve, reject) => {
                file.mv(filename_random, (error) => {
                  if (error) {
                    console.error("Error moving file:", error);
                    reject(error);
                  } else {
                    const image = filename_random.split("/public")[1];
                    const image_cms = `${req.protocol}://${req.get("host")}${image}`;

                    const secure_image_cms = image_cms.replace(/^http:/, 'https:');

                    const image_name = image_cms.split("/images_cms/")[1];
  
                    const ExampleImagePromise = insertExampleImage(
                      [image_name, image_cms],
                      commissionId,
                      userId,
                    );
  
                    ExampleImagePromise.then((ExampleImageId) => {
                      resolve(ExampleImageId);
                    });
                  }
                });
              })
            );
          });
        } else {
          console.log('1 ไฟล์');
          var filename_random = __dirname.split("controllers")[0] + "/public/images_cms/" + randomstring.generate(50) + ".jpg";
          if (fs.existsSync("filename_random")) {
            filename_random = __dirname.split("controllers")[0] +
              "/public/images_cms/" +
              randomstring.generate(60) +
              ".jpg";
            file.mv(filename_random);
          } else {
            file.mv(filename_random);
          }
          const image = filename_random.split("/public")[1];
          const image_cms = `${req.protocol}://${req.get("host")}${image}`;

          const secure_image_cms = image_cms.replace(/^http:/, 'https:');

          const image_name = image_cms.split("/images_cms/")[1];
  
          const ExampleImagePromise = insertExampleImage(
            [image_name, image_cms], commissionId, userId
          );
  
          allQueries.push(ExampleImagePromise);
        }
        // รอให้ทุก Promise จาก allQueries เสร็จสิ้น
        Promise.all(allQueries)
          .then((exampleImageInfos) => {
            console.log('ทุก Promise จาก allQueries เสร็จสิ้น');
            // ทำอะไรบางอย่างหลังจากการดำเนินการเสร็จสิ้นทั้งหมด
            exampleImageInfos.forEach((exampleImageInfo) => {
              insertArtw_has_topic(commission_topic, exampleImageInfo.ExampleImageId, userId);
            });
        
            // Send the information back to React
            res.json({ status: "ok", exampleImages: exampleImageInfos });
          })
          .catch((error) => {
            console.error('เกิดข้อผิดพลาดในการดำเนินการ: ', error);
            res.json({ status: "error", message: "An error occurred" });
          });
  
      })
      // res.json({ status: "ok", images: exampleImages, insertedCommissionId: commissionId });
  
      // res.json({ status: "ok" });
    } catch (error) {
        res.json({ status: "error", message: "An error occurred" });
    }
};

exports.latestCommission = (req, res) => {
  const query = `
    SELECT 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        IFNULL(commission.cms_all_review, 0) AS cms_all_review,
        commission.cms_status,
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
        commission.deleted_at IS NULL 
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
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
    ORDER BY 
        commission.created_at DESC 
    LIMIT 15;

    `;

  dbConn.query(query, function (error, results) {

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
};

exports.artistCommission = (req, res) => {
  const myId = req.user.userId;
  let myFollowings = [];
  try {
    dbConn.query(
      "SELECT * FROM follow WHERE follower_id=?",
      [myId],
      function (error, results) {
        let query = '';
        if (error) {
          console.log(error);
        } else {
          for (let i = 0; i < results.length; i++) {
            const followingId = results[i].following_id;
            myFollowings.push(followingId);
          }
          if (myFollowings.length > 0) {
            // ตรงนี้คุณมีรายการ myFollowings ที่เป็นรายการ ID ของผู้ที่ฉันกำลังติดตาม
            // ใช้ myFollowings ในคำสั่ง SQL ด้านล่างเพื่อค้นหาข้อมูล commission ของพวกเขา
              query = `
              SELECT 
                  c.cms_id, c.cms_name, c.cms_desc, c.cms_status, IFNULL(c.cms_all_review, 0) AS cms_all_review,
                  img.ex_img_path, img.status, 
                  u.id, u.urs_name,
                  p.pkg_id, p.pkg_min_price,
                  COUNT(o.rw_id) AS total_reviews
              FROM commission c
              JOIN 
                  example_img img ON c.cms_id = img.cms_id
              JOIN 
                  users u ON c.usr_id = u.id
              JOIN 
                  package_in_cms p ON c.cms_id = p.cms_id
              LEFT JOIN
                  cms_order o ON c.cms_id = o.cms_id 
              WHERE 
                  c.usr_id IN (?) 
                  AND img.status = "passed" 
                  AND c.deleted_at IS NULL 
                  AND c.deleted_by IS NULL
              GROUP BY
                  c.cms_id, c.cms_name, c.cms_desc, c.cms_status, c.cms_all_review,
                  img.ex_img_path, img.status, u.id, u.urs_name, p.pkg_id, p.pkg_min_price
              ORDER BY 
                  c.created_at DESC 
              LIMIT 15;

          `;
            } else {
              return res.status(200).json({ status: "ok", commissions: 'คุณไม่มีนักวาดที่ติดตาม' });
            }
          }
          dbConn.query(query, [myFollowings], function (error, results) {
            if (error) {
              console.log(error);
              return res.status(500).json({ status: "error", message: "Database error" });
            }
            // console.log(results);

            // ตอนนี้คุณมีผลลัพธ์จากการค้นหา commission ของผู้ที่ฉันกำลังติดตาม
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
            // console.log(uniqueResults);
            // console.log(results);
            return res.status(200).json({ status: "ok", commissions: uniqueResults });
          });
        }
      );
    } catch (error) {
      console.log(error);
      return res.status(500).json({ status: "error", message: "artistCommission error" });
    }
};

exports.detailCommission = (req, res) => {
  // const getQueueSQL = `
  //   SELECT c.cms_id, c.cms_amount_q, COUNT(o.od_id) AS used_slots
  //   FROM commission c
  //   LEFT JOIN cms_order o ON c.cms_id = o.cms_id
  //   WHERE c.cms_id = ? AND o.od_status = ?
  //   GROUP BY c.cms_id, c.cms_amount_q
  // `
    const cmsID = req.params.id;
    try {
      const query = `
        SELECT 
          commission.cms_id, commission.cms_name, commission.cms_desc, commission.cms_amount_q, commission.cms_good_at, commission.cms_bad_at ,commission.cms_all_review, commission.cms_no_talking, commission.cms_all_finish, commission.created_at, commission.usr_id, commission.deleted_by, commission.delete_reason, commission.cms_status,
          example_img.ex_img_id , example_img.ex_img_path, example_img.status,
          package_in_cms.pkg_id, package_in_cms.pkg_name ,package_in_cms.pkg_desc ,package_in_cms.pkg_min_price ,package_in_cms.pkg_duration ,package_in_cms.pkg_edits,
          users.id, users.urs_name, users.urs_profile_img, IFNULL(users.urs_all_review, 0) as all_review, COALESCE(total_reviews, 0) AS total_reviews,
          commission_has_type_of_use.cms_id, commission_has_type_of_use.tou_id,
          type_of_use.tou_id, type_of_use.tou_name, type_of_use.tou_desc
        FROM 
          commission
        JOIN 
          example_img ON commission.cms_id = example_img.cms_id
        JOIN 
          package_in_cms ON commission.cms_id = package_in_cms.cms_id
        JOIN 
          users ON commission.usr_id = users.id
        JOIN 
          commission_has_type_of_use ON commission.cms_id = commission_has_type_of_use.cms_id
        JOIN 
          type_of_use ON type_of_use.tou_id = commission_has_type_of_use.tou_id
        LEFT JOIN (
          SELECT artist_id,
              COUNT(rw_id) AS total_reviews
          FROM cms_order
          WHERE rw_id IS NOT NULL
          GROUP BY artist_id
        ) AS order_counts ON users.id = order_counts.artist_id
        WHERE 
          commission.cms_id = ? 
          AND example_img.status = "passed" 
          AND commission.deleted_at IS NULL 
          AND commission.deleted_by IS NULL 
          AND package_in_cms.deleted_at IS NULL
      `;
      
      dbConn.query(query, [cmsID], function (error, results) {
        if (error) {
          console.log(error);
          return res.status(500).json({ status: "error", message: "Database error" });
        }
  
        if (results.length === 0) {
          return res.status(404).json({ status: "not found", message: "Commission not found" });
        }
  
        // ตอนนี้คุณมีผลลัพธ์จากการค้นหา commission
        const commissionData = results[0]; // เลือกข้อมูล commission แรก (หากมีมากกว่าหนึ่งเรคคอร์ด)
  
        // สร้าง JSON response แยกแต่ละส่วน
        const response = {
          status: "ok",
          commission: {
            cms_id: commissionData.cms_id,
            cms_amount_q: commissionData.cms_amount_q,
            cms_desc: commissionData.cms_desc,
            cms_name: commissionData.cms_name,
            cms_good_at: commissionData.cms_good_at,
            cms_bad_at: commissionData.cms_bad_at,
            cms_all_review: commissionData.cms_all_review,
            cms_no_talking: commissionData.cms_no_talking,
            cms_all_finish: commissionData.cms_all_finish,
            created_at: commissionData.created_at,
            updated_at: commissionData.updated_at,
            deleted_at: commissionData.deleted_at,
            cms_status: commissionData.cms_status,
            used_slots: commissionData.used_slots
          },
          artist: {
            artistId: commissionData.usr_id,
            artistName: commissionData.urs_name,
            artistProfile: commissionData.urs_profile_img,
            all_review: commissionData.all_review,
            total_reviews : commissionData.total_reviews
          },
        };
  
        const uniqueImages= [];
        const uniquePackages= [];
        const uniqueTypeofuse= [];
        const uniqueImagesIds = new Set();
        const uniquePackagesIds = new Set();
        const uniqueTypeofuseIds = new Set();
  
        results.forEach((result) => {
          const ex_img_id = result.ex_img_id; // หรือจะใช้ค่าอื่น ๆ ที่ต้องการตรวจสอบความซ้ำกัน
          if (!uniqueImagesIds.has(ex_img_id)) {
            uniqueImagesIds.add(ex_img_id);
            uniqueImages.push(result);
          }
        });
        results.forEach((result) => {
          const pkg_id = result.pkg_id;
          if (!uniquePackagesIds.has(pkg_id)) {
            uniquePackagesIds.add(pkg_id);
            uniquePackages.push(result);
          }
        });
  
        results.forEach((result) => {
          const tou_id = result.tou_id;
          if(!uniqueTypeofuseIds.has(tou_id)) {
            uniqueTypeofuseIds.add(tou_id);
            uniqueTypeofuse.push(result);
          }
        })
  
        response.images = uniqueImages.map((result) => ({
          ex_img_id: result.ex_img_id,
          ex_img_name: result.ex_img_name,
          ex_img_path: result.ex_img_path,
          ex_img_type: result.ex_img_type,
        }));
  
        response.packages = uniquePackages.map((result) => ({
          pkg_id: result.pkg_id,
          pkg_name: result.pkg_name,
          pkg_desc: result.pkg_desc,
          pkg_min_price: result.pkg_min_price,
          pkg_duration: result.pkg_duration,
          pkg_edits: result.pkg_edits
        }));
  
        response.typeofuse = uniqueTypeofuse.map((result) => ({
          tou_id: result.tou_id,
          tou_name: result.tou_name,
          tou_desc: result.tou_desc
        }));

      // console.log(response);

      return res.status(200).json(response);
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

exports.getQueueInfo = (req, res) => {
  const cmsID = req.params.id;
  const od_status = "inprogress";
  const getQueueSQL = `
    SELECT c.cms_id, c.cms_amount_q, COUNT(o.od_id) AS used_slots
    FROM commission c
    LEFT JOIN cms_order o ON c.cms_id = o.cms_id
    WHERE c.cms_id = ? AND o.od_status = ?
    GROUP BY c.cms_id, c.cms_amount_q
  `
  dbConn.query(getQueueSQL, [cmsID, od_status], (error, results) => {
    if (error) {
      return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
    }
    const getQueueDataSQL = `
      SELECT o.od_id, o.ordered_at, u.id, u.urs_name, u.urs_email, s.step_name, c.cms_id, c.cms_name, p.pkg_name
      FROM cms_order o
      JOIN users u ON o.customer_id = u.id
      JOIN cms_steps s ON o.od_current_step_id = s.step_id
      JOIN commission c ON o.cms_id = c.cms_id
      JOIN package_in_cms p ON o.pkg_id = p.pkg_id
      WHERE o.od_status = 'inprogress' AND o.cms_id = ?
      ORDER BY o.ordered_at ASC;
    `
    dbConn.query(getQueueDataSQL, [cmsID], (err, result) => {
      if (err) {
        return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
      }
      console.log(results);
      console.log(result);

      return res.status(200).json({ QueueInfo: results, QueueData: result });
    })
    // console.log(results);
  })
};

exports.getQueue = (req, res) => {
  const cmsID = req.params.id;
  dbConn.query(`SELECT cms_amount_q FROM commission WHERE cms_id=?`, [cmsID],
    function (error, results) {
      if (error) {
        return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
      }
      const Queue = results[0].cms_amount_q;
      return res.status(200).json({ Queue });
    }
  );
};

exports.getQueueData = (req, res) => {
  const cmsId = req.params.id;
  const od_status = "inprogress";
  const sql = `
    SELECT 
      o.od_id, o.od_q_number, o.ordered_at,
      c.cms_id, c.cms_name,
      pk.pkg_id, pk.pkg_name,
      u.id, u.urs_name,
      s.step_name
    FROM cms_order o
    JOIN 
      commission c ON o.cms_id = c.cms_id
    JOIN
      package_in_cms pk ON c.cms_id = pk.cms_id
    JOIN
      users u ON u.id = o.customer_id
    JOIN 
      cms_steps s ON o.od_current_step_id = s.step_id
    WHERE 
      c.cms_id = ? AND o.od_status = ?
    ORDER BY o.od_q_number ASC
  `
  dbConn.query(sql, [cmsId, od_status], function(error, results){
    if (error) {
      console.log(error);
      return res.status(500).json({ error })
    }
    const uniqueResults = [...new Set(results.map(JSON.stringify))].map(JSON.parse);
    // console.log(uniqueResults);
    // console.log(results);
    return res.status(200).json({ status: 'ok', results })
  })
}

// exports.getQueueData = (req, res) => {
//   const cmsId = req.params.id;
//   const od_status = "inprogress";
//   dbConn.query(`
//   SELECT 
//     cms_order.od_id, 
//     commission.cms_id, commission.cms_name,
//     package_in_cms.pkg_id, package_in_cms.pkg_name
//   FROM cms_order 
//   JOIN 
//     commission ON cms_order.cms_id = commission.cms_id
//   JOIN 
//     example_img ON cms_order.cms_id = example_img.cms_id
//   JOIN 
//     package_in_cms ON commission.cms_id = package_in_cms.cms_id
//   WHERE 
//     cms_order.cms_id = ?
//   ORDER BY cms_order.od_q_number ASC`, [cmsId],
//     function (error, results) {
//       if (error) {
//         console.log(error);
//         return res.status(500).json({ error })
//       }
//       // console.log(results);
//       // const uniqueResults = Array.from(new Set(results));
//       const uniqueResults = [...new Set(results.map(JSON.stringify))].map(JSON.parse);
//       return res.status(200).json({ status: 'ok', uniqueResults })
//     })
// };

exports.updateCommission = async (req, res) => {
  // console.log(req.body);
  const deletedPkgIds = req.query.deletedPkgIds;
  const userId = req.user.userId;
  const cms_id = req.params.id;
  try {
    function insertCms_type_of_use(typeofuse, cms_id, userId) {
      const tous = typeofuse.split(',');
      const records = tous.map((tou) => ({
        typeofused: tou,
        cms_id,
        userId,
      }));
      const insertPromises = records.map((record) => {
        return new Promise((resolve, reject) => {
          dbConn.query(
            "INSERT INTO commission_has_type_of_use (cms_id, usr_id, tou_id) VALUES (?, ?, ?)",
            [record.cms_id, record.userId, record.typeofused],
            (error, result) => {
              if (error) {
                console.error('Error inserting record:', error);
                reject(error);
              } else {
                console.log('commission_has_type_of_use success:', result.insertId);
                resolve(result.insertId);
              }
            }
          );
        });
      });

      return Promise.all(insertPromises);
    }

    const { commission_name, typeofuse, commission_description, commission_q, good, bad, no_talking } = req.body;

    const updateResult = await new Promise((resolve, reject) => {
      dbConn.query(`
        UPDATE commission SET cms_name=?, cms_desc=?, cms_amount_q=?, cms_good_at=?, cms_bad_at=?, cms_no_talking=? WHERE cms_id=? AND usr_id=?
      `, [commission_name, commission_description, commission_q, good, bad, no_talking, cms_id, userId],
        function (error, results) {
          if (error) {
            console.log(error);
            reject(error);
          }
          resolve(results);
        });
    });

    const deleteResult = await new Promise((resolve, reject) => {
      dbConn.query(`DELETE FROM commission_has_type_of_use WHERE cms_id=? AND usr_id=?`, [cms_id, userId],
        function (err, result) {
          if (err) {
            console.log(err);
            reject(err);
          }
          resolve(result);
        });
    });

    const insertResults = await insertCms_type_of_use(typeofuse, cms_id, userId);

    
    const { package_id, package_name, package_detail, duration, price, edits } = req.body;

    if (Array.isArray(package_id)) {
      // กรณี package_id เป็น array (มีการอัปเดตหลายรายการ)
      // สร้าง array ของ objects ที่เก็บข้อมูลแต่ละชุดเป็นเจาะจง
      const packagesData = package_id.map((id, index) => ({
        id,
        name: package_name[index],
        detail: package_detail[index],
        duration: duration[index],
        price: price[index],
        edits: edits[index]
      }));

      // สร้างคำสั่ง SQL UPDATE โดยใช้ parameterized query
      const updatePackageSQL = `
        UPDATE package_in_cms
        SET pkg_name = ?,
            pkg_desc = ?,
            pkg_min_price = ?,
            pkg_duration = ?,
            pkg_edits = ?
        WHERE pkg_id = ?;
      `;

      // execute คำสั่ง SQL UPDATE สำหรับทุกชุดข้อมูลพร้อมกัน
      packagesData.forEach(packageData => {
        const params = [
          packageData.name,
          packageData.detail,
          packageData.price,
          packageData.duration,
          packageData.edits,
          packageData.id
        ];

        dbConn.query(updatePackageSQL, params, function (error, result) {
          if (error) {
            console.log(error);
          } else {
            console.log(result);
          }
        });
      });
    } else {
      // กรณี package_id เป็นข้อมูลเดี่ยว (มีการอัปเดตเพียงรายการเดียว)
      const updatePackageSQL = `
        UPDATE package_in_cms
        SET pkg_name = ?,
            pkg_desc = ?,
            pkg_min_price = ?,
            pkg_duration = ?,
            pkg_edits = ?
        WHERE pkg_id = ?;
      `;

      const params = [
        package_name,
        package_detail,
        price,
        duration,
        edits,
        package_id
      ];

      dbConn.query(updatePackageSQL, params, function (error, result) {
        if (error) {
          console.log(error);
        } else {
          console.log(result);
        }
      });
    }

    // ทำเกี่ยวกับการลบ package
    if (deletedPkgIds != "") {
      const delpkgSQL = `
        UPDATE package_in_cms SET deleted_at = ? WHERE pkg_id IN (?)
      `
      dbConn.query(delpkgSQL, [date, deletedPkgIds], function (error, result) {
        if (error) {
          console.log(error);
        }
      })
    }




    return res.status(200).json({ status: 'ok', message: "แก้ไข cms สำเร็จ" });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: 'An error occurred' });
  }
};

exports.deleteCommission = (req, res) => {
  const cms_id = req.params.id;
  try {
    dbConn.query(
      "UPDATE commission SET deleted_at = ? WHERE cms_id = ?",
      [date, cms_id],
      function (error, results) {
        if (error) {
          console.log('deleteCommission : ', error);
          return res.status(500).json({ status: 'error', })
        }
        return res.status(200).json({ status: 'ok', message: "ลบคอมมิชชันสำเร็จ", })
      }
    );
  } catch {
    return res.json({
      status: "catch",
      message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง",
    });
  }
};

exports.getCommission = (req, res) => {
  let sortBy = req.query.sortBy || 'ล่าสุด';
  let filterBy = req.query.filterBy || 'all';
  let topicValues = req.query.topicValues || 'null';
  let cmsStatus = req.query.cmsStatus || 'open';

  let query = ``;

  // เช็คทั้งหัวข้อจากทั้งหมด หากเป็น else จะหาเฉพาะ topicValues ที่เลือก
  if (topicValues.length >= 19 && cmsStatus != "all") {
    query = `
    SELECT 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        commission.cms_status,
        IFNULL(commission.cms_all_review, 0) AS cms_all_review,
        COUNT(cms_order.rw_id) AS total_reviews,
        example_img.ex_img_path, 
        example_img.status,
        users.id, 
        users.urs_name,
        package_in_cms.pkg_id, 
        package_in_cms.pkg_min_price,
        commission_has_topic.tp_id
    FROM 
        commission
    JOIN 
        example_img ON commission.cms_id = example_img.cms_id
    JOIN 
        users ON commission.usr_id = users.id
    JOIN 
        package_in_cms ON commission.cms_id = package_in_cms.cms_id
    JOIN
        commission_has_topic ON commission.cms_id = commission_has_topic.cms_id
    LEFT JOIN
        cms_order ON commission.cms_id = cms_order.cms_id 
    WHERE 
        commission.deleted_at IS NULL
        AND commission.cms_status = "${cmsStatus}"
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
        )
    GROUP BY 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        commission.cms_status,
        IFNULL(commission.cms_all_review, 0),
        example_img.ex_img_path, 
        example_img.status,
        users.id, 
        users.urs_name,
        package_in_cms.pkg_id, 
        package_in_cms.pkg_min_price,
        commission_has_topic.tp_id
    ORDER BY 
      ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
      ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
      ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
      ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
      ${sortBy === 'คะแนนรีวิว ↑' ? 'cms_all_review ASC' : ''}
      ${sortBy === 'คะแนนรีวิว ↓' ? 'cms_all_review DESC' : ''}

    `;
  } else if (topicValues.length >= 19 && cmsStatus == "all") {
    query = `
      SELECT 
      commission.cms_id, 
      commission.cms_name, 
      commission.cms_desc, 
      commission.cms_status,
      IFNULL(commission.cms_all_review, 0) AS cms_all_review,
      COUNT(cms_order.rw_id) AS total_reviews,
      example_img.ex_img_path, 
      example_img.status,
      users.id, 
      users.urs_name,
      package_in_cms.pkg_id, 
      package_in_cms.pkg_min_price,
      commission_has_topic.tp_id
    FROM 
        commission
    JOIN 
        example_img ON commission.cms_id = example_img.cms_id
    JOIN 
        users ON commission.usr_id = users.id
    JOIN 
        package_in_cms ON commission.cms_id = package_in_cms.cms_id
    JOIN
        commission_has_topic ON commission.cms_id = commission_has_topic.cms_id
    LEFT JOIN
        cms_order ON commission.cms_id = cms_order.cms_id 
    WHERE 
        commission.deleted_at IS NULL
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
        )
    GROUP BY 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        commission.cms_status,
        IFNULL(commission.cms_all_review, 0),
        example_img.ex_img_path, 
        example_img.status,
        users.id, 
        users.urs_name,
        package_in_cms.pkg_id, 
        package_in_cms.pkg_min_price,
        commission_has_topic.tp_id
    ORDER BY 
      ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
      ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
      ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
      ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
      ${sortBy === 'คะแนนรีวิว ↑' ? 'commission.cms_all_review ASC' : ''}
      ${sortBy === 'คะแนนรีวิว ↓' ? 'commission.cms_all_review DESC' : ''}
    `
  } else {
    if (cmsStatus != "all") {
      query = `
      SELECT 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        commission.cms_status,
        IFNULL(commission.cms_all_review, 0) AS cms_all_review,
        COUNT(cms_order.rw_id) AS total_reviews,
        example_img.ex_img_path, 
        example_img.status,
        users.id, 
        users.urs_name,
        package_in_cms.pkg_id, 
        package_in_cms.pkg_min_price,
        commission_has_topic.tp_id
      FROM 
          commission
      JOIN 
          example_img ON commission.cms_id = example_img.cms_id
      JOIN 
          users ON commission.usr_id = users.id
      JOIN 
          package_in_cms ON commission.cms_id = package_in_cms.cms_id
      JOIN
          commission_has_topic ON commission.cms_id = commission_has_topic.cms_id
      LEFT JOIN
          cms_order ON commission.cms_id = cms_order.cms_id 
      WHERE 
          commission.deleted_at IS NULL
          AND commission.cms_status = "${cmsStatus}"
          AND commission_has_topic.tp_id IN (${topicValues})
          AND commission.cms_id NOT IN (
              SELECT cms_id
              FROM example_img
              WHERE status = 'failed'
          )
      GROUP BY 
          commission.cms_id, 
          commission.cms_name, 
          commission.cms_desc, 
          commission.cms_status,
          IFNULL(commission.cms_all_review, 0),
          example_img.ex_img_path, 
          example_img.status,
          users.id, 
          users.urs_name,
          package_in_cms.pkg_id, 
          package_in_cms.pkg_min_price,
          commission_has_topic.tp_id
      ORDER BY 
        ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
        ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
        ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
        ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
        ${sortBy === 'คะแนนรีวิว ↑' ? 'commission.cms_all_review ASC' : ''}
        ${sortBy === 'คะแนนรีวิว ↓' ? 'commission.cms_all_review DESC' : ''}
      `;
    } else {
      query = `
      SELECT 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        commission.cms_status,
        IFNULL(commission.cms_all_review, 0) AS cms_all_review,
        COUNT(cms_order.rw_id) AS total_reviews,
        example_img.ex_img_path, 
        example_img.status,
        users.id, 
        users.urs_name,
        package_in_cms.pkg_id, 
        package_in_cms.pkg_min_price,
        commission_has_topic.tp_id
      FROM 
          commission
      JOIN 
          example_img ON commission.cms_id = example_img.cms_id
      JOIN 
          users ON commission.usr_id = users.id
      JOIN 
          package_in_cms ON commission.cms_id = package_in_cms.cms_id
      JOIN
          commission_has_topic ON commission.cms_id = commission_has_topic.cms_id
      LEFT JOIN
          cms_order ON commission.cms_id = cms_order.cms_id 
      WHERE 
          commission.deleted_at IS NULL
          AND commission_has_topic.tp_id IN (${topicValues})
          AND commission.cms_id NOT IN (
              SELECT cms_id
              FROM example_img
              WHERE status = 'failed'
          )
      GROUP BY 
          commission.cms_id, 
          commission.cms_name, 
          commission.cms_desc, 
          commission.cms_status,
          IFNULL(commission.cms_all_review, 0),
          example_img.ex_img_path, 
          example_img.status,
          users.id, 
          users.urs_name,
          package_in_cms.pkg_id, 
          package_in_cms.pkg_min_price,
          commission_has_topic.tp_id
      ORDER BY 
        ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
        ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
        ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
        ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
        ${sortBy === 'คะแนนรีวิว ↑' ? 'commission.cms_all_review ASC' : ''}
        ${sortBy === 'คะแนนรีวิว ↓' ? 'commission.cms_all_review DESC' : ''}
      `
    }
  }
  dbConn.query(query, function (error, results) {
      
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
};


exports.getCommissionIfollow = (req, res) => {
  let sortBy = req.query.sortBy || 'ล่าสุด';
  let IFollowingIDs = req.query.IFollowingIDs || '';
  let topicValues = req.query.topicValues || null;
  let cmsStatus = req.query.cmsStatus || 'open';
  // console.log(topicValues);

  let query = ``;

  // เช็คทั้งหัวข้อจากทั้งหมด หากเป็น else จะหาเฉพาะ topicValues ที่เลือก
  if (topicValues == 0 && cmsStatus != "all") {
    query = `
    SELECT 
      commission.cms_id, 
      commission.cms_name, 
      commission.cms_desc, 
      commission.cms_status,
      IFNULL(commission.cms_all_review, 0) AS cms_all_review,
      COUNT(cms_order.rw_id) AS total_reviews,
      example_img.ex_img_path, 
      example_img.status,
      users.id, 
      users.urs_name,
      package_in_cms.pkg_id, 
      package_in_cms.pkg_min_price,
      commission_has_topic.tp_id
    FROM 
        commission
    JOIN 
        example_img ON commission.cms_id = example_img.cms_id
    JOIN 
        users ON commission.usr_id = users.id
    JOIN 
        package_in_cms ON commission.cms_id = package_in_cms.cms_id
    JOIN
        commission_has_topic ON commission.cms_id = commission_has_topic.cms_id
    LEFT JOIN
        cms_order ON commission.cms_id = cms_order.cms_id 
    WHERE 
        commission.deleted_at IS NULL
        AND commission.usr_id IN (${IFollowingIDs})
        AND commission.cms_status = "${cmsStatus}"
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
        )
    GROUP BY 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        commission.cms_status,
        IFNULL(commission.cms_all_review, 0),
        example_img.ex_img_path, 
        example_img.status,
        users.id, 
        users.urs_name,
        package_in_cms.pkg_id, 
        package_in_cms.pkg_min_price,
        commission_has_topic.tp_id
    ORDER BY 
      ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
      ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
      ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
      ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
      ${sortBy === 'คะแนนรีวิว ↑' ? 'commission.cms_all_review ASC' : ''}
      ${sortBy === 'คะแนนรีวิว ↓' ? 'commission.cms_all_review DESC' : ''}
    `;
  } else if (topicValues == 0 && cmsStatus == "all") {
    query = `
    SELECT 
      commission.cms_id, 
      commission.cms_name, 
      commission.cms_desc, 
      commission.cms_status,
      IFNULL(commission.cms_all_review, 0) AS cms_all_review,
      COUNT(cms_order.rw_id) AS total_reviews,
      example_img.ex_img_path, 
      example_img.status,
      users.id, 
      users.urs_name,
      package_in_cms.pkg_id, 
      package_in_cms.pkg_min_price,
      commission_has_topic.tp_id
    FROM 
        commission
    JOIN 
        example_img ON commission.cms_id = example_img.cms_id
    JOIN 
        users ON commission.usr_id = users.id
    JOIN 
        package_in_cms ON commission.cms_id = package_in_cms.cms_id
    JOIN
        commission_has_topic ON commission.cms_id = commission_has_topic.cms_id
    LEFT JOIN
        cms_order ON commission.cms_id = cms_order.cms_id 
    WHERE 
        commission.deleted_at IS NULL
        AND commission.usr_id IN (${IFollowingIDs})
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
        )
    GROUP BY 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        commission.cms_status,
        IFNULL(commission.cms_all_review, 0),
        example_img.ex_img_path, 
        example_img.status,
        users.id, 
        users.urs_name,
        package_in_cms.pkg_id, 
        package_in_cms.pkg_min_price,
        commission_has_topic.tp_id
    ORDER BY 
      ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
      ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
      ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
      ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
      ${sortBy === 'คะแนนรีวิว ↑' ? 'commission.cms_all_review ASC' : ''}
      ${sortBy === 'คะแนนรีวิว ↓' ? 'commission.cms_all_review DESC' : ''}
    `;
  } else {
    if (cmsStatus != "all") {
      query = `
      SELECT 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        commission.cms_status,
        IFNULL(commission.cms_all_review, 0) AS cms_all_review,
        COUNT(cms_order.rw_id) AS total_reviews,
        example_img.ex_img_path, 
        example_img.status,
        users.id, 
        users.urs_name,
        package_in_cms.pkg_id, 
        package_in_cms.pkg_min_price,
        commission_has_topic.tp_id
      FROM 
          commission
      JOIN 
          example_img ON commission.cms_id = example_img.cms_id
      JOIN 
          users ON commission.usr_id = users.id
      JOIN 
          package_in_cms ON commission.cms_id = package_in_cms.cms_id
      JOIN
          commission_has_topic ON commission.cms_id = commission_has_topic.cms_id
      LEFT JOIN
          cms_order ON commission.cms_id = cms_order.cms_id 
      WHERE 
          commission.deleted_at IS NULL
          AND commission.usr_id IN (${IFollowingIDs})
          AND commission.cms_status = "${cmsStatus}"
          AND commission_has_topic.tp_id IN (${topicValues})
          AND commission.cms_id NOT IN (
              SELECT cms_id
              FROM example_img
              WHERE status = 'failed'
          )
      GROUP BY 
          commission.cms_id, 
          commission.cms_name, 
          commission.cms_desc, 
          commission.cms_status,
          IFNULL(commission.cms_all_review, 0),
          example_img.ex_img_path, 
          example_img.status,
          users.id, 
          users.urs_name,
          package_in_cms.pkg_id, 
          package_in_cms.pkg_min_price,
          commission_has_topic.tp_id
      ORDER BY 
        ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
        ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
        ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
        ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
        ${sortBy === 'คะแนนรีวิว ↑' ? 'commission.cms_all_review ASC' : ''}
        ${sortBy === 'คะแนนรีวิว ↓' ? 'commission.cms_all_review DESC' : ''}
      `;
    } else {
      query = `
      SELECT 
        commission.cms_id, 
        commission.cms_name, 
        commission.cms_desc, 
        commission.cms_status,
        IFNULL(commission.cms_all_review, 0) AS cms_all_review,
        COUNT(cms_order.rw_id) AS total_reviews,
        example_img.ex_img_path, 
        example_img.status,
        users.id, 
        users.urs_name,
        package_in_cms.pkg_id, 
        package_in_cms.pkg_min_price,
        commission_has_topic.tp_id
      FROM 
          commission
      JOIN 
          example_img ON commission.cms_id = example_img.cms_id
      JOIN 
          users ON commission.usr_id = users.id
      JOIN 
          package_in_cms ON commission.cms_id = package_in_cms.cms_id
      JOIN
          commission_has_topic ON commission.cms_id = commission_has_topic.cms_id
      LEFT JOIN
          cms_order ON commission.cms_id = cms_order.cms_id 
      WHERE 
          commission.deleted_at IS NULL
          AND commission.usr_id IN (${IFollowingIDs})
          AND commission_has_topic.tp_id IN (${topicValues})
          AND commission.cms_id NOT IN (
              SELECT cms_id
              FROM example_img
              WHERE status = 'failed'
          )
      GROUP BY 
          commission.cms_id, 
          commission.cms_name, 
          commission.cms_desc, 
          commission.cms_status,
          IFNULL(commission.cms_all_review, 0),
          example_img.ex_img_path, 
          example_img.status,
          users.id, 
          users.urs_name,
          package_in_cms.pkg_id, 
          package_in_cms.pkg_min_price,
          commission_has_topic.tp_id
      ORDER BY 
        ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
        ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
        ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
        ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
        ${sortBy === 'คะแนนรีวิว ↑' ? 'commission.cms_all_review ASC' : ''}
        ${sortBy === 'คะแนนรีวิว ↓' ? 'commission.cms_all_review DESC' : ''}
      `;
    }
  }
  dbConn.query(query, function (error, results) {
    // console.log(results);
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
};


exports.manageStatusCms = (req, res) => {
  const cmsId = req.params.id;
  const cmsStatus = req.body.cmsStatus
  console.log(cmsStatus)
  console.log(cmsId)
  let newStatus;
  if (cmsStatus == 'open') {
    newStatus = 'close'
  } else {
    newStatus = 'open'
  }

  dbConn.query(
    `UPDATE commission
      SET cms_status = ? ,updated_at=?
      WHERE cms_id = ?` ,
    [newStatus, date, cmsId], function (error, result) {
      if (error) {
        res.json({ status: "error" })
      } else {
        res.json({ status: "ok" })
        
      }
      

    }
  )
}