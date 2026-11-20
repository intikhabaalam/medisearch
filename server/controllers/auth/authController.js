import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../../models/userModel.js"

const registerUser = async (req, res) => {

    // Check if all fileds are coming
    const { name, email, phone, password } = req.body

    if (!name || !email || !phone || !password) {
        res.status(409)
        throw new Error("Please fill all details!!!")
    }


    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    if (password.length < 8) {
        res.status(400)
        throw new Error("Password must be at least 8 characters")
    }

    // Check if user exists using the normalized values that are stored.
    const emailExist = await User.findOne({ email: normalizedEmail })
    const phoneExist = await User.findOne({ phone: normalizedPhone })


    if (emailExist || phoneExist) {
        res.status(409)
        throw new Error("User Already Exists!")
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);


    const user = await User.create({ name: name.trim(), email: normalizedEmail, phone: normalizedPhone, password: hashedPassword })

    if (!user) {
        res.status(409)
        throw new Error("User Not Registered!")
    }


    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        createdAt: user.createdAt,
        token: generateToken(user._id),
        message: "Account successfully created"
    })
}

const loginUser = async (req, res) => {

    // Check if all fileds are coming
    const { email, password } = req.body

    if (!email || !password) {
        res.status(409)
        throw new Error("Please fill all details!!!")
    }

    // Check if user exists
    const user = await User.findOne({ email: email.trim().toLowerCase() })

    if (user?.isActive && await bcrypt.compare(password, user.password)) {
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            userType: user.userType,
            createdAt: user.createdAt,
            token: generateToken(user._id)
        })
    } else {
        res.status(401)
        throw new Error("Invalid Credentials")
    }

}


const getMyProfile = async (req, res) => {
    res.status(200).json(req.user)
}


const updateProfile = async (req, res) => {
    let user = await User.findById(req.user.id)

    if (!user) {
        res.status(404)
        throw new Error("No User Found!")
    }

    const allowedFields = ["name", "email", "phone", "address"];
    if (Object.keys(req.body).some(field => !allowedFields.includes(field))) return res.status(400).json({ message: "Only name, email, phone and address can be updated" });
    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] === undefined) continue;
        if (typeof req.body[field] !== "string" || (field !== "address" && !req.body[field].trim())) return res.status(400).json({ message: `${field} must be a non-empty string` });
        updates[field] = req.body[field].trim();
    }
    if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide at least one profile field to update" });
    if (updates.email) {
        updates.email = updates.email.toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(updates.email)) return res.status(400).json({ message: "Enter a valid email address" });
        if (await User.exists({ email: updates.email, _id: { $ne: user._id } })) return res.status(409).json({ message: "Email address is already in use" });
    }
    if (updates.phone && await User.exists({ phone: updates.phone, _id: { $ne: user._id } })) return res.status(409).json({ message: "Phone number is already in use" });

    user.set(updates);
    const updatedUser = await user.save();

    if (!updatedUser) {
        res.status(409)
        throw new Error("User Not Updated!")
    }

    const safeUser = updatedUser.toObject();
    delete safeUser.password;
    res.status(200).json(safeUser)
}






const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '10d' })
}



const authService = {
    registerUser,
    loginUser,
    getMyProfile,
    updateProfile
}

export default authService
