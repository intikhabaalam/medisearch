import express from "express"
import adminService from "../controllers/admin/adminController.js"
import protect from "../middleware/authMiddleware.js"
import upload from "../middleware/fileUploadMiddleware.js"

const router = express.Router()

router.get("/users", protect.forAdmin, adminService.getAllUsers)
router.get("/products", protect.forAdmin, adminService.getAllProducts)
router.get("/pathologists", protect.forAdmin, adminService.getAllPathologists)
router.get("/orders", protect.forAdmin, adminService.getAllOrders)
router.get("/doctors", protect.forAdmin, adminService.getAllDoctors)
router.get("/dashboard", protect.forAdmin, adminService.getDashboard)
router.get("/tests", protect.forAdmin, adminService.getAllTests)

router.post("/product", protect.forAdmin, upload.single('image'), adminService.addProduct)

router.put("/product/:pid", protect.forAdmin, upload.single('image'), adminService.updateProduct)
router.delete("/product/:pid", protect.forAdmin, adminService.deleteProduct)
router.post("/tests", protect.forAdmin, adminService.saveTest)
router.put("/tests/:tid", protect.forAdmin, adminService.saveTest)
router.delete("/tests/:tid", protect.forAdmin, adminService.deleteTest)
router.put("/orders/:oid", protect.forAdmin, adminService.updateOrder)
router.put("/users/:uid", protect.forAdmin, adminService.updateUser)
router.put("/pathologists/:pid", protect.forAdmin, adminService.updatePathologist)
router.put("/doctor/:did", protect.forAdmin, adminService.updateDoctor)


export default router
