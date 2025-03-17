import React, { useState, useEffect } from 'react';
import { FiSearch } from "react-icons/fi";
import { AiOutlineInfoCircle, AiOutlineDelete } from "react-icons/ai";
import { FiRefreshCcw } from "react-icons/fi";
import {FiPlus } from "react-icons/fi";
import axiosInstance from '../../utils/AxiosInstance';
import Modal from "react-modal";

const ServiceAdvisorJobCards = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allJobCards, setAllJobcards] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  // const [selectedRole, setSelectedRole] = useState(""); 

  const [openAddModal, setOpenAddModal] = useState({
      isShown: false,
      data: null,
    });
  
    const onCloseAdd = () => {
      setOpenAddModal({ isShown: false, data: null });
      
    };

    const getJobCards = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("api/teamleader/get-job-cards");
        if (response.data.success) {
          setAllJobcards(response.data.jobCards);
        } else {
          console.error("Failed to fetch job cards:", response.data.message);
        }
      } catch (error) {
        console.error("Error fetching job cards:", error);
      }
      setIsLoading(false);
    };

    useEffect(() => {
        getJobCards();
      }, []);
  return (
    <>
      <div className='mx-auto container w-full sm:overflow-hidden'>
        <div className='w-full flex flex-col justify-center'>
              <h1 className="text-xl font-bold mb-3">Employees Data</h1>

              <div className="w-full flex flex-row gap-3 my-5">
                        <input
                          type="text"
                          placeholder="Search by vehicle, date, or Type"
                          className="w-full outline-none border-b-2 border-gray-400 py-2 px-4"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                          className={`flex items-center gap-2 border-blue-300 border-3 p-2 rounded-2xl text-white bg-blue-500 ${
                            isLoading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          
                        >
                          <FiSearch size={22} />
                          {isLoading ? "Loading..." : "Search"}
                        </button>
              
                        
              </div>

              <tbody>
                            {allJobCards.length > 0 ? (
                              allJobCards.map((jobcard) => (
                                <tr key={jobcard.JobCardID} className="border-b">
                                  <td className="py-3 px-4">{jobcard.JobCardID}</td>
                                  <td className="py-3 px-4">{jobcard.Type}</td>
                                  <td className="py-3 px-4">{jobcard.AppointmentID}</td>
                                  <td className="py-3 px-4">{jobcard.Status}</td>
                                  <td className="py-3 px-4 text-center">{jobcard.ServiceDetails}</td>
                                  <td className="py-3 px-4 flex gap-3">
                                    <AiOutlineInfoCircle className="text-blue-500 cursor-pointer" size={22} />
                                    <FiRefreshCcw className="text-yellow-500 cursor-pointer" size={22} />
                                    <AiOutlineDelete
                                      className="text-red-500 cursor-pointer"
                                      size={22}
                                      
                                    />
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="7" className="text-center py-4">
                                  No Jobcards found.
                                </td>
                              </tr>
                            )}
                          </tbody>


              <div className='fixed bottom-10 right-20 w-16 h-16 bg-blue-500 flex items-center justify-center rounded-full   shadow-lg 
                           border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white transition-all duration-300 cursor-pointer' 
                           onClick={() => setOpenAddModal({ isShown: true, data: null })}
                        >
                                <FiPlus size={40} color='white'/>
              </div>
        </div>
      </div>
    </>
  )
}

export default ServiceAdvisorJobCards