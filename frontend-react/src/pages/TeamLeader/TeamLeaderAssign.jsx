import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/AxiosInstance";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import AssignWorkerCard from "../../components/Cards/AssignWorkerCard";

const TeamLeaderAssign = () => {
  const [jobCards, setJobCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotAssigned = async () => {
    try {
      const response = await axiosInstance.get("api/teamleader/get-job-cards");

      if (response.data.success) {
        setJobCards(response.data.jobCards); // Correctly setting jobCards
      } else {
        console.error("Failed to fetch job cards:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching job cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotAssigned();
  }, []);

  const settings = {
    dots: true,
    infinite: jobCards.length > 1,
    speed: 500,
    slidesToShow: Math.min(jobCards.length, 3),
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    dotsClass: "slick-dots",
    centerMode: true,
    centerPadding: "0px",
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(jobCards.length, 2),
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className="mx-auto">
      <div className="w-full flex justify-center flex-col">
        <h1 className="text-xl font-bold mb-5 text-left">Not Assigned Job Cards</h1>

        {isLoading ? (
          <p className="text-center">Loading job cards...</p>
        ) : jobCards.length > 0 ? (
          <Slider {...settings} className="w-full max-w-4xl mx-auto">
                {jobCards.map((job) => (
                  <div key={job.JobCardID} className="p-4">
                        <AssignWorkerCard 
                          job={job} 
                          onAssign={(job) => console.log("Assigning", job)} // Pass any necessary logic here for assigning
                        />
                  </div>

                ))}
          </Slider>
        ) : (
          <p className="text-center text-gray-500">No job cards found.</p>
        )}
      </div>
    </div>
  );
};

export default TeamLeaderAssign;
