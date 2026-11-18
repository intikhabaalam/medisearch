import mongoose from "mongoose";

const MedicineSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: null,
            trim: true,
        },
        dosage: {
            type: String,
            default: null,
            trim: true,
        },
        frequency: {
            type: String,
            default: null,
            trim: true,
        },
        duration: {
            type: String,
            default: null,
            trim: true,
        },
        notes: {
            type: String,
            default: null,
            trim: true,
        },
        // AI-Powered Detailed Medicine Explanation fields
        brand_name: {
            type: String,
            default: null,
            trim: true,
        },
        generic_name: {
            type: String,
            default: null,
            trim: true,
        },
        category: {
            type: String,
            default: null,
            trim: true,
        },
        usage: {
            type: String,
            default: null,
            trim: true,
        },
        conditions_treated: {
            type: [String],
            default: [],
        },
        mechanism_of_action: {
            type: String,
            default: null,
            trim: true,
        },
        side_effects: {
            type: [String],
            default: [],
        },
        precautions: {
            type: [String],
            default: [],
        },
        drug_interactions: {
            type: [String],
            default: [],
        },
        food_interactions: {
            type: String,
            default: null,
            trim: true,
        },
    },
    { _id: false }
);

const PrescriptionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        patient_name: {
            type: String,
            trim: true,
        },
        doctor_name: {
            type: String,
            trim: true,
        },
        date: {
            type: String,
            trim: true,
        },
        medicines: {
            type: [MedicineSchema],
            default: [],
        },
        diagnosis_notes: {
            type: String,
            trim: true,
        },
        image: {
            type: String,
            trim: true,
        },
        // AI-Generated Overall Prescription Explanation
        overall_explanation: {
            medicines_summary: {
                type: String,
                default: null,
            },
            purpose_of_each: [
                {
                    name: String,
                    general_purpose: String,
                    _id: false,
                }
            ],
            possible_reasons: {
                type: String,
                default: null,
            },
            overall_purpose: {
                type: String,
                default: null,
            },
        },
    },
    { timestamps: true }
);

const Prescription = mongoose.model('Prescription', PrescriptionSchema);

export default Prescription;
