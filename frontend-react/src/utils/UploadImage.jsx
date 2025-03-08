import axiosInstance from "./AxiosInstance";

export const uploadImage = async (file, folder) => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await axiosInstance.post(`api/admin/upload-image/${folder}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.imageUrl; // Returns the uploaded image URL
  } catch (error) {
    console.error("Image upload failed:", error);
    return null;
  }
};
