import mongoose from "mongoose";
import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";

async function generateUniqueOrderId() {
    let unique = false;
    let orderId = "";
    while (!unique) {
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        orderId = `ORD-${randomDigits}`;
        const existing = await Order.findOne({ orderId });
        if (!existing) unique = true;
    }
    return orderId;
}

function formatOrder(ord, fallbackAddress = "") {
    const rawStatus = (ord.status || "pending").toLowerCase();
    const statusCapitalized = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

    let statusVariant = "info";
    if (rawStatus === "delivered") statusVariant = "success";
    else if (rawStatus === "cancelled") statusVariant = "danger";
    else if (rawStatus === "pending") statusVariant = "warning";

    const unitPrice = Number(ord.unitPrice || ord.product?.price || 0);
    const quantity = ord.quantity || 1;
    const total = Number(ord.total ?? Number((unitPrice * quantity).toFixed(2)));

    return {
        _id: ord._id,
        id: ord.orderId || `ORD-${ord._id.toString().slice(-6).toUpperCase()}`,
        date: new Date(ord.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }),
        total,
        status: statusCapitalized,
        statusVariant,
        eta: ord.eta || (rawStatus === "delivered" ? "Delivered" : "Tomorrow by 2:00 PM (Express)"),
        trackingNumber: ord.trackingNumber || `TRK-MED-${ord._id.toString().slice(-6).toUpperCase()}`,
        address: ord.deliveryAddress || fallbackAddress || "",
        items: [
            {
                name: ord.itemName || ord.product?.name || "Medicine",
                quantity,
                price: unitPrice,
                image: ord.itemImage || ord.product?.image || "",
                rxVerified: ord.product?.rxRequired ?? false
            }
        ],
        timelineStep: ord.timelineStep ?? (rawStatus === "delivered" ? 3 : rawStatus === "shipped" ? 2 : rawStatus === "confirmed" ? 1 : 0)
    };
}

/**
 * POST /api/orders
 */
const createOrder = async (req, res) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized. Please log in to place an order." });
    }

    const { productId, quantity = 1, deliveryAddress, notes } = req.body;

    if (!productId) {
        return res.status(400).json({ error: "Product reference is required to place an order." });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: "Invalid product ID format." });
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
        return res.status(400).json({ error: "Order quantity must be at least 1 unit." });
    }
    if (parsedQty > 30) {
        return res.status(400).json({ error: "Quantity cannot exceed 30 units per order." });
    }

    try {
        const recent = await Order.findOne({
            user: userId,
            product: productId,
            quantity: parsedQty,
            createdAt: { $gte: new Date(Date.now() - 10000) }
        })
            .populate("product")
            .populate("user", "name email");

        if (recent) {
            return res.status(200).json({
                message: "Medicine order already placed.",
                order: recent,
                duplicate: true
            });
        }

        const product = await Product.findOneAndUpdate(
            { _id: productId, isActive: true, stock: { $gte: parsedQty } },
            { $inc: { stock: -parsedQty } },
            { new: true }
        );

        if (!product) {
            const exists = await Product.findById(productId);
            if (!exists || !exists.isActive) {
                return res.status(404).json({ error: "Selected medicine is currently unavailable or inactive." });
            }
            return res.status(400).json({
                error: `Insufficient pharmacy inventory. Only ${exists.stock} units are currently in stock.`
            });
        }

        const unitPrice = Number(product.price);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            await Product.findByIdAndUpdate(productId, { $inc: { stock: parsedQty } });
            return res.status(400).json({ error: "This medicine does not have a valid pharmacy listing price." });
        }

        const total = Number((unitPrice * parsedQty).toFixed(2));
        const orderId = await generateUniqueOrderId();
        const trackingNumber = `TRK-MED-${Math.floor(100000 + Math.random() * 900000)}`;

        const order = await Order.create({
            orderId,
            user: userId,
            product: productId,
            quantity: parsedQty,
            unitPrice,
            total,
            status: "pending",
            timelineStep: 0,
            deliveryAddress: deliveryAddress || req.user?.address || "",
            trackingNumber,
            eta: "Tomorrow by 2:00 PM (Express)",
            notes: notes || "",
            itemName: product.name,
            itemImage: product.image
        });

        const populated = await Order.findById(order._id)
            .populate("product")
            .populate("user", "name email");

        console.log(`[Order Created] Order ID: ${orderId} by User: ${userId} for Product: ${product.name} (Qty: ${parsedQty}, Total: ${total})`);

        res.status(201).json({
            message: "Medicine order placed successfully!",
            order: populated
        });
    } catch (err) {
        console.error("createOrder error:", err.message);
        res.status(500).json({ error: "Failed to place order", details: err.message });
    }
};

/**
 * GET /api/orders
 */
const getMyOrders = async (req, res) => {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized. Please log in to view orders." });
    }

    try {
        const orders = await Order.find({ user: userId })
            .populate("product")
            .sort({ createdAt: -1 });

        res.status(200).json(orders.map((ord) => formatOrder(ord, req.user?.address)));
    } catch (err) {
        console.error("getMyOrders error:", err.message);
        res.status(500).json({ error: "Failed to retrieve orders", details: err.message });
    }
};

/**
 * GET /api/orders/:id
 */
const getOrder = async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    try {
        const query = { user: userId };
        if (mongoose.Types.ObjectId.isValid(id)) {
            query._id = id;
        } else {
            query.orderId = id;
        }

        const order = await Order.findOne(query).populate("product");

        if (!order) {
            return res.status(404).json({ error: "Order not found." });
        }

        res.status(200).json(formatOrder(order, req.user?.address));
    } catch (err) {
        console.error("getOrder error:", err.message);
        res.status(500).json({ error: "Failed to fetch order", details: err.message });
    }
};

const orderController = {
    createOrder,
    getMyOrders,
    getOrder
};

export default orderController;
