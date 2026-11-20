import axios from "axios"


const authHeaders = (token) => (
    token
        ? { headers: { authorization: `Bearer ${token}` } }
        : {}
)

const fetchData = async () => {
    const responseForMedicines = await axios.get("/api/products")
    const responseForDoctors = await axios.get("/api/doctor")
    const responseForPathologists = await axios.get("/api/pathologist")
    const responseForTests = await axios.get("/api/pathologist/tests")
    let medicines = responseForMedicines.data
    let doctors = responseForDoctors.data
    let pathologists = responseForPathologists.data
    let tests = responseForTests.data
    return {
        medicines: medicines,
        doctors: doctors,
        pathologists: pathologists,
        tests: tests
    }

}

const getDoctors = async () => (await axios.get("/api/doctor")).data;

const searchMedicines = async (query) => {
    const response = await axios.get("/api/products/search", {
        params: { q: query || "" }
    })
    return response.data
}

const getProductById = async (id) => {
    const response = await axios.get(`/api/products/${encodeURIComponent(id)}`)
    return response.data
}

const createOrder = async ({ productId, quantity, token }) => {
    const response = await axios.post(
        "/api/orders",
        { productId, quantity },
        authHeaders(token)
    )
    return response.data
}

const getMyOrders = async (token) => {
    const response = await axios.get("/api/orders", authHeaders(token))
    return response.data
}
const getMyDoctorAppointments = async (token) => (await axios.get("/api/doctor/my-appointments", authHeaders(token))).data;
const getDoctorAppointments = async (token) => (await axios.get("/api/doctor/appointments", authHeaders(token))).data;
const updateDoctorAppointment = async ({ token, id, status }) => (await axios.put(`/api/doctor/appointments/${id}`, { status }, authHeaders(token))).data;
const getMyLabAppointments = async (token) => (await axios.get("/api/pathologist/my-appointments", authHeaders(token))).data;

const medicalService = {
    fetchData,
    getDoctors,
    searchMedicines,
    getProductById,
    createOrder,
    getMyOrders
    ,getMyDoctorAppointments, getMyLabAppointments, getDoctorAppointments, updateDoctorAppointment
}

export default medicalService
