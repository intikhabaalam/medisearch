import DoctorAppointment from "../../models/doctorAppointmentModel.js"
import Doctor from "../../models/doctorModel.js"
import fs from "node:fs"
import uploadToCloudinary from "../../middleware/cloudinaryMiddleware.js"

const cleanupDoctorUploads = (files = []) => files.forEach(file => {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
});

const becomeDoctor = async (req, res) => {

    let userId = req.user.id

    if (!req.user.isActive || req.user.userType !== "USER") {
        cleanupDoctorUploads(req.files);
        return res.status(403).json({ message: "An active patient account is required to submit a doctor application" });
    }


    let application = req.body.application;
    if (typeof application === "string") {
        try { application = JSON.parse(application); }
        catch { cleanupDoctorUploads(req.files); return res.status(400).json({ message: "Invalid doctor application details" }); }
    }
    application ||= req.body;
    const { clinicName, address, qualification, registrationNumber, experience, specialization, phone, email, consultationFee, workingHours, availableDays } = application;


    const cleanSpecializations = Array.isArray(specialization) ? specialization.map(value => String(value).trim()).filter(Boolean) : String(specialization || "").split(",").map(value => value.trim()).filter(Boolean);
    const cleanDays = Array.isArray(availableDays) ? availableDays : [];
    const cleanExperience = Number(experience);
    const cleanFee = Number(consultationFee);
    if ([clinicName, address, qualification, registrationNumber, phone, email].some(value => typeof value !== "string" || !value.trim()) || !/^\S+@\S+\.\S+$/.test(typeof email === "string" ? email.trim() : "") || cleanSpecializations.length === 0 || !workingHours?.start || !workingHours?.end || cleanDays.length === 0 || cleanDays.some(day => !["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(day)) || !Number.isFinite(cleanExperience) || cleanExperience < 0 || !Number.isFinite(cleanFee) || cleanFee < 0) {
        cleanupDoctorUploads(req.files);
        return res.status(400).json({ message: "Complete all required fields with valid contact, availability, experience and consultation fee" });
    }
    if (!req.files?.length) return res.status(400).json({ message: "Upload at least one professional registration document" });
    let existingApplication;
    try { existingApplication = await Doctor.exists({ user: userId }); }
    catch (error) { cleanupDoctorUploads(req.files); throw error; }
    if (existingApplication) {
        cleanupDoctorUploads(req.files);
        return res.status(409).json({ message: "A doctor application already exists for this account" });
    }
    try {
        const documents = [];
        for (const file of req.files) {
            const uploaded = await uploadToCloudinary(file.path, "medisearch_doctor_documents");
            if (!uploaded?.secure_url) throw Object.assign(new Error("Could not upload professional documents"), { status: 502 });
            documents.push({ name: file.originalname, url: uploaded.secure_url });
        }
        const newDoctor = await Doctor.create({ user: userId, clinicName: clinicName.trim(), address: address.trim(), qualification: qualification.trim(), registrationNumber: registrationNumber.trim().toUpperCase(), experience: cleanExperience, specialization: cleanSpecializations, phone: phone.trim(), email: email.trim().toLowerCase(), consultationFee: cleanFee, workingHours, availableDays: cleanDays, documents, isVerified: false, verificationStatus: "pending" });
        return res.status(201).json(newDoctor);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "A doctor application or registration number already exists" });
        throw error;
    } finally {
        cleanupDoctorUploads(req.files);
    }


}


const getAllAppointments = async (req, res) => {
    const appointments = await DoctorAppointment.find({ doctor: req.doctor._id }).populate('user', 'name email phone').populate('doctor', 'clinicName address qualification specialization workingHours availableDays consultationFee').sort({ createdAt: -1 });
    res.status(200).json(appointments)

}

const getMyDoctorProfile = async (req, res) => {
    const doctor = await Doctor.findById(req.doctor._id).select("+documents").populate("user", "name email phone createdAt");
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });
    res.json(doctor);

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
    if (isAssignedDoctor && (req.user.userType !== "DOCTOR" || !appointment.doctor.isVerified || appointment.doctor.verificationStatus !== "approved" || !appointment.doctor.isActive)) return res.status(403).json({ message: "Approved doctor access required" });
    if (!isAssignedDoctor && req.body.status !== "cancelled") return res.status(403).json({ message: "Patients may only cancel their appointments" });
    if (!["pending", "confirmed", "cancelled"].includes(req.body.status)) return res.status(400).json({ message: "Invalid appointment status" });

    const updatedAppointment = await DoctorAppointment.findByIdAndUpdate(appointmentId, { status: req.body.status }, { new: true }).populate("user", "name email phone").populate('doctor', 'clinicName address qualification specialization workingHours availableDays consultationFee')

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
    if (isAssignedDoctor && (req.user.userType !== "DOCTOR" || !appointment.doctor.isVerified || appointment.doctor.verificationStatus !== "approved" || !appointment.doctor.isActive)) return res.status(403).json({ message: "Approved doctor access required" });
    await appointment.populate("user", "name email phone");

    res.status(200).json(appointment)

}



const getAllDoctors = async (req, res) => {
    const doctors = await Doctor.find({ isVerified: true, isActive: true, verificationStatus: "approved" }).populate('user', 'name email').sort({ createdAt: -1 });
    res.status(200).json(doctors)

}


const bookAppointment = async (req, res) => {

    const userId = req.user.id
    const did = req.params.did

    if (!req.user.isActive || req.user.userType !== "USER") return res.status(403).json({ message: "An active patient account is required to book an appointment" });

    const doctor = await Doctor.findOne({ _id: did, isVerified: true, isActive: true, verificationStatus: "approved" });
    if (!doctor) return res.status(404).json({ message: "Verified doctor not found" });
    const appointment = new DoctorAppointment({ user: userId, doctor: did })

    await appointment.save()
    await appointment.populate("user", "name email phone")
    await appointment.populate('doctor')


    if (!appointment) {
        res.status(409)
        throw new Error("Appointment Not Booked!")
    }

    res.status(201).json(appointment)

}


const doctorController = {
    becomeDoctor,
    getMyDoctorProfile,
    getAllAppointments,
    getMyAppointments,
    getAppointment,
    getAllDoctors,
    updateAppointment,
    bookAppointment
}


export default doctorController
