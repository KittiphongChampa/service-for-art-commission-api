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


//admin

//report ทั้งหมด
exports.allReport = (req, res) => {
    const sql = `
        SELECT 
            send_report.sendrp_id, send_report.sendrp_header, send_report.sendrp_detail, send_report.created_at, send_report.usr_reporter_id, send_report.artw_id, send_report.cms_id, send_report.status,
            example_img.ex_img_path,
            users.urs_name
        FROM send_report
        JOIN example_img ON send_report.artw_id = example_img.artw2_id OR send_report.cms_id = example_img.cms_id
        JOIN users ON send_report.usr_reporter_id = users.id
        WHERE example_img.deleted_at IS NULL AND send_report.status IS NULL
        ORDER BY send_report.created_at DESC;
    `
    dbConn.query(sql,
    function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }

        // ส่งผลลัพธ์ที่เป็น unique
        const uniqueSet = new Set();
        const uniqueResults = results.filter(item => {
            // const key = item.artw_id || item.cms_id;
            const key = item.sendrp_id
            if (!uniqueSet.has(key)) {
                uniqueSet.add(key);
                return true;
            }
            return false;
        });

        // แปลงเวลา
        const formattedResults = uniqueResults.map(item => {
            let text = '';
            if (item.artw_id !== null && item.cms_id === null) {
                text = 'Artwork';
            } else if (item.artw_id === null && item.cms_id !== null) {
                text = 'Commission';
            }
            return {
                ...item,
                created_at: new Date(item.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
                text: text
            };
        });

        // console.log(formattedResults);

        // console.log(uniqueResults);
        return res.status(200).json({status:'ok', results: formattedResults})
    })
}

//report ข้อมูล
exports.reportDetail = async(req, res) => {
    const reportId = req.params.id
    const sql = `SELECT * FROM send_report WHERE sendrp_id=?`

    dbConn.query(sql, [reportId], function(error, results) {
        if (error) {
            console.log(error);
        }
        // console.log(results);
        const findUserReport = `
            SELECT id, urs_name, urs_profile_img FROM users WHERE id=?
        `
        dbConn.query(findUserReport, [results[0].usr_reporter_id], function(error, reporterData) {
            if (error) {
                console.log(error);
            }
            if (results[0].artw_id !== null && results[0].cms_id === null) {
                const sql_artwork = `
                    SELECT
                        artwork.artw_id ,artwork.artw_desc, artwork.created_at,
                        example_img.ex_img_id, example_img.ex_img_path, 
                        users.id, users.urs_name, users.urs_profile_img 
                    FROM artwork
                    JOIN example_img ON artwork.artw_id = example_img.artw2_id
                    JOIN users ON artwork.usr_id = users.id
                    WHERE artwork.artw_id = ?
                `
                dbConn.query(sql_artwork,[results[0].artw_id], function(error, result){
                    if (error) {
                        console.log(error);
                    }
                    const artworkData = result[0];

                    const response = {
                        work: {
                            id: artworkData.artw_id,
                            desc: artworkData.artw_desc,
                            created_at: artworkData.created_at,
                        },
                        artist: {
                            artistId: artworkData.id,
                            artistName: artworkData.urs_name,
                            artistProfile: artworkData.urs_profile_img
                        },
                    }

                    const uniqueImages= [];
                    const uniqueImagesIds = new Set();
                    
                    result.forEach((item) => {
                        const ex_img_id = item.ex_img_id;
                        if (!uniqueImagesIds.has(ex_img_id)) {
                            uniqueImagesIds.add(ex_img_id);
                            uniqueImages.push(item);
                        }
                    })

                    response.images = uniqueImages.map((item) => ({
                        ex_img_id: item.ex_img_id,
                        ex_img_path: item.ex_img_path,
                    }));

                    console.log("results (ข้อมูลของการ report) : ",results);
                    console.log("response (ข้อมูลของ cms หรือ artwork และ นักวาด) : ",response);
                    console.log("reporterData (ข้อมูลของผู้แจ้ง) : ",reporterData);
                    return res.status(200).json({reportDetail : results, data: response, reporterData});
                })

            } else if (results[0].artw_id === null && results[0].cms_id !== null) {
                const sql_cms = `
                    SELECT 
                        commission.cms_id, commission.cms_name, commission.cms_desc, commission.created_at, commission.usr_id,
                        example_img.ex_img_id , example_img.ex_img_path, 
                        users.id, users.urs_name, users.urs_profile_img
                    FROM commission
                    JOIN example_img ON commission.cms_id = example_img.cms_id
                    JOIN users ON commission.usr_id = users.id
                    WHERE commission.cms_id = ?
                `;
    
                dbConn.query(sql_cms,[results[0].cms_id], function(error, result){
                    if (error) {
                        console.log(error);
                    }
                    const commissionData = result[0];
    
                    const response = {
                        work: {
                          id: commissionData.cms_id,
                          desc: commissionData.cms_desc,
                          name: commissionData.cms_name,
                          created_at: commissionData.created_at,
                        },
                        artist: {
                          artistId: commissionData.usr_id,
                          artistName: commissionData.urs_name,
                          artistProfile: commissionData.urs_profile_img
                        },
                        
                    };
    
                    const uniqueImages= [];
                    const uniqueImagesIds = new Set();
                    
                    result.forEach((item) => {
                        const ex_img_id = item.ex_img_id;
                        if (!uniqueImagesIds.has(ex_img_id)) {
                            uniqueImagesIds.add(ex_img_id);
                            uniqueImages.push(item);
                        }
                    })
    
                    response.images = uniqueImages.map((item) => ({
                        ex_img_id: item.ex_img_id,
                        ex_img_path: item.ex_img_path,
                    }));

                    console.log("results (ข้อมูลของการ report) : ",results);
                    console.log("response (ข้อมูลของ cms หรือ artwork และ นักวาด) : ",response);
                    console.log("reporterData (ข้อมูลของผู้แจ้ง) : ",reporterData);
                    
                    return res.status(200).json({reportDetail : results, data: response, reporterData});
                })
            }
        })
    })
}

//report ทั้งหมดที่ถูกยอมรับ
exports.allApproveReport = (req, res) => {
    const sql = `
        SELECT 
            send_report.sendrp_id, send_report.sendrp_header, send_report.sendrp_detail, send_report.created_at, send_report.usr_reporter_id, send_report.artw_id, send_report.cms_id, send_report.status,
            example_img.ex_img_path,
            users.urs_name
        FROM send_report
        JOIN example_img ON send_report.artw_id = example_img.artw2_id OR send_report.cms_id = example_img.cms_id
        JOIN users ON send_report.usr_reporter_id = users.id
        WHERE example_img.deleted_at IS NULL AND send_report.status=?
        ORDER BY send_report.created_at DESC;
    `
    const status = "approve"
    dbConn.query(sql, [status],
    function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        return res.status(200).json({status:'ok', results})
    })
}

//report ทั้งหมดที่ถูกปฏิเสธ
exports.allDeletedReport = (req, res) => {
    const sql = `
        SELECT 
            send_report.sendrp_id, send_report.sendrp_header, send_report.sendrp_detail, send_report.created_at, send_report.usr_reporter_id, send_report.artw_id, send_report.cms_id, send_report.status,
            example_img.ex_img_path,
            users.urs_name
        FROM send_report
        JOIN example_img ON send_report.artw_id = example_img.artw2_id OR send_report.cms_id = example_img.cms_id
        JOIN users ON send_report.usr_reporter_id = users.id
        WHERE example_img.deleted_at IS NOT NULL AND send_report.status=?
        ORDER BY send_report.created_at DESC;
    `
    const status = "delete"
    dbConn.query(sql, [status],
    function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        return res.status(200).json({status:'ok', results})
    })
}

//post report artwork
exports.reportArtwork = (req, res) => {
    const myId = req.user.userId;
    const artw_id = req.params.id;
    const { rpheader, rpdetail, rplink, rpemail} = req.body;
    if (rplink == undefined) {
        dbConn.query(`SELECT usr_id FROM artwork WHERE artw_id=?`,[artw_id],function(error, results){
            if (error) {
                console.log(error);
                return res.status(500).json({error})
            }
            let usr_id = results[0].usr_id;
            dbConn.query('INSERT INTO send_report SET sendrp_header=?, sendrp_detail=?, sendrp_email=?, usr_reporter_id=?, usr_reported_id=?, artw_id=?',
            [rpheader, rpdetail, rpemail, myId, usr_id, artw_id],
            function(err, result){
                if (err) {
                    console.log(error);
                    return res.status(500).json({error})
                }
                const reportId = result.insertId;
                return res.status(200).json({status:'ok', reportId})
            })
        })
    } else {
        dbConn.query(`SELECT usr_id FROM artwork WHERE artw_id=?`,[artw_id],function(error, results){
            if (error) {
                console.log(error);
                return res.status(500).json({error})
            }
            const usr_id = results[0].usr_id;
            dbConn.query('INSERT INTO send_report SET sendrp_header=?, sendrp_detail=?, sendrp_email=?, sendrp_link=?, usr_reporter_id=?, usr_reported_id=?, artw_id=?',
            [rpheader, rpdetail, rpemail, rplink, myId, usr_id, artw_id],
            function(error, result){
                if (error) {
                    console.log(error);
                    return res.status(500).json({error})
                }
                return res.status(200).json({status:'ok', reportId})
            })
        })
    }
}

//post report commission
exports.reportCommission = (req, res) => {
    const myId = req.user.userId;
    const cms_id = req.params.id;
    const {rpheader, rpdetail, rplink, rpemail} = req.body;
    if (rplink == undefined) {
        dbConn.query(`SELECT usr_id FROM commission WHERE cms_id=?`,[cms_id],function(error, results){
            if (error) {
                console.log(error);
                return res.status(500).json({error})
            }
            let usr_id = results[0].usr_id;
            dbConn.query('INSERT INTO send_report SET sendrp_header=?, sendrp_detail=?, sendrp_email=?, usr_reporter_id=?, usr_reported_id=?, cms_id=?',
            [rpheader, rpdetail, rpemail, myId, usr_id, cms_id],
            function(err, result){
                if (err) {
                    console.log(error);
                    return res.status(500).json({error})
                }
                const reportId = result.insertId;
                return res.status(200).json({status:'ok', reportId})
            })
        })
    } else {
        dbConn.query(`SELECT usr_id FROM commission WHERE cms_id=?`,[cms_id],function(error, results){
            if (error) {
                console.log(error);
                return res.status(500).json({error})
            }
            let usr_id = results[0].usr_id;
            dbConn.query('INSERT INTO send_report SET sendrp_header=?, sendrp_detail=?, sendrp_email=?, sendrp_link=?, usr_reporter_id=?, usr_reported_id=?, cms_id=?',
            [rpheader, rpdetail, rpemail, rplink, myId, usr_id, cms_id],
            function(err, result){
                if (err) {
                    console.log(error);
                    return res.status(500).json({error})
                }
                const reportId = result.insertId;
                return res.status(200).json({status:'ok', reportId})
            })
        })
    }
}

//approve action report
exports.approveReport = (req, res) => {
    const reportId = req.params.id;
    const status = "approve";
    dbConn.query(`
        UPDATE send_report SET status=? WHERE sendrp_id=?
    `,[status, reportId],function(error, result){
        if (error) {
            console.log(error);
        }
        console.log('เข้า');
        return res.status(200).json({status: "ok"})
    })
}

//delete acction report
exports.deleteReport = (req, res) => {
    const adminId = req.user.adminId;
    const reportId = req.params.id;
    const reason = req.body.reason;
    const status = "deleted";
    const sql = `
        SELECT * FROM send_report WHERE sendrp_id=?
    `
    dbConn.query(sql, [reportId], function(error, results) {
        if (error) {
            console.log(error);
        }
        dbConn.query(`
            UPDATE send_report SET status=? WHERE sendrp_id=?
        `,[status, reportId],function(error, result){
            if (error) {
                console.log(error);
            }
            if (results[0].artw_id !== null && results[0].cms_id === null) {
                const artworkSQL = `
                    UPDATE artwork SET deleted_at=?, deleted_by=?, delete_reason=? WHERE artw_id=?
                `
                dbConn.query(artworkSQL,[date, adminId, reason, results[0].artw_id], function(error, resul) {
                    if (error) {
                        console.log(error);
                    }
                    console.log('artwork ok');
                    return res.status(200).json({status: "ok"})
                })
            } else if (results[0].artw_id === null && results[0].cms_id !== null) {
                const cmsSQL = `
                    UPDATE commission SET deleted_at=?, deleted_by=?, delete_reason=? WHERE cms_id=?
                `
                dbConn.query(cmsSQL,[date, adminId, reason, results[0].cms_id], function(error, resul) {
                    if (error) {
                        console.log(error);
                    }
                    console.log('cms ok');
                    return res.status(200).json({status: "ok"})
                })
            }
        })
    })
}

exports.reportRelateto = (req, res) => {

    const sql = `
    SELECT * FROM send_report WHERE 
    `
}