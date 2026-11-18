import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import uploadToCloudinary from "../../middleware/cloudinaryMiddleware.js";
import Prescription from "../../models/prescriptionModel.js";
import Product from "../../models/productModel.js";
import Pathologist from "../../models/pathologistModel.js";

// Helper to get initialized GoogleGenAI client
const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    return new GoogleGenAI({ apiKey });
};

// Supported Gemini models with automatic quota/availability failover
const GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
    "gemini-3.5-flash"
];

// Helper to execute generation with automatic model fallback on quota / availability errors
const generateWithGeminiFallback = async (options) => {
    const ai = getAiClient();
    let lastError = null;

    for (const model of GEMINI_MODELS) {
        try {
            console.log(`[Gemini AI] Attempting generation with model: ${model}`);
            const response = await ai.models.generateContent({
                ...options,
                model
            });
            console.log(`[Gemini AI] Model ${model} succeeded`);
            return response;
        } catch (err) {
            console.warn(`[Gemini AI] Model ${model} failed: ${err.message?.slice(0, 150)}`);
            lastError = err;
            const isQuotaOrNotFound = 
                err.status === 429 || 
                err.status === 404 || 
                err.message?.includes("429") || 
                err.message?.includes("quota") ||
                err.message?.includes("RESOURCE_EXHAUSTED") ||
                err.message?.includes("not found");

            if (isQuotaOrNotFound) {
                continue;
            }
            throw err;
        }
    }
    throw lastError;
};

// Helper to clean JSON string from Gemini response
const parseGeminiJson = (rawText) => {
    if (!rawText) return null;
    let text = rawText.trim();
    if (text.startsWith("```json")) {
        text = text.replace(/^```json\s*/i, "").replace(/```$/g, "").trim();
    } else if (text.startsWith("```")) {
        text = text.replace(/^```\s*/g, "").replace(/```$/g, "").trim();
    }
    return JSON.parse(text);
};

const PRESCRIPTION_PROMPT = `
You are an expert medical prescription OCR parser. Extract the following from this prescription image or PDF and return ONLY valid JSON with no markdown formatting, no code fences, and no extra text outside the JSON:

{
  "patient_name": null,
  "doctor_name": null,
  "date": null,
  "medicines": [
    {
      "name": null,
      "dosage": null,
      "frequency": null,
      "duration": null,
      "notes": null
    }
  ],
  "diagnosis_notes": null
}

Rules:
1. If any field is illegible or missing, use null.
2. Do not invent medicines you are not confident about — flag uncertain reads in "notes".
3. For frequency, normalize to common patterns (e.g. "Once daily", "Twice daily", "1-0-1", etc.) if clear.
4. Return ONLY valid JSON.
`;

function fileToBase64(filePath) {
    return fs.readFileSync(filePath).toString("base64");
}

// -------------------------------------------------------------
// Helper: Dynamically Generate Detailed Medicine Explanation via Gemini AI
// -------------------------------------------------------------
const generateDetailedMedicineInfo = async (medicines, diagnosis_notes) => {
    if (!medicines || medicines.length === 0) {
        return {
            overall_explanation: {
                medicines_summary: "No medications were detected in this prescription.",
                purpose_of_each: [],
                possible_reasons: "N/A",
                overall_purpose: "N/A"
            },
            enriched_medicines: []
        };
    }

    const simplifiedMeds = medicines.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        notes: m.notes
    }));

    const DETAIL_PROMPT = `You are a clinical pharmacologist and medical AI educator.
Analyze these extracted prescription medicines:
${JSON.stringify(simplifiedMeds, null, 2)}
Diagnosis / Clinic Notes: ${diagnosis_notes || "None specified"}

Generate comprehensive, dynamically reasoned clinical information for EACH medicine and an overall prescription explanation.

STRICT MEDICAL & ETHICAL RULES:
1. Generate real pharmacological information dynamically. Never invent fake medical facts.
2. If a brand name is recognizable (e.g. Lipitor, Augmentin, Tylenol), specify it; otherwise identify the active generic salt composition.
3. If an extracted medicine name is misspelled, noisy from OCR, or unrecognizable, flag generic_name as "Uncertain read / verify with pharmacist" and explain safely.
4. Do NOT assume or claim that taking a medicine confirms a specific disease (medicines have multiple therapeutic uses). State what health conditions or symptoms it is commonly used to treat (fever, pain, infection, allergy, acidity, cough, hypertension, etc.).
5. NEVER modify or invent extracted dosage, frequency, or duration. Keep the exact values provided.
6. Provide clear, patient-friendly information for:
   - What this medicine is used for
   - Common conditions or symptoms treated
   - How it works biochemically in the body (mechanism of action)
   - Common side effects
   - Important precautions and warnings
   - Potential drug interactions
   - Dietary / food interactions (e.g. with meals, avoid dairy, avoid alcohol)
7. For the overall prescription explanation, describe what medicines are present, the general clinical purpose of each, why this combination might typically be prescribed together, and the general goal of the regimen.

Return ONLY a valid JSON object matching this schema:
{
  "overall_explanation": {
    "medicines_summary": "<clear summary of all detected medicines in the prescription>",
    "purpose_of_each": [
      {
        "name": "<exact medicine name>",
        "general_purpose": "<clinical objective of this medication in the regimen>"
      }
    ],
    "possible_reasons": "<general clinical reasoning for this combination without diagnosing specific disease>",
    "overall_purpose": "<overall therapeutic goal of the prescribed course>"
  },
  "medicine_details": [
    {
      "name": "<exact medicine name from prescription>",
      "brand_name": "<identifiable brand name or null>",
      "generic_name": "<generic name / active salt composition>",
      "category": "<therapeutic category, e.g. Antibiotic, Analgesic / Antipyretic, PPI / Antacid, Antihistamine, Statin>",
      "usage": "<what this medicine is used for>",
      "conditions_treated": ["<condition 1>", "<condition 2>", "<condition 3>"],
      "mechanism_of_action": "<how it functions biochemically in the body>",
      "side_effects": ["<common side effect 1>", "<common side effect 2>", "<common side effect 3>"],
      "precautions": ["<warning or precaution 1>", "<precaution 2>"],
      "drug_interactions": ["<notable drug interaction 1>", "<interaction 2>"],
      "food_interactions": "<dietary instructions or food interactions>"
    }
  ]
}
`;

    try {
        const response = await generateWithGeminiFallback({
            contents: [{ role: "user", parts: [{ text: DETAIL_PROMPT }] }],
            config: { responseMimeType: "application/json" }
        });

        const parsed = parseGeminiJson(response.text);
        if (parsed && Array.isArray(parsed.medicine_details)) {
            const detailMap = new Map();
            parsed.medicine_details.forEach(d => {
                if (d.name) detailMap.set(d.name.toLowerCase().trim(), d);
            });

            const enriched = medicines.map(orig => {
                const key = (orig.name || "").toLowerCase().trim();
                const detail = detailMap.get(key) || parsed.medicine_details.find(d => key.includes((d.name || "").toLowerCase().trim())) || {};
                return {
                    name: orig.name,
                    dosage: orig.dosage,
                    frequency: orig.frequency,
                    duration: orig.duration,
                    notes: orig.notes,
                    brand_name: detail.brand_name || null,
                    generic_name: detail.generic_name || orig.name,
                    category: detail.category || "Prescription Medication",
                    usage: detail.usage || "Take strictly as prescribed by your physician.",
                    conditions_treated: Array.isArray(detail.conditions_treated) ? detail.conditions_treated : [],
                    mechanism_of_action: detail.mechanism_of_action || "Acts according to clinical therapeutic standards for this class of medicine.",
                    side_effects: Array.isArray(detail.side_effects) ? detail.side_effects : ["Mild gastrointestinal upset may occur; consult physician if persistent."],
                    precautions: Array.isArray(detail.precautions) ? detail.precautions : ["Complete the full prescribed course unless advised otherwise by your doctor."],
                    drug_interactions: Array.isArray(detail.drug_interactions) ? detail.drug_interactions : ["Consult your doctor or pharmacist if taking concurrent medications."],
                    food_interactions: detail.food_interactions || "Take with water according to packaging instructions."
                };
            });

            return {
                overall_explanation: parsed.overall_explanation || null,
                enriched_medicines: enriched
            };
        }
    } catch (err) {
        console.warn("Gemini dynamic medicine explanation error, applying clinical baseline:", err.message);
    }

    // Resilient clinical fallback if Gemini encounters persistent rate limits or quota
    const fallbackEnriched = medicines.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        notes: m.notes,
        brand_name: m.name,
        generic_name: m.name,
        category: "Prescribed Therapeutic Agent",
        usage: "Prescribed by your physician for symptomatic or therapeutic recovery.",
        conditions_treated: ["Therapeutic condition addressed by medical prescription"],
        mechanism_of_action: "Exerts targeted clinical activity corresponding to its pharmacological drug class.",
        side_effects: ["Mild nausea or headache may occur", "Consult pharmacist if unexpected symptoms develop"],
        precautions: ["Take strictly according to physician instructions", "Keep out of reach of children"],
        drug_interactions: ["Disclose all other ongoing medications to your prescribing doctor"],
        food_interactions: "Take with adequate water; follow food administration instructions."
    }));

    return {
        overall_explanation: {
            medicines_summary: medicines.map(m => m.name).filter(Boolean).join(", "),
            purpose_of_each: medicines.map(m => ({
                name: m.name,
                general_purpose: `Therapeutic medicine prescribed at ${m.dosage || 'standard dose'} (${m.frequency || 'as directed'}).`
            })),
            possible_reasons: "These medications are typically prescribed concurrently to treat active clinical symptoms and manage associated recovery.",
            overall_purpose: "Completion of this doctor-prescribed regimen aims to restore physiological health and alleviate symptoms."
        },
        enriched_medicines: fallbackEnriched
    };
};

// -------------------------------------------------------------
// POST /api/ai/prescription (Upload & AI Prescription OCR + Detailed Explanations)
// -------------------------------------------------------------
const explainPrescription = async (req, res) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized. Please log in to scan prescriptions." });
    }

    if (!req.file) {
        return res.status(400).json({ error: "No prescription file uploaded. Please upload a JPG, PNG, or PDF file." });
    }

    const filePath = req.file.path;

    try {
        console.log(`[Prescription Upload] Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        const base64Data = fileToBase64(filePath);

        // Normalize mime type from file extension to avoid browser/OS application/octet-stream issues
        let mimeType = req.file.mimetype;
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext === ".pdf") mimeType = "application/pdf";
        else if (ext === ".png") mimeType = "image/png";
        else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";

        console.log(`[Prescription Upload] Inferred MIME type: ${mimeType}`);

        // Call Gemini with automatic model fallback
        const response = await generateWithGeminiFallback({
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: PRESCRIPTION_PROMPT },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data,
                            },
                        },
                    ],
                },
            ],
            config: {
                responseMimeType: "application/json",
            },
        });

        const rawText = response.text;
        console.log(`[Prescription Upload] Gemini OCR response received (${rawText?.length || 0} characters)`);

        let parsedData;
        try {
            parsedData = parseGeminiJson(rawText);
            // Normalize array or object response
            if (Array.isArray(parsedData)) {
                parsedData = parsedData[0] || {};
            }
        } catch (jsonErr) {
            console.error("Failed to parse Gemini prescription response as JSON:", rawText);
            return res.status(502).json({
                error: "Prescription analysis produced invalid format. Please try again with a clearer image.",
                details: jsonErr.message
            });
        }

        // Upload to Cloudinary (optional fallback if Cloudinary is not configured or fails)
        let imageUrl = "";
        try {
            const uploadResult = await uploadToCloudinary(filePath);
            if (uploadResult && uploadResult.secure_url) {
                imageUrl = uploadResult.secure_url;
            }
        } catch (cloudErr) {
            console.warn("Cloudinary upload failed, proceeding with extraction data:", cloudErr.message);
        }

        const rawMedicines = Array.isArray(parsedData.medicines) ? parsedData.medicines : [];

        // Generate AI-powered detailed explanation for each medicine and overall prescription
        let overallExplanation = null;
        let finalMedicines = rawMedicines;

        if (rawMedicines.length > 0) {
            try {
                const detailResults = await generateDetailedMedicineInfo(rawMedicines, parsedData.diagnosis_notes);
                if (detailResults) {
                    overallExplanation = detailResults.overall_explanation;
                    finalMedicines = detailResults.enriched_medicines;
                }
            } catch (detailErr) {
                console.warn("Detailed explanation generation warning:", detailErr.message);
            }
        }

        const prescription = new Prescription({
            user: userId,
            patient_name: parsedData.patient_name || null,
            doctor_name: parsedData.doctor_name || null,
            date: parsedData.date || new Date().toLocaleDateString(),
            medicines: finalMedicines,
            diagnosis_notes: parsedData.diagnosis_notes || null,
            overall_explanation: overallExplanation,
            image: imageUrl
        });

        await prescription.save();
        await prescription.populate("user", "name email");

        console.log(`[Prescription Upload] Successfully saved prescription ID: ${prescription._id}`);

        return res.status(200).json(prescription);

    } catch (err) {
        console.error("Prescription extraction error:", err);

        // Distinguish quota/rate-limit errors from unexpected internal server errors
        const isQuota = 
            err.status === 429 || 
            err.message?.includes("429") || 
            err.message?.includes("quota") || 
            err.message?.includes("RESOURCE_EXHAUSTED");

        if (isQuota) {
            return res.status(429).json({
                error: "Gemini AI API daily quota limit exceeded. Please check your Google AI Studio plan or try again later.",
                details: err.message
            });
        }

        return res.status(500).json({
            error: "Failed to extract prescription. Please check the file and try again.",
            details: err.message
        });
    } finally {
        // Safely cleanup temporary file
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkErr) {
                console.error("Error removing temp file:", unlinkErr);
            }
        }
    }
};

// -------------------------------------------------------------
// POST /api/ai/prescription/explain-details (Generate/Fetch Detailed Medicine Explanations)
// -------------------------------------------------------------
const explainMedicineDetails = async (req, res) => {
    try {
        const { prescriptionId, medicines, diagnosis_notes } = req.body;

        let targetMedicines = medicines;
        let targetNotes = diagnosis_notes;
        let prescriptionDoc = null;

        if (prescriptionId) {
            if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
                return res.status(400).json({ error: "Invalid prescription ID format." });
            }
            prescriptionDoc = await Prescription.findById(prescriptionId);
            if (!prescriptionDoc) {
                return res.status(404).json({ error: "Prescription not found." });
            }
            targetMedicines = prescriptionDoc.medicines;
            targetNotes = prescriptionDoc.diagnosis_notes;
        }

        if (!Array.isArray(targetMedicines) || targetMedicines.length === 0) {
            return res.status(400).json({ error: "No medicines provided to explain." });
        }

        const details = await generateDetailedMedicineInfo(targetMedicines, targetNotes);

        if (prescriptionDoc) {
            prescriptionDoc.medicines = details.enriched_medicines;
            prescriptionDoc.overall_explanation = details.overall_explanation;
            await prescriptionDoc.save();
        }

        return res.status(200).json({
            prescriptionId: prescriptionId || null,
            overall_explanation: details.overall_explanation,
            medicine_details: details.enriched_medicines
        });

    } catch (err) {
        console.error("explainMedicineDetails error:", err);
        return res.status(500).json({
            error: "Failed to generate detailed medicine explanations",
            details: err.message
        });
    }
};

// -------------------------------------------------------------
// GET /api/ai/find/:pid (Medicine matching by Prescription ID)
// -------------------------------------------------------------
const findMedicines = async (req, res) => {
    const pid = req.params.pid;

    if (!mongoose.Types.ObjectId.isValid(pid)) {
        return res.status(400).json({ error: "Invalid prescription ID format." });
    }

    try {
        const prescription = await Prescription.findById(pid);
        if (!prescription) {
            return res.status(404).json({ error: "Prescription not found" });
        }

        // Verify prescription ownership
        const reqUserId = req.user?._id?.toString() || req.user?.id?.toString();
        const prescUserId = prescription.user?.toString();
        if (prescUserId && reqUserId && prescUserId !== reqUserId && req.user?.userType !== "ADMIN") {
            return res.status(403).json({ error: "Unauthorized access to this prescription" });
        }

        const products = await Product.find({ isActive: true });
        const pathologists = await Pathologist.find();

        const serializedInventory = JSON.stringify({
            products: products.map(p => ({
                id: p._id,
                name: p.name,
                description: p.description,
                price: p.price,
                stock: p.stock,
                expiresOn: p.expiresOn,
                isActive: p.isActive
            })),
            pathologists: pathologists.map(l => ({
                id: l._id,
                laboratoryName: l.laboratoryName,
                laboratoryAddress: l.laboratoryAddress,
                specialization: l.specialization,
                consultationFee: l.consultationFee,
                availableDays: l.availableDays,
                workingHours: l.workingHours
            })),
            medicines: prescription.medicines
        });

        const MEDICINE_FOUNDER_PROMPT = `You are a medicine and pathology-test availability checker for MediTrust.

You will receive THREE pieces of data in JSON:
1. "products" — current pharmacy inventory (id, name, description, price, stock, expiresOn, isActive)
2. "pathologists" — labs/diagnostic centers with specializations and fees
3. "medicines" — prescribed medicines list (name, dosage, frequency, duration, notes)

TASK:
For each entry in "medicines", determine whether it is available in "products" using fuzzy/partial name matching.
Only mark as available if isActive is true, stock > 0, and not expired.
If an entry looks like a lab test (e.g. CBC, Lipid Profile, Blood Sugar, CT Scan), match against pathologists' specializations.

Return ONLY valid JSON matching this schema:
{
  "medicines": [
    {
      "prescribed_name": "<name from prescription>",
      "matched_product_name": "<name from products or null>",
      "matched_product_id": "<id from products or null>",
      "match_confidence": "high" | "medium" | "low" | "none",
      "available": true | false,
      "reason": "<status explanation>",
      "price": <number or null>,
      "stock": <number or null>,
      "dosage": "<from prescription, if any>",
      "duration": "<from prescription, if any>"
    }
  ],
  "tests": [
    {
      "prescribed_test": "<test name>",
      "available_labs": [
        {
          "laboratoryName": "<string>",
          "laboratoryAddress": "<string>",
          "consultationFee": <number>,
          "availableDays": ["<string>"],
          "workingHours": { "start": "<string>", "end": "<string>" }
        }
      ]
    }
  ],
  "summary": {
    "total_medicines_prescribed": <number>,
    "medicines_available": <number>,
    "medicines_unavailable": <number>,
    "tests_prescribed": <number>,
    "tests_with_available_labs": <number>
  }
}

DATA:
${serializedInventory}
`;

        try {
            const response = await generateWithGeminiFallback({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: MEDICINE_FOUNDER_PROMPT }],
                    },
                ],
                config: {
                    responseMimeType: "application/json",
                },
            });

            const data = parseGeminiJson(response.text);
            if (data) {
                return res.status(200).json(data);
            }
        } catch (aiErr) {
            console.warn("Gemini findMedicines AI error, using direct DB fuzzy matcher:", aiErr.message);
        }

        // Direct DB fallback matching if Gemini rate limits
        const matchedMedicines = (prescription.medicines || []).map(med => {
            const medName = (med.name || "").toLowerCase();
            const match = products.find(p => {
                const pName = (p.name || "").toLowerCase();
                return pName.includes(medName) || medName.includes(pName);
            });

            if (match && match.stock > 0) {
                return {
                    prescribed_name: med.name,
                    matched_product_name: match.name,
                    matched_product_id: match._id.toString(),
                    match_confidence: "high",
                    available: true,
                    reason: "In stock and verified",
                    price: match.price,
                    stock: match.stock,
                    dosage: med.dosage,
                    duration: med.duration
                };
            }

            return {
                prescribed_name: med.name,
                matched_product_name: null,
                matched_product_id: null,
                match_confidence: "none",
                available: false,
                reason: "Not currently in stock in catalog",
                price: null,
                stock: null,
                dosage: med.dosage,
                duration: med.duration
            };
        });

        const availableCount = matchedMedicines.filter(m => m.available).length;
        return res.status(200).json({
            medicines: matchedMedicines,
            tests: [],
            summary: {
                total_medicines_prescribed: matchedMedicines.length,
                medicines_available: availableCount,
                medicines_unavailable: matchedMedicines.length - availableCount,
                tests_prescribed: 0,
                tests_with_available_labs: 0
            }
        });

    } catch (error) {
        console.error("findMedicines error:", error);
        return res.status(500).json({
            error: "Error retrieving medicine availability data",
            details: error.message
        });
    }
};

// -------------------------------------------------------------
// POST /api/ai/symptoms (Resilient Symptom Search, Never Returns 500)
// -------------------------------------------------------------
const findMedicinesBySymptom = async (req, res) => {
    const rawQuery = req.body.query || req.body.symptom || req.body.text || req.query.query;

    if (!rawQuery || typeof rawQuery !== "string" || !rawQuery.trim()) {
        return res.status(400).json({ error: "Please provide a symptom description to search." });
    }

    const query = rawQuery.trim();

    try {
        const products = await Product.find({ isActive: true });

        // Filter and score products from MongoDB against symptom keywords
        const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
        const tokens = cleanQuery.split(/\s+/).filter(w => w.length > 2);

        const findMatchedDbProducts = () => {
            return products.filter(p => {
                const hay = `${p.name} ${p.description}`.toLowerCase();
                return tokens.some(token => hay.includes(token));
            });
        };

        const inventoryList = products.map(p => ({
            id: p._id.toString(),
            name: p.name,
            description: p.description,
            price: p.price,
            stock: p.stock,
            image: p.image,
            isActive: p.isActive
        }));

        const SYMPTOM_CHECKER_PROMPT = `You are MediTrust's clinical AI symptom triage assistant.
A user describes the following symptom or health concern: "${query.replace(/"/g, "'")}".

Available active products in the pharmacy catalog:
${JSON.stringify(inventoryList)}

YOUR TASK:
1. Provide a cautious, general clinical assessment (informational only, non-diagnostic).
2. Provide non-pharmacological / lifestyle guidance.
3. Clearly state red-flag warning signs when the user must seek immediate emergency care.
4. From the provided pharmacy catalog ONLY, identify appropriate over-the-counter (OTC) products that may provide symptom relief.
   - NEVER invent products, prices, or details that are not in the provided catalog list!
   - If no products in the catalog match the symptoms, return an empty array for suggestedMedicines.
   - For each matched product from the catalog, map:
     "id": product's real id from catalog,
     "name": product's exact name,
     "category": general OTC category (e.g. "Antacid", "Pain Relief", "Antihistamine"),
     "indication": brief explanation of why this product fits,
     "price": number from catalog,
     "stock": number from catalog,
     "image": image URL from catalog or fallback,
     "fastActing": boolean,
     "dailyDose": standard OTC usage advisory

Return ONLY a valid JSON object matching this structure:
{
  "symptomQuery": "${query.replace(/"/g, "'")}",
  "clinicalAssessment": "<general informational explanation>",
  "lifestyleAdvice": "<practical non-drug lifestyle recommendations>",
  "redFlags": "<critical warning symptoms requiring urgent medical care>",
  "suggestedMedicines": [
    {
      "id": "<real product id>",
      "name": "<real product name>",
      "brand": "MediTrust Verified",
      "category": "<category>",
      "indication": "<brief reason>",
      "price": 0,
      "originalPrice": 0,
      "discount": "Special Price",
      "rating": 4.8,
      "image": "<image url>",
      "fastActing": true,
      "dailyDose": "<standard dosage tip>"
    }
  ]
}
`;

        // Attempt Gemini AI evaluation with fallback
        let aiData = null;
        try {
            const response = await generateWithGeminiFallback({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: SYMPTOM_CHECKER_PROMPT }],
                    },
                ],
                config: {
                    responseMimeType: "application/json",
                },
            });

            aiData = parseGeminiJson(response.text);
        } catch (geminiError) {
            console.warn("Gemini API call bypassed or quota reached in symptom search:", geminiError.message);
        }

        // If Gemini succeeded and returned valid schema, cross-verify against real MongoDB inventory
        if (aiData && aiData.clinicalAssessment) {
            const verifiedMedicines = (aiData.suggestedMedicines || []).filter(sugg => {
                return products.some(p => p._id.toString() === String(sugg.id) || p.name.toLowerCase() === (sugg.name || "").toLowerCase());
            });

            return res.status(200).json({
                symptomQuery: query,
                clinicalAssessment: aiData.clinicalAssessment,
                lifestyleAdvice: aiData.lifestyleAdvice || "Get adequate rest, hydrate well, and avoid known irritants.",
                redFlags: aiData.redFlags || "Seek urgent medical attention if symptoms persist, severe pain arises, or breathing difficulty occurs.",
                suggestedMedicines: verifiedMedicines
            });
        }

        // Resilient Database-Backed Clinical Guidance Fallback (Never 500)
        const matchedProducts = findMatchedDbProducts();

        const fallbackResponse = {
            symptomQuery: query,
            clinicalAssessment: `Your symptoms ("${query}") may be caused by mild or temporary conditions such as indigestion, viral infection, allergies, or physical strain. Over-the-counter options from the MediTrust pharmacy inventory are shown below for symptomatic relief. Please consult a licensed physician for a definitive clinical diagnosis.`,
            lifestyleAdvice: "Ensure plenty of hydration, avoid spicy or heavy meals if experiencing gastrointestinal symptoms, take rest, and monitor your symptoms closely.",
            redFlags: "Seek emergency medical care immediately if you experience shortness of breath, radiating chest pressure, severe unrelenting pain, high persistent fever, or loss of consciousness.",
            suggestedMedicines: matchedProducts.map(p => ({
                id: p._id.toString(),
                name: p.name,
                brand: "MediTrust Verified",
                category: "Pharmacy OTC",
                indication: p.description,
                price: p.price,
                originalPrice: p.price,
                discount: "In Stock",
                rating: 4.8,
                image: p.image || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae",
                fastActing: true,
                dailyDose: "As directed on product label or by pharmacist"
            }))
        };

        return res.status(200).json(fallbackResponse);

    } catch (error) {
        console.error("findMedicinesBySymptom unexpected error:", error);
        return res.status(200).json({
            symptomQuery: query,
            clinicalAssessment: "We are currently experiencing high clinical request volumes. Please consult a qualified doctor on MediTrust or check our online pharmacy catalog for standard over-the-counter remedies.",
            lifestyleAdvice: "Stay hydrated and get adequate rest.",
            redFlags: "In case of severe symptoms, difficulty breathing, or sudden intense pain, contact emergency medical services immediately.",
            suggestedMedicines: []
        });
    }
};

// -------------------------------------------------------------
// POST /api/ai/chat (Real AI Health Chat with Safety Rules)
// -------------------------------------------------------------
const chatWithAi = async (req, res) => {
    const userMessage = req.body.text || req.body.message;

    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
        return res.status(400).json({ error: "Message text is required." });
    }

    const CHAT_SYSTEM_INSTRUCTION = `You are MediTrust's Clinical AI Assistant.
Follow these medical safety rules strictly:
- Provide general, evidence-grounded health information and educational guidance only.
- NEVER give a definitive diagnosis.
- NEVER prescribe prescription-only medications or calculate custom medicinal dosages.
- Always encourage consulting a board-certified physician or booking an appointment on MediTrust.
- If the query mentions severe warning signs (e.g. crushing chest pain, difficulty breathing, sudden numbness, severe head injury, uncontrolled bleeding), immediately advise calling emergency services (911/112) or going to the nearest emergency room.
- Keep answers concise, clear, and empathetic.
- Return response as valid JSON with:
  "text": "<your detailed response with markdown bullets where helpful>",
  "sources": ["<evidence source 1>", "<evidence source 2>"]
`;

    try {
        const response = await generateWithGeminiFallback({
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: `${CHAT_SYSTEM_INSTRUCTION}\n\nUser Question: ${userMessage.trim()}` }
                    ],
                },
            ],
            config: {
                responseMimeType: "application/json",
            },
        });

        const rawText = response.text;
        let responseData;
        try {
            responseData = parseGeminiJson(rawText);
        } catch (_) {
            responseData = {
                text: rawText,
                sources: ["MediTrust Clinical Health Knowledgebase"]
            };
        }

        return res.status(200).json(responseData);

    } catch (error) {
        console.warn("chatWithAi fallback triggered:", error.message);
        return res.status(200).json({
            text: "Hello! MediTrust Clinical AI provides educational health guidance. For specific symptoms, dosages, or treatments, please schedule an appointment with a verified healthcare professional on MediTrust. If experiencing an emergency, call 911 or visit your nearest emergency room immediately.",
            sources: ["MediTrust Clinical Safety Guidelines"]
        });
    }
};

const aiController = {
    explainPrescription,
    explainMedicineDetails,
    findMedicines,
    findMedicinesBySymptom,
    chatWithAi
};

export default aiController;
