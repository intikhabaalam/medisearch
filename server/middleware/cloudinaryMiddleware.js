import { v2 as cloudinary } from 'cloudinary';
import "dotenv/config";

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dqdejbfnx',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (filePath, folder = "medisearch_prescriptions") => {
    try {
        const uploadResult = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
            folder
        });
        return uploadResult;
    } catch (error) {
        console.error("Cloudinary upload error:", error.message || error);
        return null;
    }
};

export default uploadToCloudinary;
