import DoctorAppointment from "../../models/doctorAppointmentModel.js"
import Doctor from "../../models/doctorModel.js"
import User from "../../models/userModel.js"

const becomeDoctor = async (req, res) => {

    let userId = req.user.id


    const { clinicName, address, qualification, registrationNumber, experience, specialization, phone, email, consultationFee, workingHours, availableDays } = req.body


    const cleanSpecializations = Array.isArray(specialization) ? specialization.map(value => String(value).trim()).filter(Boolean) : String(specialization || "").split(",").map(value => value.trim()).filter(Boolean);
    const cleanDays = Array.isArray(availableDays) ? availableDays : [];
    const cleanExperience = Number(experience);
    const cleanFee = Number(consultationFee);
    if (!clinicName?.trim() || !address?.trim() || !qualification?.trim() || !registrationNumber?.trim() || !phone?.trim() || !email?.trim() || cleanSpecializations.length === 0 || !workingHours?.start || !workingHours?.end || cleanDays.length === 0 || !Number.isFinite(cleanExperience) || cleanExperience < 0 || !Number.isFinite(cleanFee) || cleanFee < 0) return res.status(400).json({ message: "Complete all required fields with valid experience and consultation fee" });
    if (await Doctor.exists({ user: userId })) return res.status(409).json({ message: "A doctor application already exists for this account" });
    try {
        const newDoctor = await Doctor.create({ user: userId, clinicName: clinicName.trim(), address: address.trim(), qualification: qualification.trim(), registrationNumber: registrationNumber.trim(), experience: cleanExperience, specialization: cleanSpecializations, phone: phone.trim(), email: email.trim().toLowerCase(), consultationFee: cleanFee, workingHours, availableDays: cleanDays, isVerified: false });
        return res.status(201).json(newDoctor);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "A doctor application or registration number already exists" });
        throw error;
    }


}


const getAllAppointments = async (req, res) => {

    const userId = req.user.id

    const user = await User.findById(userId)


    if (!user) {
        res.status(404)
        throw new Error("No User Found!")
    }

    if (user.userType !== "DOCTOR") {
        res.status(401)
        throw new Error("You Are Not Doctor")
    }

    const doctor = await Doctor.findOne({ user: user._id })
    const appointments = await DoctorAppointment.find({ doctor: doctor._id }).populate('user')

    if (!appointments) {
        res.status(404)
        throw new Error("No Appointment Found!")
    }

    res.status(200).json(appointments)

}

const getMyAppointments = async (req, res) => {
    const appointments = await DoctorAppointment.find({ user: req.user._id }).populate({ path: "doctor", populate: { path: "user", select: "name email" } }).sort({ createdAt: -1 });
    res.status(200).json(appointments);
}



const updateAppointment = async (req, res) => {
    const appointmentId = req.params.aid

    const appointment = await DoctorAppointment.findById(appointmentId).populate("doctor");

    if (!appointment) {
        res.status(404)
        throw new Error("Appointment Does Not Exist")
    }

    const isOwner = appointment.user.toString() === req.user._id.toString();
    const isAssignedDoctor = appointment.doctor?.user?.toString() === req.user._id.toString();
    if (!isOwner && !isAssignedDoctor) return res.status(403).json({ message: "You cannot update this appointment" });
    if (!isAssignedDoctor && req.body.status !== "cancelled") return res.status(403).json({ message: "Patients may only cancel their appointments" });
    if (!["pending", "confirmed", "cancelled"].includes(req.body.status)) return res.status(400).json({ message: "Invalid appointment status" });

    const updatedAppointment = await DoctorAppointment.findByIdAndUpdate(appointmentId, { status: req.body.status }, { new: true }).populate("user").populate('doctor')

    if (!updatedAppointment) {
        res.status(409)
        throw new Error("Appointment Not Updated")
    }

    res.status(200).json(updatedAppointment)


}

const getAppointment = async (req, res) => {
    const appointmentId = req.params.aid
    const appointment = await DoctorAppointment.findById(appointmentId).populate('doctor')

    if (!appointment) {
        res.status(404)
        throw new Error("Appointment Does Not Exist")
    }

    const isOwner = appointment.user.toString() === req.user._id.toString();
    const isAssignedDoctor = appointment.doctor?.user?.toString() === req.user._id.toString();
    if (!isOwner && !isAssignedDoctor) return res.status(403).json({ message: "You cannot view this appointment" });
    await appointment.populate("user", "name email");

    res.status(200).json(appointment)

}



const getAllDoctors = async (req, res) => {
    const doctors = await Doctor.find({ isVerified: true, isActive: true, verificationStatus: { $ne: "rejected" } }).populate('user', 'name email').sort({ createdAt: -1 });
    res.status(200).json(doctors)

}


const bookAppointment = async (req, res) => {

    const userId = req.user.id
    const did = req.params.did

    const doctor = await Doctor.findOne({ _id: did, isVerified: true, isActive: true });
    if (!doctor) return res.status(404).json({ message: "Verified doctor not found" });
    const appointment = new DoctorAppointment({ user: userId, doctor: did })

    await appointment.save()
    await appointment.populate("user")
    await appointment.populate('doctor')


    if (!appointment) {
        res.status(409)
        throw new Error("Appointment Not Booked!")
    }

    res.status(201).json(appointment)

}


const doctorController = {
    becomeDoctor,
    getAllAppointments,
    getMyAppointments,
    getAppointment,
    getAllDoctors,
    updateAppointment,
    bookAppointment
}


export default doctorController
