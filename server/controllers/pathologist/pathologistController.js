import Pathologist from "../../models/pathologistModel.js"
import PathologyAppointment from "../../models/pathologyAppointmentModel.js"
import PathologyTest from "../../models/pathologyTestModel.js"
import User from "../../models/userModel.js"

const becomePathologist = async (req, res) => {

    let userId = req.user.id


    const { laboratoryName, laboratoryAddress, qualification, registrationNumber, experience, specialization, phone, email, consultationFee, workingHours, availableDays } = req.body

    const cleanSpecializations = Array.isArray(specialization) ? specialization.map(value => String(value).trim()).filter(Boolean) : String(specialization || "").split(",").map(value => value.trim()).filter(Boolean);
    const cleanDays = Array.isArray(availableDays) ? availableDays : [];
    const cleanExperience = Number(experience);
    if (!laboratoryName?.trim() || !laboratoryAddress?.trim() || !qualification?.trim() || !registrationNumber?.trim() || !phone?.trim() || !email?.trim() || cleanSpecializations.length === 0 || !workingHours?.start || !workingHours?.end || cleanDays.length === 0 || !Number.isFinite(cleanExperience) || cleanExperience < 0) return res.status(400).json({ message: "Complete all required fields with valid experience" });
    if (await Pathologist.exists({ user: userId })) return res.status(409).json({ message: "A pathology lab application already exists for this account" });
    try {
        const newPathologist = await Pathologist.create({ user: userId, laboratoryName: laboratoryName.trim(), laboratoryAddress: laboratoryAddress.trim(), qualification: qualification.trim(), registrationNumber: registrationNumber.trim(), experience: cleanExperience, specialization: cleanSpecializations, phone: phone.trim(), email: email.trim().toLowerCase(), consultationFee: Number(consultationFee) || 0, workingHours, availableDays: cleanDays, isVerified: false });
        return res.status(201).json(newPathologist);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "A pathology lab application or registration number already exists" });
        throw error;
    }


}



const addPathologyTest = async (req, res) => {

    const userId = req.user.id

    const user = await User.findById(userId)


    if (!user) {
        res.status(404)
        throw new Error("No User Found!")
    }

    if (user.userType !== "PATHOLOGIST") {
        res.status(401)
        throw new Error("You Are Not Pathologist")
    }

    const pathologist = await Pathologist.findOne({ user: user._id, isVerified: true, isActive: true })
    if (!pathologist) return res.status(403).json({ message: "Your laboratory must be verified before adding tests" });


    const { title, description, price } = req.body

    if (!title || !description || price === undefined || price === null) {
        res.status(409)
        throw new Error("Please Fill All Details!")
    }

    const pathologyTest = await PathologyTest.create({ pathologist: pathologist._id, title, description, price })

    if (!pathologyTest) {
        res.status(409)
        throw new Error("Pathology Test Not Added!")
    }


    res.status(201).json(pathologyTest)

}


const getAllAppointments = async (req, res) => {

    const userId = req.user.id

    const user = await User.findById(userId)


    if (!user) {
        res.status(404)
        throw new Error("No User Found!")
    }

    if (user.userType !== "PATHOLOGIST") {
        res.status(401)
        throw new Error("You Are Not Pathologist")
    }

    const pathologist = await Pathologist.findOne({ user: user._id })
    const appointments = await PathologyAppointment.find({ pathologist: pathologist._id })

    if (!appointments) {
        res.status(404)
        throw new Error("No Appointment Found!")
    }

    res.status(200).json(appointments)

}

const getMyAppointments = async (req, res) => {
    const appointments = await PathologyAppointment.find({ user: req.user._id }).populate("pathologist", "laboratoryName laboratoryAddress phone email").populate("pathologyTest").sort({ createdAt: -1 });
    res.status(200).json(appointments);
}


const updateAppointment = async (req, res) => {
    const appointmentId = req.params.aid

    const appointment = await PathologyAppointment.findById(appointmentId)

    if (!appointment) {
        res.status(404)
        throw new Error("Appointment Does Not Exist")
    }

    const isOwner = appointment.user.toString() === req.user._id.toString();
    const lab = await Pathologist.findOne({ _id: appointment.pathologist, user: req.user._id });
    if (!isOwner && !lab) return res.status(403).json({ message: "You cannot update this appointment" });
    if (isOwner && req.body.status !== "cancelled") return res.status(403).json({ message: "Patients may only cancel their lab bookings" });
    if (!["pending", "delivered", "cancelled"].includes(req.body.status)) return res.status(400).json({ message: "Invalid appointment status" });

    const updatedAppointment = await PathologyAppointment.findByIdAndUpdate(appointmentId, { status: req.body.status }, { new: true })

    if (!updatedAppointment) {
        res.status(409)
        throw new Error("Appointment Not Updated")
    }

    res.status(200).json(updatedAppointment)


}

const getAppointment = async (req, res) => {
    const appointmentId = req.params.aid
    const appointment = await PathologyAppointment.findById(appointmentId).populate('user').populate('pathologist').populate('pathologyTest')

    if (!appointment) {
        res.status(404)
        throw new Error("Appointment Does Not Exist")
    }

    res.status(200).json(appointment)

}



const getAllPathologyTests = async (req, res) => {
    const tests = await PathologyTest.find({ isAvailable: { $ne: false } }).populate({ path: 'pathologist', match: { isVerified: true, isActive: true } }).sort({ createdAt: -1 });
    const visibleTests = tests.filter(test => test.pathologist);
    res.status(200).json(visibleTests)

}
const getAllPathologists = async (req, res) => {
    const pathologists = await Pathologist.find({ isActive: true, $or: [{ verificationStatus: "approved", isVerified: true }, { verificationStatus: { $exists: false }, isVerified: true }] }).populate('user', 'name email').sort({ createdAt: -1 });
    res.status(200).json(pathologists)

}




const bookTest = async (req, res) => {

    const userId = req.user.id
    const pid = req.params.pid
    const { pathologyTest } = req.body


    const lab = await Pathologist.findOne({ _id: pid, isVerified: true, isActive: true });
    if (!lab) return res.status(404).json({ message: "Verified pathology lab not found" });
    const test = await PathologyTest.findOne({ _id: pathologyTest, pathologist: pid, isAvailable: { $ne: false } });
    if (!test) return res.status(404).json({ message: "Available lab test not found for this laboratory" });

    const testBooking = new PathologyAppointment({ user: userId, pathologist: pid, pathologyTest: pathologyTest })

    await testBooking.save()
    await testBooking.populate("user")
    await testBooking.populate('pathologist')
    await testBooking.populate('pathologyTest')

    if (!testBooking) {
        res.status(409)
        throw new Error("Patholgy Test Not Booked!")
    }

    res.status(201).json(testBooking)

}






const pathologistController = { becomePathologist, addPathologyTest, bookTest, getAllAppointments, getMyAppointments, updateAppointment, getAppointment, getAllPathologyTests, getAllPathologists }

export default pathologistController
