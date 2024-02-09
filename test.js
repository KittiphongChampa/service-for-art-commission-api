global.onlineUsers = new Map(); //สร้างตัวแปร global onlineUsers เพื่อเก็บข้อมูลผู้ใช้งานที่ออนไลน์ โดยใช้ Map ในการเก็บข้อมูลดังกล่าว
io.on('connection', (socket) => {
  global.chatSocket = socket; //กำหนด socket ที่เชื่อมต่อเข้ามาให้เป็นตัวแปร global chatSocket เพื่อใช้ในการสื่อสารกับ client อื่น ๆ ในภายหลัง
  socket.on("add-user", (userId) => { //รอรับเหตุการณ์ "add-user" จาก client เพื่อเพิ่มผู้ใช้งานใหม่ในรายชื่อผู้ใช้งานที่ออนไลน์ โดยใช้ userId เป็นตัวระบุ
    onlineUsers.set(userId, socket.id); //เพิ่มข้อมูลผู้ใช้งานใน Map onlineUsers โดยใช้ userId เป็นคีย์และ socket.id เป็นค่า
  });
  // console.log(onlineUsers);
  // console.log(chatSocket);

  
  socket.on("disconnect", () => { // เมื่อผู้ใช้หรือ client ตัดการเชื่อมต่อ
    // ทำสิ่งที่ต้องการเมื่อผู้ใช้ตัดการเชื่อมต่อออกไป  เช่น ลบผู้ใช้ออกจากรายการผู้ใช้ที่ออนไลน์
    onlineUsers.forEach((value, key) => {
      if (value === socket.id) {
        onlineUsers.delete(key);
        console.log(`ผู้ใช้ ${key} ตัดการเชื่อมต่อออกไป`);
      }
    });
  });

  socket.on("send-msg", (data) => { //รอรับเหตุการณ์ "send-msg" จาก client เพื่อส่งข้อความไปยังผู้ใช้งานที่เป็นผู้รับ
    const sendUserSocket = onlineUsers.get(data.to);  //ดึงค่า socket.id ของผู้ใช้งานที่เป็นผู้รับจาก Map onlineUsers โดยใช้ userId เป็นคีย์
    console.log('num : ',sendUserSocket);
    if (sendUserSocket) {
      //socket.to(sendUserSocket).emit("msg-receive", data.msg);//ส่งเหตุการณ์ "msg-receive" พร้อมกับข้อความdata.msg` ไปยังผู้รับผ่านการใช้งาน socket
      socket.to(sendUserSocket).emit("msg-receive", { img:data.img, msgId:data.msgId, msg: data.msg, od_id: data.od_id, to: data.to, step_id: data.step_id, step_name: data.step_name, status: data.status, checked: data.checked, isSystemMsg: data.isSystemMsg, current_time: data.current_time  });
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


  // users-user
  // แจ้งเตือนเมื่อนักวาดยอมรับ
  socket.on('acceptOrder', (data) => {
    console.log(data);
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: {
          ...data,
          created_at: nDate,
        },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });

  // users-artis
  // การจ้างงาน
  socket.on('addOrder', (data) => {
    console.log('addOrder : ',data);
    const sendUserSocket = onlineUsers.get(data.receiver_id);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("getNotification",{
        data: {
          ...data,
          created_at: nDate,
        },
      });
    } else{
      console.log("ไม่ส่งข้อความ");
    }
  });
});