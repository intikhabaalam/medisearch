import fs from "node:fs";
import mongoose from "mongoose";
import uploadToCloudinary from "../../middleware/cloudinaryMiddleware.js";
import Product from "../../models/productModel.js";
import User from "../../models/userModel.js";
import Pathologist from "../../models/pathologistModel.js";
import Doctor from "../../models/doctorModel.js";
import Order from "../../models/orderModel.js";
import PathologyTest from "../../models/pathologyTestModel.js";
import DoctorAppointment from "../../models/doctorAppointmentModel.js";
import PathologyAppointment from "../../models/pathologyAppointmentModel.js";

const getAllUsers = async (_req, res) => res.json(await User.find().select("-password").sort({ createdAt: -1 }).lean());
const getAllOrders = async (_req, res) => res.json(await Order.find().populate("user", "name email phone").populate("product").sort({ createdAt: -1 }));
const getAllDoctors = async (_req, res) => res.json(await Doctor.find().select("+documents").populate("user", "name email phone createdAt").sort({ createdAt: -1 }));
const getAllProducts = async (_req, res) => res.json(await Product.find().sort({ createdAt: -1 }));
const getAllPathologists = async (_req, res) => res.json(await Pathologist.find().populate("user", "name email phone createdAt").sort({ createdAt: -1 }));

const getDashboard = async (_req, res) => {
    const [users, doctors, labs, products, tests, orders, doctorAppointments, labAppointments, revenues, months, recentOrders, recentDoctors, recentLabs] = await Promise.all([
        User.countDocuments(), Doctor.countDocuments(), Pathologist.countDocuments(), Product.countDocuments(),
        PathologyTest.countDocuments(), Order.countDocuments(), DoctorAppointment.countDocuments(), PathologyAppointment.countDocuments(),
        Order.aggregate([{ $match: { status: "delivered" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
        Order.aggregate([
            { $match: { status: "delivered", createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1) } } },
            { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]),
        Order.find().populate("user", "name email").populate("product", "name").sort({ createdAt: -1 }).limit(8).lean(),
        Doctor.find().select("clinicName verificationStatus isVerified createdAt").sort({ createdAt: -1 }).limit(5).lean(),
        Pathologist.find().select("laboratoryName verificationStatus isVerified createdAt").sort({ createdAt: -1 }).limit(5).lean()
    ]);
    const revenue = revenues[0]?.total || 0;
    const priorMonth = new Date(); priorMonth.setMonth(priorMonth.getMonth() - 1);
    const thisMonth = months.find((m) => m._id.year === new Date().getFullYear() && m._id.month === new Date().getMonth() + 1)?.revenue || 0;
    const lastMonth = months.find((m) => m._id.year === priorMonth.getFullYear() && m._id.month === priorMonth.getMonth() + 1)?.revenue || 0;
    const recentApplications = [...recentDoctors.map(item => ({ ...item, kind: "doctor", name: item.clinicName, status: item.isVerified ? "approved" : item.verificationStatus || "pending" })), ...recentLabs.map(item => ({ ...item, kind: "lab", name: item.laboratoryName, status: item.isVerified ? "approved" : item.verificationStatus || "pending" }))].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,8);
    res.json({ stats: { users, doctors, labs, products, tests, orders, appointments: doctorAppointments + labAppointments, revenue, revenueGrowth: lastMonth ? ((thisMonth - lastMonth) / lastMonth) * 100 : null }, monthlyRevenue: months, recentOrders, recentApplications });
};

async function uploadImage(req) {
    if (!req.file) return null;
    try {
        const result = await uploadToCloudinary(req.file.path);
        if (!result?.secure_url) throw Object.assign(new Error("Cloudinary image upload failed"), { status: 502 });
        return result.secure_url;
    }
    finally { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); }
}
function productPayload(body) {
    const data = { ...body };
    for (const field of ["price", "stock"]) if (data[field] !== undefined) data[field] = Number(data[field]);
    if (data.rxRequired !== undefined) data.rxRequired = data.rxRequired === true || data.rxRequired === "true";
    delete data.requiresPrescription;
    return data;
}
function validateProduct(data, requireImage = false) {
    if (data.name !== undefined && !String(data.name).trim()) throw Object.assign(new Error("Product name is required"), { status: 400 });
    if (data.price !== undefined && (!Number.isFinite(data.price) || data.price <= 0)) throw Object.assign(new Error("Price must be greater than zero"), { status: 400 });
    if (data.stock !== undefined && (!Number.isInteger(data.stock) || data.stock < 0)) throw Object.assign(new Error("Stock must be a non-negative integer"), { status: 400 });
    if (requireImage && !data.image) throw Object.assign(new Error("A product image is required"), { status: 400 });
}
const addProduct = async (req, res) => {
    const data = productPayload(req.body); data.image = await uploadImage(req) || data.image;
    validateProduct(data, true);
    if (!data.description || !data.category || !data.expiresOn) return res.status(400).json({ message: "Description, category and expiry date are required" });
    res.status(201).json(await Product.create(data));
};
const updateProduct = async (req, res) => {
    const data = productPayload(req.body); data.image = await uploadImage(req) || data.image;
    validateProduct(data);
    const product = await Product.findByIdAndUpdate(req.params.pid, { $set: data }, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
};
const deleteProduct = async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.pid, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product removed from catalog", product });
};
const updatePathologist = async (req, res) => {
    if (typeof req.body.isVerified !== "boolean") return res.status(400).json({ message: "isVerified must be true or false" });
    const pathologist = await Pathologist.findByIdAndUpdate(req.params.pid, { isVerified: req.body.isVerified, verificationStatus: req.body.isVerified ? "approved" : "rejected" }, { new: true }).populate("user", "name email phone userType");
    if (!pathologist) return res.status(404).json({ message: "Pathology lab not found" });
    if (pathologist.user && (req.body.isVerified || pathologist.user.userType === "PATHOLOGIST")) await User.findByIdAndUpdate(pathologist.user._id, { userType: req.body.isVerified ? "PATHOLOGIST" : "USER" });
    res.json(pathologist);
};
const updateDoctor = async (req, res) => {
    if (typeof req.body.isVerified !== "boolean") return res.status(400).json({ message: "isVerified must be true or false" });
    const currentDoctor = await Doctor.findById(req.params.did);
    if (!currentDoctor) return res.status(404).json({ message: "Doctor not found" });
    const applicant = await User.findById(currentDoctor.user);
    if (!applicant) return res.status(404).json({ message: "Doctor applicant account not found" });
    if (!["USER", "DOCTOR"].includes(applicant.userType)) return res.status(409).json({ message: "Applicant account has a different provider role" });
    const doctor = await Doctor.findByIdAndUpdate(req.params.did, { isVerified: req.body.isVerified, verificationStatus: req.body.isVerified ? "approved" : "rejected" }, { new: true, runValidators: true }).select("+documents").populate("user", "name email phone userType");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    applicant.userType = req.body.isVerified ? "DOCTOR" : "USER";
    await applicant.save();
    res.json({ message: req.body.isVerified ? "Doctor verified successfully" : "Doctor verification rejected", doctor });
};
const getAllTests = async (_req, res) => res.json(await PathologyTest.find().populate("pathologist").sort({ createdAt: -1 }));
const saveTest = async (req, res) => {
    const { pathologist, title, description, price, category, preparationInstructions, isAvailable } = req.body;
    if (!mongoose.Types.ObjectId.isValid(pathologist) || !title?.trim() || !description?.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ message: "Valid lab, test name, description and non-negative price are required" });
    if (!(await Pathologist.exists({ _id: pathologist }))) return res.status(400).json({ message: "Selected pathology lab does not exist" });
    const data = { pathologist, title: title.trim(), description: description.trim(), price: Number(price), category: category?.trim() || "General", preparationInstructions: preparationInstructions?.trim() || "", isAvailable: isAvailable !== false && isAvailable !== "false" };
    const test = req.params.tid ? await PathologyTest.findByIdAndUpdate(req.params.tid, data, { new: true, runValidators: true }).populate("pathologist") : await PathologyTest.create(data);
    if (!test) return res.status(404).json({ message: "Lab test not found" });
    if (!test.pathologist?.laboratoryName) await test.populate("pathologist");
    res.status(req.params.tid ? 200 : 201).json(test);
};
const deleteTest = async (req, res) => {
    const test = await PathologyTest.findByIdAndDelete(req.params.tid);
    if (!test) return res.status(404).json({ message: "Lab test not found" });
    res.json({ message: "Lab test deleted" });
};
const updateOrder = async (req, res) => {
    const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    const { status } = req.body;
    if (!allowed.includes(status)) return res.status(400).json({ message: "Unsupported order status" });
    const order = await Order.findById(req.params.oid);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "cancelled" && status === "cancelled") await Product.findByIdAndUpdate(order.product, { $inc: { stock: order.quantity } });
    if (order.status === "cancelled" && status !== "cancelled") await Product.findByIdAndUpdate(order.product, { $inc: { stock: -order.quantity } });
    order.status = status; order.timelineStep = status === "delivered" ? 3 : status === "shipped" ? 2 : status === "confirmed" ? 1 : 0;
    await order.save(); await order.populate("user", "name email phone"); await order.populate("product");
    res.json(order);
};
const updateUser = async (req, res) => {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") return res.status(400).json({ message: "isActive must be true or false" });
    const target = await User.findById(req.params.uid);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.userType === "ADMIN") return res.status(403).json({ message: "Admin accounts cannot be changed here" });
    target.isActive = isActive; await target.save();
    const safeUser = target.toObject(); delete safeUser.password;
    res.json(safeUser);
};

export default { getAllUsers, getAllOrders, getAllDoctors, getAllProducts, getAllPathologists, getDashboard, addProduct, updateProduct, deleteProduct, updatePathologist, updateDoctor, getAllTests, saveTest, deleteTest, updateOrder, updateUser };
