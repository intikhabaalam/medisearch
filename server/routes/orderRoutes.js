import express from "express";
import orderController from "../controllers/order/orderController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect.forUser, orderController.createOrder);
router.get("/", protect.forUser, orderController.getMyOrders);
router.get("/:id", protect.forUser, orderController.getOrder);

export default router;
