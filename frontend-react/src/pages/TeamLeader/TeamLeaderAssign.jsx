import React, { useEffect, useState } from "react";
import axiosInstance from "../../utils/AxiosInstance";
import AssignWorkerCard from "../../components/Cards/AssignWorkerCard";

const TeamLeaderAssign = () => {
  const [jobCards, setJobCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotAssigned = async () => {
    try {
      const response = await axiosInstance.get("api/teamleader/get-job-cards");

      if (response.data.success) {
        setJobCards(response.data.jobCards);
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

  return (
    <div className="mx-auto px-4">
      <div className="w-full flex flex-col">
        <h1 className="text-xl font-bold mb-5 text-left">Not Assigned Job Cards</h1>

        {isLoading ? (
          <p className="text-center">Loading job cards...</p>
        ) : jobCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobCards.map((job) => (
              <AssignWorkerCard
                key={job.JobCardID}
                job={job}
                onAssign={(job) => console.log("Assigning", job)}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No job cards found.</p>
        )}
      </div>
    </div>
  );
};

export default TeamLeaderAssign;
