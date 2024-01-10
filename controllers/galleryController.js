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

exports.selectgallory = (req, res) => {
    const userId = req.user.userId;
    dbConn.query(`
    SELECT example_img.ex_img_id, example_img.ex_img_path FROM commission JOIN example_img ON commission.cms_id = example_img.cms_id
    WHERE commission.usr_id = ? AND commission.deleted_at IS NULL AND example_img.deleted_at IS NULL 
    AND commission.cms_id NOT IN (
        SELECT cms_id
        FROM example_img
        WHERE status = 'failed'
    )
    `, [userId],
    function(error, results) {
        if (error) {
            return res.status(500).json({ status : 'error'})
        }
        return res.status(200).json({ status : 'ok', results})
    })
};

// exports.galloryAdd = (req, res) => {
//     const userId = req.user.userId;
//     const {ex_img_id, artworkDesc, artworkTopic} = req.body;

//     if (ex_img_id === 'undefined') {
//         function insertArtwork(artworkDesc, userId){
//             return new Promise((resolve, reject) => {
//                 dbConn.query(`
//                 INSERT INTO artwork SET artw_desc=?, usr_id=?  
//                 `,[artworkDesc, userId], (error, results) => {
//                     if (error) {
//                         reject(error);
//                     } else {
//                         resolve(results.insertId);
//                     }
//                 })
//             })
//         }

//         function insertArtw_has_topic(artworkTopic, artw2_id, userId){
//             const topics = artworkTopic.split(','); // แยกค่า artworkTopic เป็นรายการ
//             const records = topics.map((topic) => ({
//                 artworkTopic: topic,
//                 userId,
//                 artw: artw2_id,
//             }));
        
//             // ทำการบันทึกลงในฐานข้อมูล โดยวนลูปเพื่อบันทึกแต่ละรายการ
//             records.forEach((record) => {
//                 dbConn.query(
//                     "INSERT INTO artwork_has_topic (tp_id, usr_id, artw2_id) VALUES (?, ?, ?)",
//                     [record.artworkTopic, record.userId, record.artw],
//                     (error, result) => {
//                         if (error) {
//                             console.error('Error inserting record:', error);
//                         } else {
//                             console.log('insertArtw_has_topic success:', result.insertId);
//                         }
//                     }
//                 );
//             });
//         }

//         function insertExample_img(image_name, image_path, artw2_id){
//             return new Promise((resolve, reject) => {
//                 dbConn.query(`
//                 INSERT INTO example_img SET ex_img_name=?, ex_img_path=?, usr_id=?, artw2_id=?
//                 `,[image_name, image_path, userId, artw2_id], (error, resul) => {
//                     if (error) {
//                         console.error('Error inserting record:', error);
//                         reject(error);
//                     } else {
//                         console.log('insertExample_img success:', resul.insertId);
//                         resolve(resul.insertId);
//                     }
//                 })
//             })
//         }

//         const file = req.files.image_file;
//         if (!file || file.length === 0) {
//             return res.status(400).json({ error: "No files uploaded" });
//         }
//         var filename_random = __dirname.split("controllers")[0] + "/public/images_artwork/" + randomstring.generate(10) + ".jpg";
//         if (fs.existsSync(filename_random)) {
//             filename_random = __dirname.split("controllers")[0] + "/public/images_artwork/" + randomstring.generate(15) + ".jpg";
//             file.mv(filename_random);
//         } else {
//             file.mv(filename_random);
//         }
//         const image = filename_random.split("/public")[1];
//         const image_path = `${req.protocol}://${req.get("host")}${image}`;
//         const image_name = image_path.split("/images_artwork/")[1];

//         const artworkPromise = insertArtwork(
//             [artworkDesc], userId
//         )
//         artworkPromise.then((artw2_id) => {
//             insertArtw_has_topic(artworkTopic, artw2_id, userId)
//             insertExample_img(image_name, image_path, artw2_id)
//             return res.status(200).json({ status: 'ok'});
//         }).catch((error) => {
//             console.log(error);
//             return res.status(500).json({ status: 'error'});
//         })
//     } else {
//         function insertArtwork(ex_img_id, artworkDesc, userId){
//             return new Promise((resolve, reject) => {
//                 dbConn.query(`
//                 INSERT INTO artwork SET ex_img_id=?, artw_desc=?, usr_id=?  
//                 `,[ex_img_id, artworkDesc, userId], (error, results) => {
//                     if (error) {
//                         reject(error);
//                     } else {
//                         resolve(results.insertId);
//                     }
//                 })
//             })
//         }
//         function insertArtw_has_topic(artworkTopic, artw2_id, userId){
//             const topics = artworkTopic.split(','); // แยกค่า artworkTopic เป็นรายการ
//             const records = topics.map((topic) => ({
//                 artworkTopic: topic,
//                 userId,
//                 artw: artw2_id,
//             }));
        
//             // ทำการบันทึกลงในฐานข้อมูล โดยวนลูปเพื่อบันทึกแต่ละรายการ
//             records.forEach((record) => {
//                 dbConn.query(
//                     "INSERT INTO artwork_has_topic (tp_id, usr_id, artw2_id) VALUES (?, ?, ?)",
//                     [record.artworkTopic, record.userId, record.artw],
//                     (error, result) => {
//                         if (error) {
//                             console.error('Error inserting record:', error);
//                         } else {
//                             console.log('insertArtw_has_topic success:', result.insertId);
//                             return res.status(200).json({ status: 'ok'});
//                         }
//                     }
//                 );
//             });
//         }
//         const artworkPromise = insertArtwork(
//             ex_img_id, artworkDesc, userId
//         )
//         artworkPromise.then((artw2_id) => {
//             insertArtw_has_topic(artworkTopic, artw2_id, userId)
//         })
//     }
// };

exports.galloryAdd = async (req, res) => {
    const userId = req.user.userId;
    const { ex_img_id, artworkDesc, artworkTopic } = req.body;

    try {
        if (ex_img_id === 'undefined') {
            const insertArtwork = (artworkDesc, userId) => {
                return new Promise((resolve, reject) => {
                    dbConn.query(`
                    INSERT INTO artwork SET artw_desc=?, usr_id=?  
                    `, [artworkDesc, userId], (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results.insertId);
                        }
                    });
                });
            };

            const insertArtw_has_topic = (artworkTopic, artw2_id, userId) => {
                const topics = artworkTopic.split(',');
                const records = topics.map((topic) => ({
                    artworkTopic: topic,
                    userId,
                    artw: artw2_id,
                }));

                return Promise.all(records.map((record) => {
                    return new Promise((resolve, reject) => {
                        dbConn.query(
                            "INSERT INTO artwork_has_topic (tp_id, usr_id, artw2_id) VALUES (?, ?, ?)",
                            [record.artworkTopic, record.userId, record.artw],
                            (error, result) => {
                                if (error) {
                                    console.error('Error inserting record:', error);
                                    reject(error);
                                } else {
                                    console.log('insertArtw_has_topic success:', result.insertId);
                                    resolve();
                                }
                            }
                        );
                    });
                }));
            };

            const insertExample_img = (image_name, image_path, artw2_id) => {
                return new Promise((resolve, reject) => {
                    dbConn.query(`
                    INSERT INTO example_img SET ex_img_name=?, ex_img_path=?, usr_id=?, artw2_id=?
                    `, [image_name, image_path, userId, artw2_id], (error, resul) => {
                        if (error) {
                            console.error('Error inserting record:', error);
                            reject(error);
                        } else {
                            console.log('insertExample_img success:', resul.insertId);
                            resolve(resul.insertId);
                        }
                    });
                });
            };

            const file = req.files.image_file;
            if (!file || file.length === 0) {
                return res.status(400).json({ error: "No files uploaded" });
            }
            var filename_random = __dirname.split("controllers")[0] + "/public/images_artwork/" + randomstring.generate(10) + ".jpg";
            if (fs.existsSync(filename_random)) {
                filename_random = __dirname.split("controllers")[0] + "/public/images_artwork/" + randomstring.generate(15) + ".jpg";
                file.mv(filename_random);
            } else {
                file.mv(filename_random);
            }
            const image = filename_random.split("/public")[1];
            const image_path = `${req.protocol}://${req.get("host")}${image}`;
            const image_name = image_path.split("/images_artwork/")[1];

            const artw2_id = await insertArtwork(artworkDesc, userId);
            await insertArtw_has_topic(artworkTopic, artw2_id, userId);
            await insertExample_img(image_name, image_path, artw2_id);

            return res.status(200).json({ status: 'ok' });
        } else {
            const insertArtwork = (ex_img_id, artworkDesc, userId) => {
                return new Promise((resolve, reject) => {
                    dbConn.query(`
                    INSERT INTO artwork SET ex_img_id=?, artw_desc=?, usr_id=?  
                    `, [ex_img_id, artworkDesc, userId], (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results.insertId);
                        }
                    });
                });
            };

            const insertArtw_has_topic = (artworkTopic, artw2_id, userId) => {
                const topics = artworkTopic.split(',');
                const records = topics.map((topic) => ({
                    artworkTopic: topic,
                    userId,
                    artw: artw2_id,
                }));

                return Promise.all(records.map((record) => {
                    return new Promise((resolve, reject) => {
                        dbConn.query(
                            "INSERT INTO artwork_has_topic (tp_id, usr_id, artw2_id) VALUES (?, ?, ?)",
                            [record.artworkTopic, record.userId, record.artw],
                            (error, result) => {
                                if (error) {
                                    console.error('Error inserting record:', error);
                                    reject(error);
                                } else {
                                    console.log('insertArtw_has_topic success:', result.insertId);
                                    resolve();
                                }
                            }
                        );
                    });
                }));
            };

            const artw2_id = await insertArtwork(ex_img_id, artworkDesc, userId);
            await insertArtw_has_topic(artworkTopic, artw2_id, userId);

            return res.status(200).json({ status: 'ok' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 'error' });
    }
};


exports.galloryUpdate = async (req, res) => {
    try {
        const userId = req.user.userId;
        const artw_id = req.params.id;
        const { detail, artworkTopic } = req.body;

        async function addNewTopic(userId, artworkTopic, artw_id) {
            const topics = artworkTopic.split(',');
            const records = topics.map((topic) => ({
                userId,
                artworkTopic: topic,
                artw: artw_id,
            }));

            for (const record of records) {
                await new Promise((resolve, reject) => {
                    dbConn.query(
                        'INSERT INTO artwork_has_topic (usr_id, tp_id, artw2_id) VALUES (?, ?, ?)',
                        [record.userId, record.artworkTopic, record.artw],
                        (error, result) => {
                            if (error) {
                                console.error('Error inserting record:', error);
                                reject(error);
                            } else {
                                resolve();
                            }
                        }
                    );
                });
            }
        }

        await new Promise((resolve, reject) => {
            dbConn.query(
                'DELETE FROM artwork_has_topic WHERE usr_id = ? AND artw2_id = ?',
                [userId, artw_id],
                (errors, delOldTopic_results) => {
                    if (errors) {
                        console.log(errors);
                        reject(errors);
                    } else {
                        resolve();
                    }
                }
            );
        });

        await new Promise((resolve, reject) => {
            dbConn.query(
                'UPDATE artwork SET artw_desc=?, updated_at=? WHERE artw_id=? AND usr_id=?',
                [detail, date, artw_id, userId],
                (error, updateDetail_results) => {
                    if (error) {
                        console.log(error);
                        reject(error);
                    } else {
                        resolve();
                    }
                }
            );
        });

        await addNewTopic(userId, artworkTopic, artw_id);

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: 'error', message: 'An error occurred' });
    }
};

exports.galloryDelete = (req, res) => {
    const artwork_id = req.params.id;
    try {
        dbConn.query(
          "UPDATE artwork SET deleted_at = ? WHERE artw_id = ?",
          [date, artwork_id],
          function (error, results) {
            if (error) {
                console.log('galloryDelete : ',error);
                return res.status(500).json({ status : 'error',})
            }
            return res.status(200).json({ status : 'ok', message: "ลบผลงานวาดสำเร็จ",})
          }
        );
    } catch {
        return res.json({
            status: "catch",
            message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง",
        });
    }
};

exports.gallorylatest = (req, res) => {
    const query = `
    SELECT 
        artwork.artw_id, artwork.artw_desc, artwork.ex_img_id,
        example_img.ex_img_path, example_img.ex_img_name, artwork.created_at
    FROM 
        artwork
    JOIN 
        example_img ON artwork.ex_img_id = example_img.ex_img_id
    WHERE 
        artwork.deleted_at IS NULL 
    UNION
    SELECT
        example_img.artw2_id, artwork.artw_desc, artwork.ex_img_id,
        example_img.ex_img_path, example_img.ex_img_name, example_img.created_at
    FROM
        example_img
    JOIN
        artwork ON example_img.artw2_id = artwork.artw_id
    WHERE
        example_img.cms_id IS NULL AND artwork.deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 15;
    `;
    dbConn.query(query, function (error, results) {
        if (error) {
            console.log(error); // แสดงข้อผิดพลาดใน console เพื่อตรวจสอบ
            return res.json({ status: "error", message: "status error" });
        }
        res.status(200).json({results})
    })
};

exports.galloryDetail = (req, res) => {
    const galleryID = req.params.id;
    const query = `
        SELECT 
            artwork.artw_desc, artwork.created_at,
            example_img.ex_img_path, example_img.ex_img_name, 
            users.urs_name, users.urs_profile_img, users.id,
            artwork_has_topic.tp_id 
        FROM 
            artwork
        JOIN 
            example_img ON artwork.ex_img_id = example_img.ex_img_id
        JOIN 
            users ON artwork.usr_id = users.id
        JOIN
            artwork_has_topic ON artwork.artw_id = artwork_has_topic.artw2_id
        WHERE
            artwork.artw_id=? AND artwork.deleted_at IS NULL

        UNION

        SELECT 
            artwork.artw_desc, artwork.created_at,
            example_img.ex_img_path, example_img.ex_img_name, 
            users.urs_name, users.urs_profile_img, users.id,
            artwork_has_topic.tp_id 
        FROM 
            example_img
        JOIN 
            artwork ON example_img.artw2_id = artwork.artw_id 
        JOIN 
            users ON example_img.usr_id = users.id
        JOIN
            artwork_has_topic ON example_img.artw2_id = artwork_has_topic.artw2_id
        WHERE
            artwork.artw_id=? AND artwork.deleted_at IS NULL
    `;

    dbConn.query(query, [galleryID, galleryID], function (error, results) {
        if (error) {
            console.log(error); 
            return res.json({ status: "error", message: "status error" });
        }
        // return res.status(200).json({results})

        const gallerryData = results[0];
        if (!gallerryData) {
            return res.status(404).json({ status: "error", message: "Gallery not found" });
        }
        const response = {
            gallery : {
                artw_desc : gallerryData.artw_desc,
                created_at : gallerryData.created_at,
                ex_img_path : gallerryData.ex_img_path,
                ex_img_name : gallerryData.ex_img_name,
                urs_name : gallerryData.urs_name,
                urs_profile_img : gallerryData.urs_profile_img,
                id : gallerryData.id
            }
        }
        // สร้าง array ของ tp_id
        const alltpId = results.map(item => item.tp_id);
        dbConn.query(`
            SELECT * FROM topic WHERE tp_id IN (${alltpId.join(',')})
        `,function(err, result){
            if(err){
                console.log('error');
            }
            response['topic'] = result;
            return res.status(200).json({ artworkData: response });
        })
    });
};

exports.galloryIfollow = (req, res) => {
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
                const query = `
                    SELECT 
                        artwork.artw_id, artwork.artw_desc, artwork.ex_img_id,
                        example_img.ex_img_path, example_img.ex_img_name, artwork.created_at
                    FROM 
                        artwork
                    JOIN 
                        example_img ON artwork.ex_img_id = example_img.ex_img_id
                
                    WHERE 
                        artwork.deleted_at IS NULL AND artwork.usr_id IN (?)
                    UNION
                    SELECT
                        example_img.artw2_id, artwork.artw_desc, artwork.ex_img_id,
                        example_img.ex_img_path, example_img.ex_img_name, example_img.created_at
                    FROM
                        example_img
                    JOIN
                        artwork ON example_img.artw2_id = artwork.artw_id
                    WHERE
                        example_img.cms_id IS NULL AND example_img.usr_id IN (?) AND artwork.deleted_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT 15;
                `
                dbConn.query(query, [myFollowings, myFollowings] , (error, results) => {
                    if (error) {
                        console.log(error);
                        return res.status(500).json({ status: "error", message: "Database error" });
                    }
                    // console.log(results);
                    return res.status(200).json({ status: "ok", results });
                })
            }
        );
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.galloryAll = (req, res) => {
    let sortBy = req.query.sortBy || 'ล่าสุด';
    let filterBy = req.query.filterBy || 'all';
    let topic = req.query.topic;
    let sqlQuery = ``;
    if (topic == 'เลือกทั้งหมด') {
        sqlQuery = `
        SELECT 
            artwork.artw_id, artwork.artw_desc, artwork.ex_img_id,
            example_img.ex_img_path, example_img.ex_img_name, artwork.created_at
        FROM 
            artwork
        JOIN 
            example_img ON artwork.ex_img_id = example_img.ex_img_id
        WHERE 
            artwork.deleted_at IS NULL 
        UNION
        SELECT
            example_img.artw2_id, artwork.artw_desc, artwork.ex_img_id,
            example_img.ex_img_path, example_img.ex_img_name, example_img.created_at
        FROM
            example_img
        JOIN
            artwork ON example_img.artw2_id = artwork.artw_id
        WHERE
            example_img.cms_id IS NULL AND artwork.deleted_at IS NULL
        ORDER BY created_at ${sortBy === 'เก่าสุด' ? 'ASC' : 'DESC'}
    `;
    } else {
        sqlQuery = `
        SELECT 
            artwork.artw_id, artwork.artw_desc, artwork.ex_img_id,
            example_img.ex_img_path, example_img.ex_img_name, artwork.created_at,
            artwork_has_topic.tp_id
        FROM 
            artwork
        JOIN 
            example_img ON artwork.ex_img_id = example_img.ex_img_id
        JOIN 
            artwork_has_topic ON artwork.artw_id = artwork_has_topic.artw2_id
        WHERE 
            artwork.deleted_at IS NULL AND artwork_has_topic.tp_id = ${topic}
        UNION
        SELECT
            example_img.artw2_id, artwork.artw_desc, artwork.ex_img_id,
            example_img.ex_img_path, example_img.ex_img_name, example_img.created_at,
            artwork_has_topic.tp_id
        FROM
            example_img
        JOIN
            artwork ON example_img.artw2_id = artwork.artw_id
        JOIN
            artwork_has_topic ON example_img.artw2_id = artwork_has_topic.artw_id
        WHERE
            example_img.cms_id IS NULL AND artwork.deleted_at IS NULL AND artwork_has_topic.tp_id = ${topic}
        ORDER BY created_at ${sortBy === 'เก่าสุด' ? 'ASC' : 'DESC'}
        `;
    }
    dbConn.query(sqlQuery, (error, results) => {
        if (error) {
          console.log(error);
          return res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
        return res.status(200).json({ results, message: 'Success' });
    });
};

exports.galleryIFollowArtist = (req, res) => {
    let sortBy = req.query.sortBy || 'ล่าสุด';
    let IFollowingIDs = req.query.IFollowingIDs || '';
    let topic = req.query.topic;
    
    if (IFollowingIDs==''){
        console.log('ไม่มีนักวาดที่ติดตามในหน้า artist');
        return res.status(200).json({ message: 'ไม่มีนักวาดที่ติดตาม' });
    } else {
        let sqlQuery = ``;
        if (topic == 'เลือกทั้งหมด') {
            sqlQuery = `
            SELECT 
                artwork.artw_id, artwork.artw_desc, artwork.ex_img_id,
                example_img.ex_img_path, example_img.ex_img_name, artwork.created_at,
                users.id
            FROM 
                artwork
            JOIN 
                example_img ON artwork.ex_img_id = example_img.ex_img_id
            JOIN 
                users ON artwork.usr_id = users.id
            WHERE 
                artwork.deleted_at IS NULL AND users.id IN (${IFollowingIDs})
            UNION
            SELECT
                example_img.artw2_id, artwork.artw_desc, artwork.ex_img_id,
                example_img.ex_img_path, example_img.ex_img_name, example_img.created_at,
                users.id
            FROM
                example_img
            JOIN
                artwork ON example_img.artw2_id = artwork.artw_id
            JOIN 
                users ON example_img.usr_id = users.id
            WHERE
                example_img.cms_id IS NULL AND artwork.deleted_at IS NULL AND users.id IN (${IFollowingIDs})
            ORDER BY created_at ${sortBy === 'เก่าสุด' ? 'ASC' : 'DESC'}
            `;
        } else {
            sqlQuery = `
            SELECT 
                artwork.artw_id, artwork.artw_desc, artwork.ex_img_id,
                example_img.ex_img_path, example_img.ex_img_name, artwork.created_at,
                users.id
            FROM 
                artwork
            JOIN 
                example_img ON artwork.ex_img_id = example_img.ex_img_id
            JOIN 
                users ON artwork.usr_id = users.id
            JOIN
                artwork_has_topic ON artwork.artw_id = artwork_has_topic.artw2_id
            WHERE 
                artwork.deleted_at IS NULL AND users.id IN (${IFollowingIDs}) AND artwork_has_topic.tp_id = ${topic}
            UNION
            SELECT
                example_img.artw2_id, artwork.artw_desc, artwork.ex_img_id,
                example_img.ex_img_path, example_img.ex_img_name, example_img.created_at,
                users.id
            FROM
                example_img
            JOIN
                artwork ON example_img.artw2_id = artwork.artw_id
            JOIN 
                users ON example_img.usr_id = users.id
            JOIN
                artwork_has_topic ON example_img.artw2_id = artwork_has_topic.artw_id
            WHERE
                example_img.cms_id IS NULL AND artwork.deleted_at IS NULL AND users.id IN (${IFollowingIDs}) AND artwork_has_topic.tp_id = ${topic}
            ORDER BY created_at ${sortBy === 'เก่าสุด' ? 'ASC' : 'DESC'}
            `;
        }
        
        dbConn.query(sqlQuery, (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Internal Server Error', error: error.message });
            }
            // console.log(results);
            return res.status(200).json({ status:"ok", results, message: 'Success' });
        });
    }
};


