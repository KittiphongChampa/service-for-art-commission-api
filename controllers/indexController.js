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
    if (iFollowing == "") {
        return res.status(200).json({ results: 'คุณไม่มีนักวาดที่ติดตาม' });
    } else {
        const followingIDs = iFollowing.split(',').map(id => parseInt(id.trim(), 10));

        const sqlQuery = `
        SELECT 
            u.id,
            u.urs_name,
            u.urs_profile_img,
            u.urs_all_review,
            u.created_at,
            COALESCE(total_reviews, 0) AS total_reviews
        FROM users u
        LEFT JOIN (
            SELECT artist_id,
                COUNT(rw_id) AS total_reviews
            FROM cms_order
            WHERE artist_id IN (${followingIDs}) AND rw_id IS NOT NULL
            GROUP BY artist_id
        ) AS order_counts ON u.id = order_counts.artist_id
        WHERE u.id IN (${followingIDs}) AND u.urs_type = 1 AND u.deleted_at IS NULL 
        ORDER BY u.created_at
        
        `;
        
        dbConn.query(sqlQuery, (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            console.log(results);
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
        SELECT 
            u.id,
            u.urs_name,
            u.urs_profile_img,
            u.urs_all_review,
            u.created_at,
            COALESCE(total_reviews, 0) AS total_reviews
        FROM users u
        LEFT JOIN (
            SELECT artist_id,
                COUNT(rw_id) AS total_reviews
            FROM cms_order
            WHERE rw_id IS NOT NULL
            GROUP BY artist_id
        ) AS order_counts ON u.id = order_counts.artist_id
        WHERE u.urs_type = 1 AND u.deleted_at IS NULL 
        ORDER BY u.created_at ${sortBy === 'เก่าสุด' ? 'ASC' : 'DESC'}
    `;

    dbConn.query(sqlQuery, [sortBy], (error, results) => {
        if (error) {
            // console.log('allArtist : ', error);
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

    if (IFollowingIDs == '') {
        console.log('ไม่มีนักวาดที่ติดตามในหน้า artist');
        return res.status(200).json({ message: 'ไม่มีนักวาดที่ติดตาม' });
    } else {
        const sqlQuery = `
            SELECT
                u.id,
                u.urs_name,
                u.urs_profile_img,
                u.urs_all_review,
                u.created_at,
                COALESCE(total_reviews, 0) AS total_reviews 
            FROM users u
            LEFT JOIN (
                SELECT artist_id,
                    COUNT(rw_id) AS total_reviews
                FROM cms_order
                WHERE artist_id IN (${IFollowingIDs}) AND rw_id IS NOT NULL
                GROUP BY artist_id
            ) AS order_counts ON u.id = order_counts.artist_id
            WHERE id IN (${IFollowingIDs}) AND u.urs_type = 1 AND u.deleted_at IS NULL 
            ORDER BY u.created_at ${sortBy === 'เก่าสุด' ? 'ASC' : 'DESC'}
        `;
        dbConn.query(sqlQuery, (error, results) => {
            if (error) {
                console.log('ArtistIFollow : ', error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
            // console.log(results);
            return res.status(200).json({ status: "ok", results, message: 'Success' });
        });
    }


}

exports.getTopic = (req, res) => {
    dbConn.query(
        `SELECT tp_id, tp_name FROM topic`, function (error, results) {
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
    `, function (error, results) {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        return res.status(200).json({ status: "ok", results })
    })
}

exports.search = (req, res) => {
    const search_query = req.query.search;
    // หาคน
    const query = `
        SELECT 
            users.id, users.urs_email, users.urs_name, users.urs_profile_img, users.urs_all_review, COALESCE(total_reviews, 0) AS total_reviews
        FROM users
        LEFT JOIN (
            SELECT artist_id,
                COUNT(rw_id) AS total_reviews
            FROM cms_order
            WHERE rw_id IS NOT NULL
            GROUP BY artist_id
        ) AS order_counts ON users.id = order_counts.artist_id
        WHERE 
            users.deleted_at IS NULL AND users.urs_name LIKE ? OR users.urs_email LIKE ?
    `
    dbConn.query(query, [`%${search_query}%`, `%${search_query}%`], function (error, users) {
        if (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        // หา cms
        const cms_query = `
        SELECT 
            commission.cms_id, 
            commission.cms_name, 
            commission.cms_desc, 
            commission.cms_status,
            IFNULL(commission.cms_all_review, 0) AS cms_all_review,
            users.id, 
            users.urs_name,
            example_img.ex_img_path, 
            example_img.status,
            package_in_cms.pkg_id, 
            package_in_cms.pkg_min_price,
            COUNT(cms_order.rw_id) AS total_reviews
        FROM 
            commission
        JOIN 
            example_img ON commission.cms_id = example_img.cms_id
        JOIN 
            package_in_cms ON commission.cms_id = package_in_cms.cms_id
        JOIN 
            users ON commission.usr_id = users.id
        LEFT JOIN
            cms_order ON commission.cms_id = cms_order.cms_id 
        WHERE 
            (commission.cms_status != "similar" OR commission.cms_status IS NULL)
            AND commission.deleted_at IS NULL
            AND (commission.cms_name LIKE ? OR commission.cms_desc LIKE ? )
        GROUP BY 
            commission.cms_id, 
            commission.cms_name, 
            commission.cms_desc, 
            commission.cms_all_review,
            commission.cms_status,
            example_img.ex_img_path, 
            example_img.status,
            users.id, 
            users.urs_name,
            package_in_cms.pkg_id, 
            package_in_cms.pkg_min_price
        ORDER BY commission.created_at DESC 
        `
        dbConn.query(cms_query, [`%${search_query}%`, `%${search_query}%`], function (error, cms) {
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
            dbConn.query(artwork_query, [`%${search_query}%`], function (error, artwork) {
                if (error) {
                    return res.status(500).json({ message: 'Internal Server Error' });
                }
                console.log(artwork);
                return res.status(200).json({ status: "ok", users, cms_uniqueResults, artwork })
            })
        })
    })

}

exports.topArtist = (req, res) => {
    const sql = `
        SELECT
            u.id,
            u.urs_name,
            u.urs_profile_img,
            u.urs_all_review,
            u.created_at,
            COALESCE(total_reviews, 0) AS total_reviews,
            COALESCE(total_orders, 0) AS total_orders
        FROM users u
        LEFT JOIN (
            SELECT 
                artist_id,
                COUNT(rw_id) AS total_reviews
            FROM cms_order
            WHERE rw_id IS NOT NULL
            GROUP BY artist_id
        ) AS order_counts ON u.id = order_counts.artist_id
        LEFT JOIN (
            SELECT
                artist_id,
                COUNT(od_id) AS total_orders
            FROM cms_order
            WHERE ordered_at >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK) -- กรองเฉพาะออเดอร์ที่เกิดขึ้นในช่วง 1 อาทิตย์
            GROUP BY artist_id
        ) AS total_order ON u.id = total_order.artist_id
        WHERE u.urs_type = 1 AND u.deleted_at IS NULL AND total_orders > 0
        ORDER BY total_orders DESC
        LIMIT 10;
    `
    dbConn.query(sql, function(error, results) {
        if (error) {
            console.log(error);
            res.status(500).json({messages: error})
        }
        console.log(results);
        return res.status(200).json({status: "ok", results})
    })
}