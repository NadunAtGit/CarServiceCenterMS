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
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-24 h-24 object-cover rounded-full shadow-md border-2 border-[#944EF8]/30"
          />
          <button
            className="absolute top-0 right-1/4 bg-white/80 p-1 rounded-full shadow-md hover:bg-red-500 hover:text-white transition-all duration-300 backdrop-blur-sm border border-[#944EF8]/20"
            onClick={handleRemoveImage}
          >
            <MdOutlineDelete className="text-xl text-red-500 hover:text-white" />
          </button>
        </div>
      ) : (
        <button
          className="flex flex-col items-center justify-center gap-2 p-4 border-dashed border-2 border-[#944EF8] rounded-full hover:bg-[#944EF8]/5 w-24 h-24 transition-all duration-300 backdrop-blur-sm bg-white/50"
          onClick={onChooseFile}
        >
          <FaRegFileImage className="text-3xl text-[#944EF8]" />
          <p className="text-xs text-gray-600">Upload image</p>
        </button>
      )}
    </div>
  );
};

export default ImageSelector;