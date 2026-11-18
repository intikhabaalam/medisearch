import express from "express";
import productController from "../controllers/product/productController.js";

const router = express.Router();

router.get("/", productController.getProducts);
router.get("/search", productController.searchMedicines);
router.get("/:pid", productController.getProduct);

export default router;
