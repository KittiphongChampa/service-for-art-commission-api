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

exports.getYearDataArtist = (req, res) => {
    const userID = req.user.userId;
    let sql = `
        SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS date,
        COUNT(*) AS follower
        FROM follow
        WHERE follower_id = ?
    `;

    if (req.query.startDate && req.query.endDate) {
        sql += `
          AND created_at >= ? 
          AND created_at <= ?
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY date ASC
        `;
    
        let startDate = `${req.query.startDate} 00:00:00`;
        let endDate = `${req.query.endDate} 23:59:59`;
        // console.log(startDate);
        // console.log(endDate);
    
        dbConn.query(sql, [userID, startDate, endDate], (error, results) => {
          if (error) {
            console.log(error);
            return res.status(500).json({ error: 'Error occurred' });
          }
        //   console.log(results);
          return res.status(200).json({ results, message: 'Success' });
        });
    } else {
        sql += `
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY date ASC
        `;
    
        dbConn.query(sql, [userID], (error, results) => {
          if (error) {
            console.log(error);
            return res.status(500).json({ error: 'Error occurred' });
          }
        //   console.log(results);
          return res.status(200).json({ results, message: 'Success' });
        });
    }
};

exports.getOutOfYearDataArtist = (req, res) => {
    const userID = req.user.userId;
    let sql = `
        SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS date,
        COUNT(*) AS follower
        FROM follow
        WHERE follower_id = ?
    `;
    if (req.query.startDate && req.query.endDate) {
        sql += `
          AND created_at >= ? 
          AND created_at <= ?
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY date ASC
        `;
    
        let startDate = `${req.query.startDate} 00:00:00`;
        let endDate = `${req.query.endDate} 23:59:59`;
    
        dbConn.query(sql, [userID, startDate, endDate], (error, results) => {
          if (error) {
            console.log(error);
            return res.status(500).json({ error: 'Error occurred' });
          }
        //   console.log(results);
          return res.status(200).json({ results, message: 'Success' });
        });
    } else {
        sql += `
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY date ASC
        `;
    
        dbConn.query(sql, [userID], (error, results) => {
          if (error) {
            console.log(error);
            return res.status(500).json({ error: 'Error occurred' });
          }
        //   console.log(results);
          return res.status(200).json({ results, message: 'Success' });
        });
    }
};

exports.getCountTopic = (req, res) => {
  dbConn.query(`
  SELECT * FROM topic 
  `,function(error, results){
    if (error) {
      return res.status(500).json({ status : 'error',})
    }
    return res.status(200).json({ status : 'ok', results})
  })
};