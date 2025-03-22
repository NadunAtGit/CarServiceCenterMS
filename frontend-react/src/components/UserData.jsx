import React from 'react'
import user from "../assets/user.jpg"

const UserData = ({ username,role,imgUrl }) => {
  
  return (
    <div className='flex flex-col  items-center justify-center mt-8'>
            <div className='w-40 h-40 rounded-full border-5 border-white my-4 overflow-hidden'>
                <img src={imgUrl}  className='w-full h-full object-cover' alt="User profile"/>
            </div>

    <div className="flex flex-col items-center py-2">
        <h2 className="text-white font-semibold">{username}</h2>
        <p className="text-gray-400">{role}</p>
      </div>
    </div>
  )
}

export default UserData