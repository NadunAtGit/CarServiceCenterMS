import React, { useState, useRef, useEffect } from "react";
import { FaRegFileImage } from "react-icons/fa6";
import { MdOutlineDelete } from "react-icons/md";

const ImageSelector = ({ image, setImage }) => {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const onChooseFile = () => {
    inputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
  };

  useEffect(() => {
    if (typeof image === "string") {
      setPreviewUrl(image); // Image is a URL
    } else if (image instanceof File) {
      const fileUrl = URL.createObjectURL(image);
      setPreviewUrl(fileUrl);
      return () => URL.revokeObjectURL(fileUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [image]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        onChange={handleImageChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative w-full flex justify-center">
          <img src={previewUrl} alt="Preview" className="w-30 h-30 object-cover rounded-full shadow-md" />
          <button
            className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md hover:bg-red-500 hover:text-white"
            onClick={handleRemoveImage}
          >
            <MdOutlineDelete className="text-xl" />
          </button>
        </div>
      ) : (
        <button
          className="flex flex-col items-center gap-2 p-4 border-dashed border-2 border-red-500 rounded-full hover:bg-cyan-50 w-30 h-30"
          onClick={onChooseFile}
        >
          <FaRegFileImage className="text-3xl text-red-500" />
          <p className="text-sm text-slate-500">Browse image files to upload</p>
        </button>
      )}
    </div>
  );
};

export default ImageSelector;
