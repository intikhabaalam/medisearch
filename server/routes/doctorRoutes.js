import express from "express"
import protect from "../middleware/authMiddleware.js"
import doctorController from "../controllers/pathologist/doctorController.js"
import upload from "../middleware/fileUploadMiddleware.js"

const router = express.Router()


router.get("/", doctorController.getAllDoctors)
router.get("/me", protect.forDoctor, doctorController.getMyDoctorProfile)
router.get("/appointments", protect.forDoctor, doctorController.getAllAppointments)
router.get("/my-appointments", protect.forUser, doctorController.getMyAppointments)
router.get("/appointments/:aid", protect.forUser, doctorController.getAppointment)

router.post("/request", protect.forUser, upload.array("documents", 5), doctorController.becomeDoctor)
router.post("/:did", protect.forUser, doctorController.bookAppointment)

router.put("/appointments/:aid", protect.forUser, doctorController.updateAppointment)


export default router
