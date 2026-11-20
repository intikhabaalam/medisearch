import jwt from "jsonwebtoken"
import User from "../models/userModel.js"
import Doctor from "../models/doctorModel.js"


const forUser = async (req, res, next) => {

    try {
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            let token = req.headers.authorization.split(" ")[1]
            let decoded = jwt.verify(token, process.env.JWT_SECRET)
            let user = await User.findById(decoded.id)

            if (!user || !user.isActive) {
                res.status(404)
                throw new Error("Invalid or inactive user!")
            }

            // Added user to req object
            req.user = user
            next()
        } else {
            throw new Error("No Token Found!")
        }
    } catch (error) {
        res.status(401)
        throw new Error(error.message)
    }



}


const forAdmin = async (req, res, next) => {

    try {
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            let token = req.headers.authorization.split(" ")[1]
            let decoded = jwt.verify(token, process.env.JWT_SECRET)
            let user = await User.findById(decoded.id)

            if (!user || !user.isActive) {
                res.status(404)
                throw new Error("Invalid or inactive user!")
            }

            // Added user to req object
            req.user = user

            if (user.userType === "ADMIN") {
                next()
            } else {
                res.status(401)
                throw new Error("Only Admin Access")
            }

        } else {
            throw new Error("No Token Found!")
        }
    } catch (error) {
        res.status(401)
        throw new Error(error.message)
    }



}

const forDoctor = async (req, res, next) => {
    try {
        if (!req.headers.authorization?.startsWith("Bearer ")) return res.status(401).json({ message: "Authentication required" });
        const decoded = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.userType !== "DOCTOR" || !user.isActive) return res.status(403).json({ message: "Approved doctor access required" });
        const doctor = await Doctor.findOne({ user: user._id, isVerified: true, verificationStatus: "approved", isActive: true });
        if (!doctor) return res.status(403).json({ message: "Approved doctor profile not found" });
        req.user = user;
        req.doctor = doctor;
        next();
    } catch (error) {
        res.status(401).json({ message: error.message || "Invalid authentication token" });
    }
}


const protect = {
    forUser,
    forAdmin,
    forDoctor
}


export default protect
