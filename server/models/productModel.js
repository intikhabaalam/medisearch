import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        required: true,
        default: 50
    },
    expiresOn: {
        type: String,
        required: true,
        default: "2028-12-31"
    },
    image: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },
    brand: {
        type: String,
        trim: true
    },
    genericName: {
        type: String,
        trim: true
    },
    activeIngredient: {
        type: String,
        trim: true
    },
    manufacturer: {
        type: String,
        trim: true
    },
    dosageForm: {
        type: String
    },
    strength: {
        type: String
    },
    category: {
        type: String,
        default: "Prescription Drugs"
    },
    indications: {
        type: [String],
        default: []
    },
    warnings: {
        type: [String],
        default: []
    },
    packaging: {
        type: String
    },
    rxRequired: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        default: 4.8
    },
    reviewsCount: {
        type: Number,
        default: 142
    },
    source: {
        type: String,
        default: "catalog"
    },
    ndc: {
        type: String,
        trim: true
    },
    priceSource: {
        type: String,
        default: "catalog"
    },
    imageIsOfficial: {
        type: Boolean,
        default: false
    },
    dosageLabel: {
        type: String
    }
}, {
    timestamps: true
});

const Product = mongoose.model("Product", productSchema);

export default Product;
