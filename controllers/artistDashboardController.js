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
  let startDate = `${req.query.start} 00:00:00`;
  let endDate = `${req.query.end} 23:59:59`;
  let sql = `
      SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS date,
          COUNT(*) AS follower
      FROM 
          follow
      WHERE 
          following_id = ? AND created_at >= ? AND created_at <= ?
      GROUP BY 
        date
  `;
  dbConn.query(sql, [userID, startDate, endDate], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error occurred' });
    }
    // console.log(results);
    return res.status(200).json({ results, message: 'Success' });
  });
};

exports.getOutOfYearDataArtist = (req, res) => {
    const userID = req.user.userId;
    let startDate = `${req.query.startDate} 00:00:00`;
    let endDate = `${req.query.endDate} 23:59:59`;
    let sql = `
        SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
        COUNT(*) AS follower
        FROM follow
        WHERE following_id = ? AND created_at >= ? AND created_at <= ?
        GROUP BY 
            DATE_FORMAT(created_at, '%Y-%m-%d');
    `;
    dbConn.query(sql, [userID, startDate, endDate], (error, results) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error occurred' });
      }
      // console.log(results);
      return res.status(200).json({ results, message: 'Success' });
    });

    // if (req.query.startDate && req.query.endDate) {
    //     sql += `
    //       AND created_at >= ? 
    //       AND created_at <= ?
    //       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    //       ORDER BY date ASC
    //     `;
    
    //     let startDate = `${req.query.startDate} 00:00:00`;
    //     let endDate = `${req.query.endDate} 23:59:59`;
    
    //     dbConn.query(sql, [userID, startDate, endDate], (error, results) => {
    //       if (error) {
    //         console.log(error);
    //         return res.status(500).json({ error: 'Error occurred' });
    //       }
    //       console.log(results);
    //       return res.status(200).json({ results, message: 'Success' });
    //     });
    // } else {
    //     sql += `
    //       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    //       ORDER BY date ASC
    //     `;
    
    //     dbConn.query(sql, [userID], (error, results) => {
    //       if (error) {
    //         console.log(error);
    //         return res.status(500).json({ error: 'Error occurred' });
    //       }
    //       console.log(results);
    //       return res.status(200).json({ results, message: 'Success' });
    //     });
    // }
};

exports.getCountTopic = (req, res) => {
  dbConn.query(`
    SELECT * FROM topic 
  `,function(error, results){
    if (error) {
      return res.status(500).json({ status : 'error',})
    }
    // console.log(results);
    return res.status(200).json({ status : 'ok', results})
  })
};

exports.getYearProfitData = (req, res) => {
  const userID = req.user.userId;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let sql = `
    SELECT 
      DATE_FORMAT(finished_at, '%Y-%m') AS monthData,
      SUM(od_price) AS profit
    FROM
      cms_order
    WHERE
      artist_id = ?
      AND finished_at >= ? AND finished_at <= ?
      AND od_status = 'finished'
    GROUP BY 
      monthData,profit
  `;
  
  
  // let sql = `
  //   SELECT 
  //     DATE_FORMAT(finished_at, '%Y-%m') AS monthData,
  //     SUM(od_price + od_edit_amount_price) AS profit
  //   FROM
  //     cms_order
  //   WHERE
  //     artist_id = ?
  //     AND finished_at >= ? AND finished_at <= ?
  //     AND od_status = 'finished'
  //   GROUP BY 
  //     monthData
  // `;

  dbConn.query(sql, [userID, startDate, endDate], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error occurred' });
    }
    // console.log(results);
    return res.status(200).json({ results, message: 'Success' });
  });
}

exports.getProfitOutOfYear = (req, res) => {
  const userID = req.user.userId;
  let startDate = `${req.query.startDate} 00:00:00`;
  let endDate = `${req.query.endDate} 23:59:59`;
  console.log(startDate);
  console.log(endDate);
  // let sql = `
  //   SELECT 
  //     DATE_FORMAT(finished_at, '%Y-%m-%d') AS monthData,
  //     SUM(od_price) AS profit
  //   FROM
  //     cms_order
  //   WHERE
  //     artist_id = ?
  //     AND finished_at >= ? AND finished_at <= ?
  //     AND od_status = 'finished'
  //   GROUP BY 
  //     monthData,profit
  // `;
  let sql = `
    SELECT 
      DATE_FORMAT(finished_at, '%Y-%m-%d') AS monthData,
      SUM(od_price + od_edit_amount_price) AS profit
    FROM
      cms_order
    WHERE
      artist_id = ?
      AND finished_at >= ? AND finished_at <= ?
      AND od_status = 'finished'
    GROUP BY 
      monthData
  `;
  dbConn.query(sql, [userID, startDate, endDate], (error, results) => {
    if (error) {
      console.log(error);
      return res.status(500).json({ error: 'Error occurred' });
    }
    // console.log("getProfitOutOfYear : ", results);
    return res.status(200).json({ results, message: 'Success' });
  });
};

exports.getTopCommission = (req, res) => {
  const userID = req.user.userId;
  // const sql = `
  //   SELECT c.cms_id, c.cms_name, u.id, u.urs_profile_img, SUM(o.od_price) as profit
  //   FROM cms_order o 
  //   JOIN users u ON o.customer_id = u.id
  //   JOIN commission c ON o.cms_id = c.cms_id
  //   WHERE artist_id = ? AND od_status = "finished"
  //   GROUP BY c.cms_id, c.cms_name, u.id, u.urs_profile_img,profit
  //   ORDER BY profit DESC
  //   LIMIT 5 
  // `
  const sql = `
    SELECT c.cms_id, c.cms_name, u.id, u.urs_profile_img, SUM(o.od_price + o.od_edit_amount_price) as profit
    FROM cms_order o 
    JOIN users u ON o.customer_id = u.id
    JOIN commission c ON o.cms_id = c.cms_id
    WHERE artist_id = ? AND finished_at IS NOT NULL
    GROUP BY c.cms_id, c.cms_name, u.id, u.urs_profile_img
    ORDER BY profit DESC
    LIMIT 5 
  `
  dbConn.query(sql, [userID], function (error, result) {
    if (error) {
      console.log(error);
      return res.status(500).json({ error: 'Error occurred' });
    }
    // console.log(result);

    // การลดข้อมูลที่ซ้ำกันออก พร้อมกับแยกกลุ่มข้อมูล
    const combinedResult = result.reduce((acc, item) => {
      const existingItem = acc.find(element => element.cms_id === item.cms_id && element.cms_name === item.cms_name);
      if (existingItem) {
        existingItem.profit += item.profit;
        existingItem.customers.push({ id: item.id, urs_profile_img: item.urs_profile_img });
      } else {
        acc.push({
          cms_id: item.cms_id,
          cms_name: item.cms_name,
          profit: item.profit,
          customers: [{ id: item.id, urs_profile_img: item.urs_profile_img }]
        });
      }
      return acc;
    }, []);

    // console.log(combinedResult);
    return res.status(200).json({status: "ok", combinedResult})
    
  })
};

exports.getTopCustomer = (req, res) => {
  const userID = req.user.userId;
  const sql = `
    SELECT 
      u.id, u.urs_profile_img, u.urs_name,
      COUNT(*) AS order_count,
      o.od_price AS profit
    FROM cms_order o 
    JOIN users u ON o.customer_id = u.id
    WHERE artist_id = ? AND finished_at IS NOT NULL
    GROUP BY u.id, u.urs_profile_img, u.urs_name,profit
    ORDER BY profit DESC
    LIMIT 5 
  `
  dbConn.query(sql, [userID], function (error, results) {
    if (error) {
      console.log(error);
      return res.status(500).json({ error: 'Error occurred' });
    }
    // console.log(result);
    return res.status(200).json({status: "ok", results})
  })
};

exports.getCountFollower = (req, res) => {
  const userID = req.user.userId;
  const sql = `
    SELECT COUNT(*) as myfollower FROM follow WHERE following_id = ?
  `
  dbConn.query(sql, [userID], function(error, results){
    if (error) {
      console.log(error);
      return res.status(500);
    }
    const myfollower = results[0].myfollower
    return res.status(200).json({myfollower})
  })
};

exports.getSumProfit = (req, res) => {
  const userID = req.user.userId;
  // const sql = `
  //   SELECT 
  //     SUM(od_price) AS profit 
  //   FROM 
  //     cms_order
  //   WHERE artist_id = ? 
  // `
  const sql = `
    SELECT 
      COALESCE(SUM(od_price + od_edit_amount_price), 0) AS profit
    FROM 
      cms_order
    WHERE artist_id = ? 
  `
  dbConn.query(sql, [userID], function(error, results){
    if (error) {
      console.log(error);
      return res.status(500);
    }
    // console.log(results);
    const sumprofit = results[0].profit;
    return res.status(200).json({sumprofit})
  })
};

exports.getCountOrder = (req, res) => {
  const userID = req.user.userId;
  const sql = `
    SELECT 
      COUNT(*) AS order_count 
    FROM cms_order
    WHERE artist_id = ? AND od_status = ?
  `
  dbConn.query(sql, [userID, "finished"], function(error, results){
    if (error) {
      console.log(error);
      return res.status(500);
    }
    // console.log(results);
    const order_count = results[0].order_count;
    return res.status(200).json({order_count})
  })
  
}