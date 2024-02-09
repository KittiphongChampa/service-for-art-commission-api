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
exports.allReport = (req, res) => {
    const sql = `
        SELECT 
            send_report.sendrp_id, send_report.sendrp_header, send_report.sendrp_detail, send_report.created_at, send_report.usr_reporter_id, send_report.artw_id, send_report.cms_id,
            example_img.ex_img_path,
            users.urs_name
        FROM send_report
        JOIN example_img ON send_report.artw_id = example_img.artw2_id OR send_report.cms_id = example_img.cms_id
        JOIN users ON send_report.usr_reporter_id = users.id
        WHERE example_img.deleted_at IS NULL
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
            const key = item.artw_id || item.cms_id;
            if (!uniqueSet.has(key)) {
                uniqueSet.add(key);
                return true;
            }
            return false;
        });

        // แปลงเวลา
        const formattedResults = uniqueResults.map(item => ({
            ...item,
            created_at: new Date(item.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
        }));
        console.log(formattedResults);

        // console.log(uniqueResults);
        return res.status(200).json({status:'ok', results: formattedResults})
    })
}

exports.allApproveReport = (req, res) => {
    dbConn.query('SELECT * FROM send_report WHERE deleted_at IS NULL AND updated_at IS NOT NULL',
    function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        return res.status(200).json({status:'ok', results})
    })
}

exports.allDeletedReport = (req, res) => {
    dbConn.query('SELECT * FROM send_report WHERE deleted_at IS NOT NULL',
    function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        return res.status(200).json({status:'ok', results})
    })
}

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