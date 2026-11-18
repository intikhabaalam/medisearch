import express from "express";
import protect from "../middleware/authMiddleware.js";
import aiController from "../controllers/ai/aiController.js";
import upload from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

// AI Prescription Vision Scanner
router.post("/prescription", protect.forUser, upload.single('prescription'), aiController.explainPrescription);

// Dynamic AI Medicine Details & Overall Prescription Explanation
router.post("/prescription/explain-details", protect.forUser, aiController.explainMedicineDetails);

// Medicine Availability Finder (Prescription-based)
router.get("/find/:pid", protect.forUser, aiController.findMedicines);

// Symptom-to-Medicine Matching (Resilient, accessible to users & visitors)
router.post("/symptoms", aiController.findMedicinesBySymptom);

// Real AI Chat (POST method; GET preserved for backward compatibility)
router.post("/chat", protect.forUser, aiController.chatWithAi);
router.get("/chat", protect.forUser, (req, res) => {
    res.status(200).json({ message: "MediTrust AI Chat API is online. Send a POST request with { text: 'your message' }." });
});

export default router;
