import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
        default: "pending"
    },
    timelineStep: {
        type: Number,
        default: 0 // 0: Placed, 1: Processed, 2: Shipped, 3: Delivered
    },
    deliveryAddress: {
        type: String,
        default: "742 Evergreen Terrace, Springfield, OR"
    },
    trackingNumber: {
        type: String
    },
    eta: {
        type: String,
        default: "Tomorrow by 2:00 PM (Express)"
    },
    notes: {
        type: String
    },
    itemName: {
        type: String
    },
    itemImage: {
        type: String
    }
}, {
    timestamps: true
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
