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

// admin
exports.addNotiArtwork = (req, res) => {
    console.log(req.body);
    dbConn.query(`INSERT INTO notification SET `, function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        return res.status(200).json({status:'ok'})
    })
}

exports.getnotimsg = (req, res) => {
    dbConn.query(`SELECT * FROM notification`, function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        console.log('เข้า',results);
        return res.status(200).json({status:'ok', results})
    })
}
// user
exports.getNoti = (req, res, next) => {
    try{
        const myId = req.user.userId;
        dbConn.query(`
            SELECT 
                notification.noti_id, notification.noti_text, notification.noti_read, notification.created_at, notification.sender_id, notification.receiver_id, notification.od_id, 
                users.urs_name, users.urs_profile_img
            FROM 
                notification LEFT JOIN users ON notification.sender_id = users.id WHERE receiver_id IN (?) ORDER BY notification.created_at DESC
        `, [myId], function(error, results){
            if (error) {
                console.log(error);
                return res.status(500).json({error})
            }
            // console.log("results : ",results);
            // ทำการหา ข้อมูลของ sender ทั้งหมดจาก results มีได้หลายคน เอามาคือ ชื่อ รูป ไอดี
            const dataNoti = results.map(result => {
                const formattedDate = new Date(result.created_at).toLocaleString().replace('T', ' ').slice(0, 19);
                return {
                    notiId: result.noti_id,
                    msg: result.noti_text,
                    order_id: result.od_id,
                    sender_id: result.sender_id,
                    sender_name: result.urs_name,
                    sender_img: result.urs_profile_img,
                    noti_read: result.noti_read,
                    created_at: formattedDate,
                };
            });
    
            return res.status(200).json({dataNoti})
        })
    }catch{
        console.log(error);
    }
    
}

exports.notiAdd = (req, res) => {
    const {sender_id, receiver_id, msg, order_id} = req.body;
    dbConn.query(`
        INSERT INTO notification SET sender_id=?, receiver_id=?, noti_text=?, od_id=?
    `, [sender_id, receiver_id, msg, order_id], function(error, results){
        if ( error ) {
            console.log(error);
            console.log("notiOrderAdd error");
        }
        return res.status(200).json({status : 'ok'})
    })
}

exports.notiReaded = (req, res) => {
    const {keyData, action} = req.query
    const sql = `
        UPDATE notification SET noti_read=? WHERE od_id=? AND noti_text=?
    `
    dbConn.query(sql, [1, keyData, action], function (error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        } 
        return res.status(200).json({message: "ok"})
    })
}