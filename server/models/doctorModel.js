import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        clinicName: {
            type: String,
            required: true
        },

        address: {
            type: String,
            required: true
        },

        qualification: {
            type: String,
            required: true
        },

        registrationNumber: {
            type: String,
            required: true,
            unique: true
        },
        documents: {
            type: [{ name: { type: String, required: true }, url: { type: String, required: true } }],
            default: [],
            select: false
        },

        experience: {
            type: Number,
            default: 0
        },

        specialization: [
            {
                type: String
            }
        ],

        phone: {
            type: String
        },

        email: {
            type: String
        },

        consultationFee: {
            type: Number,
            default: 0
        },

        workingHours: {
            start: {
                type: String
            },
            end: {
                type: String
            }
        },

        availableDays: [
            {
                type: String,
                enum: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday"
                ]
            }
        ],

        isVerified: {
            type: Boolean,
            default: false
        },
        verificationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const Doctor = mongoose.model(
    "Doctor",
    doctorSchema
);

export default Doctor;
