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

exports.ArtistIndex = (req, res) => {
    const { iFollowing } = req.body;
    if (iFollowing=="") {
        console.log('ไม่มีนักวาดที่ติดตามในหน้าแรก');
    } else {
        const followingIDs = iFollowing.split(',').map(id => parseInt(id.trim(), 10));

        const sqlQuery = `
            SELECT id, urs_name, urs_profile_img, created_at 
            FROM users 
            WHERE id IN (${followingIDs}) AND urs_type = 1 AND deleted_at IS NULL 
            ORDER BY created_at
        `;
        dbConn.query(sqlQuery, (error, results) => {
            if (error) {
              console.log(error);
              return res.status(500).json({ message: 'Internal Server Error' });
            }
            // console.log(results);
            return res.status(200).json({ results, message: 'Success' });
        });
    }
}

exports.allArtist = (req, res) => {
    let sortBy = req.query.sortBy || 'ล่าสุด';
    let filterBy = req.query.filterBy || 'all';
    // console.log(sortBy);
    // console.log(filterBy);
    const sqlQuery = `
        SELECT id, urs_name, urs_profile_img, created_at 
        FROM users 
        WHERE urs_type = 1 AND deleted_at IS NULL 
        ORDER BY created_at ${sortBy === 'เก่าสุด' ? 'ASC' : 'DESC'}
    `;

    dbConn.query(sqlQuery, [sortBy], (error, results) => {
        if (error) {
          console.log('allArtist : ', error);
          return res.status(500).json({ message: 'Internal Server Error' });
        }
        return res.status(200).json({ results, message: 'Success' });
    });
}

exports.ArtistIFollow = (req, res) => {
    let sortBy = req.query.sortBy || 'ล่าสุด';
    let IFollowingIDs = req.query.IFollowingIDs || '';
    // const { IFollowingIDs } = req.body;
    console.log(sortBy);
    console.log(IFollowingIDs);
    // const followingIDs = IFollowingIDs.split(',').map(id => parseInt(id.trim(), 10));
    // console.log(followingIDs);

    if (IFollowingIDs==''){
        console.log('ไม่มีนักวาดที่ติดตามในหน้า artist');
        return res.status(200).json({ message: 'ไม่มีนักวาดที่ติดตาม' });
    } else {
        const sqlQuery = `
            SELECT id, urs_name, urs_profile_img, created_at 
            FROM users 
            WHERE id IN (${IFollowingIDs}) AND urs_type = 1 AND deleted_at IS NULL 
            ORDER BY created_at ${sortBy === 'เก่าสุด' ? 'ASC' : 'DESC'}
        `;
        dbConn.query(sqlQuery, (error, results) => {
            if (error) {
                console.log('ArtistIFollow : ', error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            // console.log(results);
            return res.status(200).json({ status:"ok", results, message: 'Success' });
        });
    }

    
}

exports.getTopic = (req, res) => {
    dbConn.query(
        `SELECT tp_id, tp_name FROM topic`, function(error, results) {
            if (error) {
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            return res.status(200).json({ topics: results });
        }
    )
}
