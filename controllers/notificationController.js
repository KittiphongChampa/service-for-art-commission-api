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
exports.addNotiAdmin = (req, res) => {
    const {reporter, reported, msg, reportId} = req.body;
    dbConn.query(`INSERT INTO notification SET noti_text=?, sender_id=?, receiver_id=?, rp_id=?`,[msg, reporter, reported, reportId], function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        return res.status(200).json({status:'ok'})
    })
}

exports.getAdminNoti = (req, res) => {
    dbConn.query(`
        SELECT 
            notification.noti_id, notification.noti_text, notification.noti_read, notification.created_at, notification.sender_id,  notification.rp_id, 
            users.urs_name, users.urs_profile_img 
        FROM 
            notification 
        JOIN
            users ON notification.sender_id = users.id
        WHERE 
            receiver_id IN (?) ORDER BY notification.created_at DESC
        `
        ,[0], function(error, results){
        if (error) {
            console.log(error);
            return res.status(500).json({error})
        }
        const dataNoti = results.map(result => {
            const formattedDate = new Date(result.created_at).toLocaleString().replace('T', ' ').slice(0, 19);
            return {
                notiId: result.noti_id,
                msg: result.noti_text,
                reportId: result.rp_id,
                sender_id: result.sender_id,
                sender_name: result.urs_name,
                sender_img: result.urs_profile_img,
                noti_read: result.noti_read,
                created_at: formattedDate,
            };
        });
        // console.log(dataNoti);
        return res.status(200).json({dataNoti})
    })
}

exports.AdminDeleteWorkNoti = (req, res) => {
    const {sender_id, receiver_id, msg, work_id} = req.body;
    dbConn.query(`
        INSERT INTO notification SET sender_id=?, receiver_id=?, noti_text=?, work_id=?
    `, [sender_id, receiver_id, msg, work_id], function(error, results){
        if ( error ) {
            console.log(error);
        }
        return res.status(200).json({status : 'ok'})
    })
}

exports.AdminKeepWorkNoti = (req, res) => {
    const {sender_id, receiver_id, msg, work_id} = req.body;
    dbConn.query(`
        INSERT INTO notification SET sender_id=?, receiver_id=?, noti_text=?, work_id=?
    `, [sender_id, receiver_id, msg, work_id], function(error, results){
        if ( error ) {
            console.log(error);
        }
        return res.status(200).json({status : 'ok'})
    })
}

// user
exports.getNoti = (req, res, next) => {
    try{
        const myId = req.user.userId;
        dbConn.query(`
            SELECT 
                notification.noti_id, notification.noti_text, notification.noti_read, notification.created_at, notification.sender_id, notification.receiver_id, notification.od_id, notification.work_id,
                users.urs_name, users.urs_profile_img
            FROM 
                notification 
            LEFT JOIN users 
                ON notification.sender_id = users.id WHERE receiver_id IN (?) ORDER BY notification.created_at DESC
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
                    work_id: result.work_id,
                    created_at: formattedDate,
                };
            });
    
            return res.status(200).json({dataNoti})
        })
    }catch{
        console.log(error);
    }
    
}


// นักวาดรับ
exports.notiAdd = (req, res) => {
    const {sender_id, receiver_id, order_id} = req.body;
    let message = req.body.msg;
    if (message == "ภาพร่าง") {
        message = "อนุมัติภาพร่างแล้ว โปรดตั้งราคางาน"
    } else if (message == "แนบสลิป") {
        message = "ได้ชำระเงินครั้งที่ 1 แล้ว"
    } else if (message == "ภาพไฟนัล") {
        message = "แจ้งเตือนการชำระเงินครั้งที่ 2"
    } else if (message == "แนบสลิป2") {
        message = "ได้ชำระเงินครั้งที่ 2 แล้ว"
    } else if (message.includes("ภาพ") && message != "ภาพร่าง" && message != "ภาพไฟนัล") {
        message = "อนุมัติภาพความคืบหน้าแล้ว"
    } 
    
    dbConn.query(`
        INSERT INTO notification SET sender_id=?, receiver_id=?, noti_text=?, od_id=?
    `, [sender_id, receiver_id, message, order_id], function(error, results){
        if ( error ) {
            console.log(error);
            console.log("notiOrderAdd error");
        }
        return res.status(200).json({status : 'ok'})
    })
}

// ผู้จ้างรับ
exports.notiProgress = (req, res) => {
    const {sender_id, receiver_id, order_id} = req.body;
    let message = req.body.msg;
    if (message == "ภาพร่าง") {
        message = "ได้ส่งภาพร่าง"
    } else if (message == "ระบุราคา") {
        message = "แจ้งเตือนการชำระเงินครั้งที่ 1"
    } else if (message == "ภาพไฟนัล") {
        message = "ได้ส่งภาพไฟนัล"
    } else if (message == "ตรวจสอบใบเสร็จ") {
        message = "ตรวจสอบใบเสร็จแล้ว"
    } else if (message == "ตรวจสอบใบเสร็จ2") {
        message = "ให้คะแนนและความคิดเห็น"
    } else if (message.includes("ภาพ") && message != "ภาพร่าง" && message != "ภาพไฟนัล") {
        message = "ส่งความคืบหน้างาน"
    } 

    dbConn.query(`
        INSERT INTO notification SET sender_id=?, receiver_id=?, noti_text=?, od_id=?
    `, [sender_id, receiver_id, message, order_id], function(error, results){
        if ( error ) {
            console.log(error);
            console.log("notiOrderAdd error");
        }
        return res.status(200).json({status : 'ok'})
    })
}

// แจ้งแก้ไข ของแชทออเดอร์
exports.notiProgressEdit = (req, res) => {
    const {sender_id, receiver_id, order_id} = req.body;
    let message = req.body.msg;
    if (message == "ภาพร่าง") {
        message = "แจ้งแก้ไขภาพร่าง"
    } else if (message == "ตรวจสอบใบเสร็จ") {
        message = "แจ้งแก้ไขใบเสร็จ"
    } else if (message.includes("ภาพ") && message != "ภาพร่าง" && message != "ภาพไฟนัล") {
        message = "แจ้งแก้ไขภาพ"
    } else if (message == "ภาพไฟนัล") {
        message = "แจ้งแก้ไขภาพไฟนัล"
    } else if (message == "ตรวจสอบใบเสร็จ2") {
        message = "แจ้งแก้ไขใบเสร็จ"
    }
    
    dbConn.query(`
        INSERT INTO notification SET sender_id=?, receiver_id=?, noti_text=?, od_id=?
    `, [sender_id, receiver_id, message, order_id], function(error, results){
        if ( error ) {
            console.log(error);
            console.log("notiOrderAdd error");
        }
        return res.status(200).json({status : 'ok'})
    })
}

exports.notiReaded = (req, res) => {
    const {report_keyData, order_keyData, work_keyData, action} = req.query;
    console.log(req.query);

    if (report_keyData  && !order_keyData && !work_keyData) {
        const sql = `
            UPDATE notification SET noti_read=? WHERE rp_id=? AND noti_text=?
        `
        dbConn.query(sql, [1, report_keyData, action], function (error, results){
            if (error) {
                console.log(error);
                return res.status(500).json({error})
            } 
            return res.status(200).json({message: "ok"})
        })
    
    } else if (!report_keyData && order_keyData && !work_keyData) {
        const sql = `
            UPDATE notification SET noti_read=? WHERE od_id=? AND noti_text=?
        `
        dbConn.query(sql, [1, order_keyData, action], function (error, results){
            if (error) {
                console.log(error);
                return res.status(500).json({error})
            } 
            return res.status(200).json({message: "ok"})
        })
    } else if (work_keyData && !order_keyData && !report_keyData) {
        const sql = `
            UPDATE notification SET noti_read=? WHERE work_id=? AND noti_text=?
        `
        dbConn.query(sql, [1, work_keyData, action], function (error, results){
            if (error) {
                console.log(error);
                return res.status(500).json({error})
            } 
            return res.status(200).json({message: "ok"})
        })
    }
}