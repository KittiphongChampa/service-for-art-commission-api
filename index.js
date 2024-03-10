const express = require("express");
const cors = require("cors");
require('dotenv').config()
const app = express();

const http = require('http');
const socketIO = require('socket.io');
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
    },
    secure: true,
    rejectUnauthorized: false,
});

const authRoutes = require('./routes/router')
const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs');
const fileUpload  = require('express-fileupload');

// let date = new Date();
// const formattedTime = date.toISOString().replace('T', ' ').slice(0, 19);

// let date = new Date();
// let options = { timeZone: "Asia/Bangkok" };
// let bangkokTime = date.toLocaleString("Asia/Bangkok", options);

const nDate = new Date().toLocaleString('en-US', {
  timeZone: 'Asia/Bangkok'
});

const onlineAdmins = new Map();
const onlineUsers = new Map(); 
// global.onlineUsers = new Map(); 
io.on('connection', (socket) => {
  // global.chatSocket = socket; 
  socket.on("add-user", (userId) => { 
    onlineUsers.set(userId, socket.id);
    // io.emit("getUsers", Array.from(onlineUsers.entries())); // เพิ่มมาใหม่
  });

  socket.on("add-admin", (adminId) => {
    onlineAdmins.set(adminId, socket.id)
  })

  socket.on("disconnect", () => { 
    onlineUsers.forEach((value, key) => {
      if (value === socket.id) {
        onlineUsers.delete(key);
        // io.emit("getUsers", onlineUsers);
        console.log(`ผู้ใช้ ${key} ตัดการเชื่อมต่อออกไป`);
      }
    });
  });

  socket.on("send-msg", (data) => { 
    const sendUserSocket = onlineUsers.get(data.to); 

    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-receive", { img:data.img, msgId:data.msgId, msg: data.msg, od_id: data.od_id, to: data.to, step_id: data.step_id, step_name: data.step_name, status: data.status, checked: data.checked, isSystemMsg: data.isSystemMsg, current_time: data.current_time, from : data.from  });
    } else {
      console.log("ไม่มีคนรับ");
    }
  });
  
  socket.on("update-order", (data) => { 
    const sendUserSocket = onlineUsers.get(data.to);  
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("update-order", { nowCurId: data.nowCurId, msgId: data.msgId, od_id: data.od_id,to: data.to,deleted: data.deleted});
    }
  });

  socket.on("update-timeline", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("update-timeline", { nowCurId: data.nowCurId, od_id: data.od_id, to: data.to });
    }
  });

  //ส่ง payment

  socket.on("update-payment", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("update-payment", { msgId: data.msgId, msg: data.msg, od_id: data.od_id, to: data.to, step_id: data.step_id, step_name: data.step_name, status: data.status, checked: data.checked, isSystemMsg: data.isSystemMsg, current_time: data.current_time, from: data.from });
    }
  });

  // users-user
  // แจ้งเตือนเมื่อนักวาดยอมรับ
  socket.on('acceptOrder', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data, created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนเมื่อนักวาดปฏิเสธ
  socket.on('cancelOrder', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: {...data, created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนนักวาดส่งภาพร่าง
  socket.on('sketchOrder', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: {...data, created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนการจ่ายเงินครั้งที่ 1
  socket.on('paymentFirsttime', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: {...data, created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนการจ่ายเงินครั้งที่ 2
  socket.on('paymentSecondtime', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: {...data, created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนนักวาดส่งภาพ final
  socket.on('completeOrder', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: {...data, created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });


  // users-artis
  // การจ้างงาน
  socket.on('addOrder', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data,created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนเมื่อลูกค้ายอมรับภาพร่าง
  socket.on('acceptsketchOrder', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data,created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนการตั้งราคา
  socket.on('setPriceOrder', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data,created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนลูกค้าชำระเงินครั้งที่ 1 แล้ว
  socket.on('checkPaymentFirst', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data,created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนลูกค้าชำระเงินครั้งที่ 2 แล้ว
  socket.on('checkPaymentSecond', (data) => {
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data,created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  socket.on("workhasdeletedByadmin", (data) => {
    console.log(data);
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data, created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  })


  // admin
  socket.on("reportCommission", (data) => {
    onlineAdmins.forEach((socketId, adminId) => {
      socket.to(socketId).emit('getNotificationAdmin',{
        data: { ...data, created_at: nDate, },
      })
    })
  });

  socket.on("reportArtwork", (data) => {
    onlineAdmins.forEach((socketId, adminId) => {
      socket.to(socketId).emit('getNotificationAdmin',{
        data: { ...data, created_at: nDate, },
      })
    })
  });



});




app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({extended: true,}));
app.use(fileUpload());
app.use(authRoutes)


const port = process.env.PORT || 3333;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
