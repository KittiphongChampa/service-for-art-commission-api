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

const formatDateThai = (date) => {
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Bangkok'
  };

  const formatter = new Intl.DateTimeFormat('th-TH', options);
  return formatter.format(date);
};

const nDate = formatDateThai(new Date());

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

  // progress_step
  socket.on('progress_step', (data) => {
    console.log(data);

    if (data.msg == "ภาพร่าง") {
      data.msg = "ได้ส่งภาพร่าง"
    } else if (data.msg == "ระบุราคา") {
      data.msg = "แจ้งเตือนการชำระเงินครั้งที่ 1"
    } else if (data.msg == "แนบสลิป") {
      data.msg = "ได้ชำระเงินครั้งที่ 1 แล้ว"
    } else if (data.msg = "ภาพไฟนัล") {
      data.msg = "ได้ส่งภาพไฟนัล"
    } else if (data.msg = "ตรวจสอบใบเสร็จ") {
      data.msg = "ตรวจสอบใบเสร็จแล้ว"
    } else if (data.msg == "ตรวจสอบใบเสร็จ2") {
      data.msg = "ให้คะแนนและความคิดเห็น"
    } else if (data.msg.includes("ภาพ") && data.msg != "ภาพร่าง" && data.msg != "ภาพไฟนัล") {
      data.msg = "ส่งความคืบหน้างาน"
    } 
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: {...data, created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // edit_progress
  socket.on('edit_Progress', (data) => {
    console.log('edit_Progress', data);
    if (data.msg == "ภาพร่าง") {
      data.msg = "แจ้งแก้ไขภาพร่าง"
    } else if (data.msg == "ตรวจสอบใบเสร็จ") {
      data.msg = "แจ้งแก้ไขใบเสร็จ"
    } else if (data.msg.includes("ภาพ") && data.msg != "ภาพร่าง" && data.msg != "ภาพไฟนัล") {
      data.msg = "แจ้งแก้ไขภาพ"
    } else if (data.msg == "ภาพไฟนัล") {
      data.msg = "แจ้งแก้ไขภาพไฟนัล"
    } else if (data.msg == "ตรวจสอบใบเสร็จ2") {
      data.msg = "แจ้งแก้ไขใบเสร็จ"
    }
    
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
    console.log('acceptsketchOrder',data);
    if (data.msg == "ภาพร่าง") {
      data.msg = 'อนุมัติภาพร่างแล้ว โปรดตั้งราคางาน';
    } else if (data.msg.includes("ภาพ") && data.msg != "ภาพร่าง") {
      data.msg = 'อนุมัติภาพความคืบหน้าแล้ว';
    } 
    
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data,created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แจ้งเตือนเมื่อลูกค้ายอมรับภาพไฟนัล
  socket.on('acceptfinalOrder', (data) => {
    console.log('acceptfinalOrder',data);
    if (data.msg = "ภาพไฟนัล") {
      data.msg = "แจ้งเตือนการชำระเงินครั้งที่ 2"
    }
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data,created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // แอดมินลบ cms หรือ artwork 
  socket.on("workhasdeletedByadmin", (data) => {
    console.log("workhasdeletedByadmin",data);
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: { ...data, created_at: nDate, },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  })

  socket.on("ManageCmsSimilar", (data) => {
    console.log("ManageCmsSimilar",data);
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

  socket.on("reportOrder", (data) => {
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
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
}));
app.use(authRoutes)


const port = process.env.PORT || 3333;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
