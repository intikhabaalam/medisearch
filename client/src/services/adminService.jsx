import axios from "axios"

const fetchAllAdminData = async (payload) => {

    const options = {
        headers: {
            authorization: `Bearer ${payload}`
        }
    }

    const [
        responseForUsers,
        responseForProducts,
        responseForPathologists,
        responseForOrders,
        responseForDoctors
    ] = await Promise.all([
        axios.get("/api/admin/users", options),
        axios.get("/api/admin/products", options),
        axios.get("/api/admin/pathologists", options),
        axios.get("/api/admin/orders", options),
        axios.get("/api/admin/doctors", options)
    ])

    const data = {
        users: responseForUsers.data,
        products: responseForProducts.data,
        pathologists: responseForPathologists.data,
        orders: responseForOrders.data,
        doctors: responseForDoctors.data
    }



    return data

}
const headers = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const getDashboard = async (token) => (await axios.get("/api/admin/dashboard", headers(token))).data;
const getTests = async (token) => (await axios.get("/api/admin/tests", headers(token))).data;
const saveTest = async (test, token, id) => (await axios({ method: id ? "put" : "post", url: `/api/admin/tests${id ? `/${id}` : ""}`, data: test, ...headers(token) })).data;
const deleteTest = async (id, token) => (await axios.delete(`/api/admin/tests/${id}`, headers(token))).data;
const updatePathologist = async (id, isVerified, token) => (await axios.put(`/api/admin/pathologists/${id}`, { isVerified }, headers(token))).data;
const updateOrder = async (id, status, token) => (await axios.put(`/api/admin/orders/${id}`, { status }, headers(token))).data;
const updateUser = async (id, isActive, token) => (await axios.put(`/api/admin/users/${id}`, { isActive }, headers(token))).data;
const updateProduct = async (id, payload, token) => (await axios.put(`/api/admin/product/${id}`, payload, headers(token))).data;
const deleteProduct = async (id, token) => (await axios.delete(`/api/admin/product/${id}`, headers(token))).data;


const createProduct = async (productData, token) => {
    const response = await axios.post(
        "/api/admin/product",
        productData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
}

const updateDoctor = async (doctorId, isVerified, token) => {
    const response = await axios.put(
        `/api/admin/doctor/${doctorId}`,
        { isVerified },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
};



const adminService = {
    fetchAllAdminData,
    createProduct,
    updateDoctor
    ,getDashboard, getTests, saveTest, deleteTest, updatePathologist, updateOrder, updateUser, updateProduct, deleteProduct

}


export default adminService
