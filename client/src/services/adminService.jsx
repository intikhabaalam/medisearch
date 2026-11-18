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



const adminService = {
    fetchAllAdminData,
    createProduct
}


export default adminService