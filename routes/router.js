let express = require("express");
let router = express.Router();
const signinController = require("../controllers/signinController");
const userDataController = require("../controllers/userDataController");
const adminController = require("../controllers/adminController");
const profileController = require("../controllers/profileController");
const viewprofileController = require("../controllers/viewprofileController");
const chatController = require("../controllers/chatController");
const galleryController = require("../controllers/galleryController");
const indexController = require("../controllers/indexController");
const reportController = require("../controllers/reportController");
const cmsController = require("../controllers/cmsController");
const orderController = require("../controllers/orderController");
const artistDashboardController = require("../controllers/artistDashboardController");
const notificationController = require("../controllers/notificationController");

const auth = require("../middleware/auth");

//test
router.get("/user", signinController.user);

//ยังไม่มี token signinController
router.post("/verify", signinController.verify);
router.post("/verify/email", signinController.verify_email);
router.post("/register", signinController.register);
router.post("/login", signinController.login);
router.post("/forgot-password", signinController.forgotPassword);
router.post("/check_otp", signinController.check_otp); 
router.put("/reset-password", signinController.resetPassword);

//userDataController
router.get("/index", auth.verifyToken, userDataController.index);
router.get("/myCommission", auth.verifyToken, userDataController.myCommission);
router.get("/myGallery", auth.verifyToken, userDataController.myGallery);

//profileController
router.get("/profile", auth.verifyToken, auth.user_artisOnly, profileController.profile);
router.get("/openFollower", profileController.openFollower)
router.get("/openFollowing", profileController.openFollowing)
router.put('/profile/password/change', auth.verifyToken, profileController.changePassword)
router.patch("/profile/update", auth.verifyToken, profileController.update_profile);
router.patch("/cover_color/update", auth.verifyToken, profileController.update_cover_color);
router.put("/profile_img/update", auth.verifyToken, profileController.update_profile_img);
router.patch("/bank/update", auth.verifyToken, profileController.update_bank);
router.put("/delete_account", auth.verifyToken, profileController.delete_account);

//viewprofileController
router.get("/profile/:id", auth.verifyToken, viewprofileController.viewProfile);
router.post("/follow", auth.verifyToken, viewprofileController.follow);
router.delete("/unfollow/:id", auth.verifyToken, viewprofileController.unfollow);
router.get("/userCommission/:id", auth.verifyToken, viewprofileController.userCommission);

//chat
router.get("/index", auth.verifyToken, chatController.index);
router.get("/chat/partner/:id", auth.verifyToken, chatController.chatPartner);
router.get("/allchat", auth.verifyToken, chatController.allchat);
router.post("/messages/getmsg", chatController.getMessages);
router.post("/messages/addmsg", chatController.addMessages);

//commission
router.post("/commission/add", auth.verifyToken, cmsController.addCommission);
router.patch("/commission/update/:id", auth.verifyToken, cmsController.updateCommission);
router.patch("/commission/delete/:id", cmsController.deleteCommission);
router.patch("/changestatus/:id", cmsController.manageStatusCms);


//indexCommissionController
router.get("/latestCommission", cmsController.latestCommission);
router.get("/artistCommission", auth.verifyToken, cmsController.artistCommission);
router.get("/detailCommission/:id", cmsController.detailCommission);
router.get("/queue/:id", cmsController.getQueue)
router.get("/getQueueData/:id", cmsController.getQueueData)
router.get("/getCommission", cmsController.getCommission)
router.get("/getCommission/Ifollow", cmsController.getCommissionIfollow)

router.get("/get/queue/:id", cmsController.getQueueInfo)



//galleryController
router.get("/gallerry/select-cms", auth.verifyToken, galleryController.selectgallory)
router.post("/gallerry/add", auth.verifyToken, galleryController.galloryAdd)
router.patch("/gallerry/update/:id", auth.verifyToken, galleryController.galloryUpdate)
router.patch("/gallerry/delete/:id", galleryController.galloryDelete)

router.get("/gallerry/all", galleryController.galloryAll)
router.get("/gallerry/latest", galleryController.gallorylatest)
router.get("/gallerry/detail/:id", galleryController.galloryDetail)
router.get("/gallerry/Ifollow", auth.verifyToken, galleryController.galloryIfollow)
router.get("/galleryIFollowArtist", galleryController.galleryIFollowArtist)

//admin
router.get("/admin", auth.verifyToken, auth.adminOnly, adminController.admin);
router.get("/alluser", auth.verifyToken, auth.adminOnly, adminController.allUser);
router.get("/alladmin", auth.verifyToken, auth.adminOnly, adminController.allAdmin);

router.patch("/alluser/delete/:id", auth.verifyToken, auth.adminOnly, adminController.delete_User);

router.post("/alladmin/email/verify", adminController.adminVerifyEmail);
router.post("/alladmin/otp/verify/", adminController.adminVerifyOTP);

router.patch("/alladmin/add/:id", adminController.createAdmin);
router.patch("/alladmin/edit/:id", adminController.editAdmin);
router.patch("/alladmin/delete/:id", adminController.deleteAdmin);

router.get("/allfaq", auth.verifyToken, auth.adminOnly, adminController.allfaq);
router.post("/faq/add", auth.verifyToken, adminController.addfaq);
router.patch("/faq/update/:id", adminController.updatefaq);
router.patch("/faq/delete/:id", adminController.deletefaq);


router.get("/all-id-admin", adminController.alladminIds);//ตอนนี้ไม่ได้ใช้


//admin-noti
router.post("/admin/noti/add", notificationController.addNotiArtwork);
router.get("/admin/noti/getmsg", notificationController.getAdminNoti);

//user-noti
router.get("/noti/getmsg", auth.verifyToken, notificationController.getNoti)
router.post("/noti/order/add", notificationController.notiAdd);
router.put("/noti/readed", notificationController.notiReaded)


//admin-dashboard
router.get("/getYearData", adminController.getYearData);
router.get("/getOutOfYearData", adminController.getOutOfYearData);
router.get("/getdataPieChart", adminController.dataPieChart );

//adminManageCms
router.get("/allcommission", auth.verifyToken, auth.adminOnly, adminController.allCommission);
router.get("/commission/problem/:id", auth.verifyToken, auth.adminOnly, adminController.problemCommission);
router.patch("/commission/problem/approve/:id", adminController.problemCommissionApprove);
router.patch("/commission/problem/notapprove/:id", auth.verifyToken, adminController.problemCommissionNotApprove);

//artist-dashboard
router.get("/getYearDataArtist", auth.verifyToken, artistDashboardController.getYearDataArtist);
router.get("/getOutOfYearDataArtist", auth.verifyToken, artistDashboardController.getOutOfYearDataArtist);
router.get("/getCountTopic", artistDashboardController.getCountTopic)

router.get("/get/profit/yeardata", auth.verifyToken, artistDashboardController.getYearProfitData);
router.get("/get/profit/outofyear", auth.verifyToken, artistDashboardController.getProfitOutOfYear);

router.get("/get/top/commission", auth.verifyToken, artistDashboardController.getTopCommission);
router.get("/get/top/customer", auth.verifyToken, artistDashboardController.getTopCustomer);

router.get("/count/Follower", auth.verifyToken, artistDashboardController.getCountFollower)
router.get("/sum/profit", auth.verifyToken, artistDashboardController.getSumProfit)
router.get("/count/order", auth.verifyToken, artistDashboardController.getCountOrder)

//indexController
router.post("/ArtistIndex", indexController.ArtistIndex);
router.get("/allArtist", indexController.allArtist);
router.get("/getAritisIFollow", indexController.ArtistIFollow);
router.get("/getTopic", indexController.getTopic);
router.get("/all/faq", indexController.getFaq)

router.get("/search", indexController.search)

//reportController
router.get("/allreport", reportController.allReport);
router.get("/report/detail/:id", reportController.reportDetail);
router.get("/allApproveReport", reportController.allApproveReport);
router.get("/allDeletedReport", reportController.allDeletedReport);

router.post("/report/approve/:id", reportController.approveReport);
router.post("/report/delete/:id", auth.verifyToken, auth.adminOnly, reportController.deleteReport);

router.post("/report/artwork/:id", auth.verifyToken, reportController.reportArtwork);
router.post("/report/commission/:id", auth.verifyToken, reportController.reportCommission);

//orderController
router.post("/order/add", auth.verifyToken, orderController.user_addOrder);
router.post("/messages/addmsg-order", auth.verifyToken, orderController.addMessagesOrder);
router.post("/getAllSteps", orderController.getAllSteps);
router.post("/getcurrentstep", orderController.getCurrentStep);
router.post("/getorderdata", orderController.getCurrentOrderData);
router.post("/getallorderdetail", orderController.getAllOrderDetail);
router.post("/messages/updatestep", orderController.updateStep);
router.post("/upload-img/progress/:id", orderController.sendImageProgress);
router.get("/getPayment/order/:id", orderController.getPayment);
router.post("/sendreview", orderController.sendReview);
router.get("/getreq", auth.verifyToken, orderController.getMyReq);
router.get("/getcmsreq", auth.verifyToken, orderController.getCmsReq);
router.get("/getalltou/:od_id", orderController.getAllTou);
router.post("/changeorder", orderController.changeOrder);
router.post("/finishorder", orderController.finishOrder);
router.post("/cancelorder", orderController.cancelOrder);
router.post("/setdeadline", orderController.setDeadline);
router.post("/cancelslip", orderController.cancelSlip);



// router.post("/test/:id", orderController.test);




module.exports = router;