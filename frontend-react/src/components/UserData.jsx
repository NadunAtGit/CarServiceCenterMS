import React from 'react'
import user from "../assets/user.jpg"

const UserData = ({ username,role,imgUrl }) => {
  
  return (
    <div className='flex flex-col  items-center justify-center mt-5'>
            <div className='w-30 h-30 rounded-full border-5 border-[#944ef8] my-1 overflow-hidden'>
                <img
  src={imgUrl || 'https://www.greaterkashmir.com/wp-content/uploads/2024/06/Rohit-Sharma.jpg'}
  className="w-full h-full object-cover"
/>
            </div>

    <div className="flex flex-col items-center py-2">
        <h2 className="text-black font-semibold">{username}</h2>
        <p className="text-gray-400">{role}</p>
      </div>
    </div>
  )
}

export default UserData