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
            "INSERT INTO commission SET cms_name=?, cms_desc=?, cms_amount_q=?, cms_good_at=?, cms_bad_at=?, cms_no_talking=?, usr_id=?",
            [...data, userId],
            (error, results) => {
            if (error) {
                reject(error);
            } else {
              console.log("CMS Success");
              resolve(results.insertId);
            }
            }
        );
      });
    }
  
    function insertPackage(data, step, commissionId, userId) {
      // console.log('step',step);
      // console.log('step',step.split(',').length);
      const allWipArr = step.split(',')
      const halfWip = Math.floor(allWipArr.length / 2) //หารครึี่งปัดเศษลงหลังจากสเตปนี้ต้องจ่ายสลิป2
      let newAllSteps = ""
      allWipArr.map((wip, index) => {
        //มี 2 ขั้นตอน มี 0 และ 1
        //half = 1
        //ถ้ามี 2 ขั้นตอนเข้า 2 เงื่อนไขแรก ถ้ามี 1 ขั้นตอนเข้า 3 เงื่อนไข
        let count = 0;
        if (index == 0) {
          newAllSteps += "ส่งคำขอจ้าง,รับคำขอจ้าง,ภาพร่าง,ระบุราคา,แนบสลิป,ตรวจสอบใบเสร็จ,"
          count += 1;
        }

        if (count <= 1) newAllSteps += "ภาพ" + wip +","
        
        if (index == halfWip) {
          newAllSteps += "แนบสลิป2,ตรวจสอบใบเสร็จ2,"
          count += 1;
        }
        if (index == allWipArr.length - 1) {
          newAllSteps += "ภาพไฟนัล,แอดมินอนุมัติ,รีวิว"
          count += 1;
        }
      })

      console.log("newAllSteps="+newAllSteps)

      return new Promise((resolve, reject) => {
        dbConn.query(
          "INSERT INTO package_in_cms SET pkg_name=?, pkg_desc=?, pkg_min_price=?, pkg_duration=?, pkg_edits=?, cms_step=?, cms_id=?, usr_id=?",
          [...data, newAllSteps, commissionId, userId],
          //รับคำขอจ้าง,ภาพร่าง,ระบุราคา,แนบสลิป,ตรวจสอบใบเสร็จ,...ขั้นตอน,แนบสลิป2มตรวจสอบใบเสร็จ2,...ขั้นตอน,ภาพไฟนัล,แอดมินอนุมัติผลงาน,รีวิว
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
      const commissionPromise = insertCommission(
          [commission_name, commission_description, commission_que, good, bad, no_talking],userId
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
              userId
            );
          }
          console.log();
        } else {
          insertPackage(
            [package_name, package_detail, price, duration, edits],
            step,
            commissionId,
            userId
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
                    const image_name = image_cms.split("/images_cms/")[1];
  
                    const ExampleImagePromise = insertExampleImage(
                      [image_name, image_cms],
                      commissionId,
                      userId
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
      example_img.ex_img_path, 
      example_img.status,
      users.id, 
      users.urs_name,
      package_in_cms.pkg_id, 
      package_in_cms.pkg_min_price
    FROM 
        commission
    JOIN 
        example_img ON commission.cms_id = example_img.cms_id
    JOIN 
        users ON commission.usr_id = users.id
    JOIN 
        package_in_cms ON commission.cms_id = package_in_cms.cms_id
    WHERE 
        commission.deleted_at IS NULL 
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
        )
    ORDER BY 
        commission.created_at DESC 
    LIMIT 15;
    `;
    // WHERE commission.usr_id NOT IN (?) AND commission.cms_status = "pass"

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

exports.artistCommission = (req, res) => {
    const myId = req.user.userId;
    const myFollowings = [];
    try {
      dbConn.query(
        "SELECT * FROM follow WHERE follower_id=?",
        [myId],
        function (error, results) {
          if (error) {
            console.log(error);
          }
          for (let i = 0; i < results.length; i++) {
            const followingId = results[i].following_id;
            myFollowings.push(followingId);
          }
          // ตรงนี้คุณมีรายการ myFollowings ที่เป็นรายการ ID ของผู้ที่ฉันกำลังติดตาม
          // ใช้ myFollowings ในคำสั่ง SQL ด้านล่างเพื่อค้นหาข้อมูล commission ของพวกเขา
          const query = `
            SELECT commission.cms_id, commission.cms_name, commission.cms_desc, 
            example_img.ex_img_path, example_img.status, users.id, users.urs_name,
            package_in_cms.pkg_id, package_in_cms.pkg_min_price
            FROM commission
            JOIN example_img ON commission.cms_id = example_img.cms_id
            JOIN users ON commission.usr_id = users.id
            JOIN package_in_cms ON commission.cms_id = package_in_cms.cms_id
            WHERE commission.usr_id IN (?) AND example_img.status = "passed" AND commission.deleted_at IS NULL AND commission.deleted_by IS NULL
            ORDER BY commission.created_at DESC LIMIT 15
          `;
          
          dbConn.query(query, [myFollowings], function (error, results) {
            if (error) {
              console.log(error);
              return res.status(500).json({ status: "error", message: "Database error" });
            }
            // ตอนนี้คุณมีผลลัพธ์จากการค้นหา commission ของผู้ที่ฉันกำลังติดตาม
            // console.log(results);
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
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.detailCommission = (req, res) => {
    const cmsID = req.params.id;
    try {
      const query = `
        SELECT commission.cms_id, commission.cms_name, commission.cms_desc, commission.cms_amount_q, commission.cms_good_at, commission.cms_bad_at ,commission.cms_all_review, commission.cms_no_talking, commission.cms_all_finish, commission.created_at, commission.usr_id, commission.deleted_by, commission.delete_reason,
        example_img.ex_img_id , example_img.ex_img_path, example_img.status,
        package_in_cms.pkg_id, package_in_cms.pkg_name ,package_in_cms.pkg_desc ,package_in_cms.pkg_min_price ,package_in_cms.pkg_duration ,package_in_cms.pkg_edits,
        users.id, users.urs_name, users.urs_profile_img,
        commission_has_type_of_use.cms_id, commission_has_type_of_use.tou_id,
        type_of_use.tou_id, type_of_use.tou_name, type_of_use.tou_desc
        FROM commission
        JOIN example_img ON commission.cms_id = example_img.cms_id
        JOIN package_in_cms ON commission.cms_id = package_in_cms.cms_id
        JOIN users ON commission.usr_id = users.id
        JOIN commission_has_type_of_use ON commission.cms_id = commission_has_type_of_use.cms_id
        JOIN type_of_use ON type_of_use.tou_id = commission_has_type_of_use.tou_id
        WHERE commission.cms_id = ? AND example_img.status = "passed" AND commission.deleted_at IS NULL AND commission.deleted_by IS NULL
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
          },
          artist: {
            artistId: commissionData.usr_id,
            artistName: commissionData.urs_name,
            artistProfile: commissionData.urs_profile_img
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
  
        return res.status(200).json(response);
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};
  
exports.getQueue = (req, res) => {
    const cmsID = req.params.id;
    dbConn.query(`SELECT cms_amount_q FROM commission WHERE cms_id=?`, [cmsID],
        function(error, results) {
        if (error) {
            return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาด" });
        } else {
            const Queue = results[0].cms_amount_q;
            dbConn.query(`SELECT od_q_number FROM cms_order WHERE cms_id=? ORDER BY od_id DESC LIMIT 1`, [cmsID],
            function (error, result) {
            if (error) {
                console.log('เกิดข้อผิดพลาดในการค้นหาค่า od_q_number');
                return res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดในการค้นหาค่า od_q_number" });
            } else {
                let latestOdQNumber = 0
                if (result.length > 0) {
                latestOdQNumber = result[0].od_q_number;
                return res.status(200).json({ 
                    Queue,
                    latestOdQNumber,
                });
                } else {
                return res.status(200).json({ 
                    Queue,
                    latestOdQNumber,
                });
                }
            }
            })
        }
        }
    );
};

exports.getQueueData = (req, res) => {
  const cmsId = req.params.id;
  dbConn.query(`
  SELECT cms_order.od_id, 
  commission.cms_id, commission.cms_name,
  package_in_cms.pkg_id, package_in_cms.pkg_name
  FROM cms_order 
  JOIN commission ON cms_order.cms_id = commission.cms_id
  JOIN example_img ON cms_order.cms_id = example_img.cms_id
  JOIN package_in_cms ON commission.cms_id = package_in_cms.cms_id
  WHERE cms_order.cms_id = ?
  ORDER BY cms_order.od_q_number ASC`, [cmsId],
  function(error, results){
      if (error) {
          console.log(error);
          return res.status(500).json({error})
      }
      // console.log(results);
      // const uniqueResults = Array.from(new Set(results));
      const uniqueResults = [...new Set(results.map(JSON.stringify))].map(JSON.parse);
      return res.status(200).json({status:'ok', uniqueResults})
  })
};

exports.deleteCommission = (req, res) => {
  dbConn.query('',
  [],
  function(error, results){
    
  })
};

exports.getCommission = (req, res) => {
  let sortBy = req.query.sortBy || 'ล่าสุด';
  let filterBy = req.query.filterBy || 'all';
  let topicValues = req.query.topicValues || 'null';
  // console.log(topicValues);
  let query = ``;
  if (topicValues.includes("0")) {
    query = `
    SELECT 
      commission.cms_id, 
      commission.cms_name, 
      commission.cms_desc, 
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
    WHERE 
        commission.deleted_at IS NULL
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
        )
    ORDER BY 
      ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
      ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
      ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
      ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
      ${sortBy === 'คะแนนรีวิว ↑' ? 'rating ASC' : ''}
      ${sortBy === 'คะแนนรีวิว ↓' ? 'rating DESC' : ''}
    `;
  } else {
    query = `
    SELECT 
      commission.cms_id, 
      commission.cms_name, 
      commission.cms_desc, 
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
    WHERE 
        commission.deleted_at IS NULL
        AND commission_has_topic.tp_id IN (${topicValues})
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
        )
    ORDER BY 
      ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
      ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
      ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
      ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
      ${sortBy === 'คะแนนรีวิว ↑' ? 'rating ASC' : ''}
      ${sortBy === 'คะแนนรีวิว ↓' ? 'rating DESC' : ''}
    `;
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

exports.getCommissionIfollow = (req, res) => {
  let sortBy = req.query.sortBy || 'ล่าสุด';
  let IFollowingIDs = req.query.IFollowingIDs || '';
  let topicValues = req.query.topicValues || 'null';
  // console.log(topicValues);
  
  let query = ``;
  if (topicValues.includes("0")) {
    query = `
    SELECT 
      commission.cms_id, 
      commission.cms_name, 
      commission.cms_desc, 
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
    WHERE 
        commission.deleted_at IS NULL
        AND commission.usr_id IN (${IFollowingIDs})
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
        )
    ORDER BY 
      ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
      ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
      ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
      ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
      ${sortBy === 'คะแนนรีวิว ↑' ? 'rating ASC' : ''}
      ${sortBy === 'คะแนนรีวิว ↓' ? 'rating DESC' : ''}
    `;
  } else {
    query = `
    SELECT 
      commission.cms_id, 
      commission.cms_name, 
      commission.cms_desc, 
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
    WHERE 
        commission.deleted_at IS NULL
        AND commission.usr_id IN (${IFollowingIDs})
        AND commission_has_topic.tp_id IN (${topicValues})
        AND commission.cms_id NOT IN (
            SELECT cms_id
            FROM example_img
            WHERE status = 'failed'
        )
    ORDER BY 
      ${sortBy === 'ล่าสุด' ? 'commission.created_at DESC' : ''}
      ${sortBy === 'เก่าสุด' ? 'commission.created_at ASC' : ''}
      ${sortBy === 'ราคา ↑' ? 'package_in_cms.pkg_min_price ASC' : ''}
      ${sortBy === 'ราคา ↓' ? 'package_in_cms.pkg_min_price DESC' : ''}
      ${sortBy === 'คะแนนรีวิว ↑' ? 'rating ASC' : ''}
      ${sortBy === 'คะแนนรีวิว ↓' ? 'rating DESC' : ''}
    `;
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