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


exports.sendReport = (req, res) => {
    const userId = req.user.userId;
    const {sendrp_detail, sendrp_email, usr_reporter_id, usr_reported_id, cms_id, artw_id } = req.body;
    dbConn.query('INSERT INTO send_report SET sendrp_detail=?, sendrp_email=?, usr_reporter_id=?, usr_reported_id=?, cms_id=?, artw_id=?'),
    [sendrp_detail, sendrp_email, usr_reporter_id, usr_reported_id, cms_id, artw_id],
    function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        return res.status(200).json({status:'ok'})
    }
}

//admin
exports.allReport = (req, res) => {
    dbConn.query('SELECT * FROM send_report WHERE deleted_at IS NULL AND updated_at IS NULL',
    function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        return res.status(200).json({status:'ok', results})
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