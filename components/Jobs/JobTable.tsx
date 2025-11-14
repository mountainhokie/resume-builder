import { fetchFilteredJobs } from "@/lib/actions/fetch/fetchFilteredJobs";
import JobTableRow from "./JobTableRow";

const JobTable = async ({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) => {
  console.log(query, currentPage);
  const jobs = await fetchFilteredJobs(query, currentPage);
  console.log(jobs);

  return (
    <>
      <div className="w-full lg:w-5/6 overflow-auto">
        <div className="bg-white shadow-md rounded my-6">
          <table className="min-w-max w-full table-auto bg-white overflow-auto">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Position</th>
                <th className="py-3 px-6 text-left">Company</th>
                <th className="py-3 px-6 text-center max-sm:hidden">
                  Date Applied
                </th>
                <th className="py-3 px-6 text-center max-sm:hidden">Status</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {jobs &&
                jobs.map((job) => {
                  return <JobTableRow job={job} key={job.id} />;
                })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default JobTable;
