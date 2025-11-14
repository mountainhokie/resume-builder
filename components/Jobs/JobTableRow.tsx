import { deleteJob } from "@/lib/actions/delete/deleteJob";
import { QueryResultRow } from "@vercel/postgres";
import Link from "next/link";

const JobTableRow = ({ job }: { job: QueryResultRow }) => {
  const deleteJobWithId = deleteJob.bind(null, job.id);
  return (
    <>
      <tr className="border-b border-gray-200 hover:bg-gray-100">
        <td className="py-3 px-6 text-left whitespace-nowrap">
          {job.job_title}
        </td>
        <td className="py-3 px-6 text-left">{job.company}</td>

        <td className="py-3 px-6 text-center max-sm:hidden">
          {new Date(job.date_applied).toLocaleDateString()}
        </td>
        <td className="py-3 px-6 text-center max-sm:hidden">
          {/* SWITCH TO CLSX? */}
          <span
            className={`${
              job.status === "Applied" ? "bg-purple-200 text-purple-600" : ""
            } ${job.status === "Rejected" ? "bg-red-500 text-white" : ""}  ${
              job.status === "Interview" ? "bg-green-500 text-white" : ""
            } py-1 px-3 rounded-full text-xs`}
          >
            {job.status}
          </span>
        </td>
        <td className="py-3 px-6 text-center">
          <div className="flex item-center justify-center">
            <Link
              href={`jobs/${job.id}/edit`}
              className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </Link>
            {/* CREATE A SERVER ACTION FOR DELETE  */}
            <form action={deleteJobWithId}>
              <input name="job_id" className="hidden" value={job.id} readOnly />
              <button
                type="submit"
                className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </form>
            <Link href={`create-cover-letter/${job.id}`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                className="w-4 h-4  transform hover:text-purple-500 hover:scale-110"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="M13 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V9M13 3L19 9M13 3V8C13 8.55228 13.4477 9 14 9H19M9 13H15M9 17H15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </g>
              </svg>
            </Link>
          </div>
        </td>
      </tr>
    </>
  );
};

export default JobTableRow;
