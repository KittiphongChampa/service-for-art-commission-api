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
        return res.status(200).json({ results: 'คุณไม่มีนักวาดที่ติดตาม' });
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

exports.getFaq = (req, res) => {
    dbConn.query(`
        SELECT * FROM faq WHERE deleted_at IS NULL
    `, function(error, results) {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        return res.status(200).json({status: "ok", results})
    })
}

exports.search = (req, res) => {
    const search_query = req.query.search;
    const query = `
        SELECT 
            users.id, users.urs_email, users.urs_name, users.urs_profile_img
        FROM users
        WHERE 
            users.urs_name LIKE ? OR users.urs_email LIKE ? AND users.deleted_at IS NULL
    `
    dbConn.query(query, [`%${search_query}%`, `%${search_query}%`], function(error, users){
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        // console.log("users : ", users);
        const cms_query = `
        SELECT 
            commission.cms_id, 
            commission.cms_name, 
            commission.cms_desc, 
            example_img.ex_img_path, 
            example_img.status,
            package_in_cms.pkg_id, 
            package_in_cms.pkg_min_price
        FROM 
            commission
        JOIN 
            example_img ON commission.cms_id = example_img.cms_id
        JOIN 
            package_in_cms ON commission.cms_id = package_in_cms.cms_id
        WHERE 
            commission.cms_name LIKE ? OR commission.cms_desc LIKE ? AND
            commission.deleted_at IS NULL 
            AND commission.cms_id NOT IN (
                SELECT cms_id
                FROM example_img
                WHERE status = 'failed'
            )
        ORDER BY commission.created_at DESC 
        `
        dbConn.query(cms_query, [`%${search_query}%`, `%${search_query}%`], function(error, cms) {
            if (error) {
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            const uniqueCmsIds = new Set();
            const cms_uniqueResults = [];
            cms.forEach((row) => {
                const cmsId = row.cms_id;
                if (!uniqueCmsIds.has(cmsId)) {
                    uniqueCmsIds.add(cmsId);
                    cms_uniqueResults.push(row);
                } else {
                    const existingResult = cms_uniqueResults.find((item) => item.cms_id === cmsId);
                    if (row.pkg_min_price < existingResult.pkg_min_price) {
                        Object.assign(existingResult, row);
                    }
                }
            })
            // console.log("cms : ", cms_uniqueResults);


            const artwork_query = `
                SELECT
                    example_img.artw2_id, artwork.artw_desc, artwork.ex_img_id,
                    example_img.ex_img_path, example_img.ex_img_name, example_img.created_at
                FROM
                    example_img
                JOIN
                    artwork ON example_img.artw2_id = artwork.artw_id
                WHERE
                    artwork.artw_desc LIKE ? AND artwork.deleted_at IS NULL
                ORDER BY created_at DESC
            `
            dbConn.query(artwork_query, [`%${search_query}%`], function(error, artwork){
                if (error) {
                    return res.status(500).json({ message: 'Internal Server Error' });
                }
                // console.log(artwrok);
                return res.status(200).json({status: "ok", users, cms_uniqueResults, artwork})
            })
        })
    })

}
