"use client";
import { User } from "@/lib/definitions/user";
import { JobSections } from "@/lib/form-sections/job";
import { useState } from "react";
import Field from "../Forms/Field";
import { JobDetails } from "@/lib/definitions/job";
import { createJob } from "@/lib/actions/create/createJob";

const defaultJob = {
  user_id: "",
  job_title: "",
  company: "",
  location: "",
  skills: "",
  description: "",
  requirements: "",
  responsibilities: "",
  benefits: "",
  pay: "",
};

const JobForm = ({ user }: { user: User }) => {
  console.log(user);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobDetails, setJobDetails] = useState<JobDetails>(defaultJob);

  const handleSubmit = () => {
    console.log("Submitting...");
  };

  return (
    <>
      <form action={createJob} className="md:pt-8">
        <input type="hidden" name="user_id" defaultValue={user.id} />
        <div className={`w-full px-1 md:px-4 mb-4`}>
          {/* <div className="relative w-full mb-3">
            <label
              className="block uppercase text-gray-600 text-xs font-bold mb-2"
              htmlFor="job_url"
            >
              Job URL
            </label>
            <input
              type="text"
              className="border-0 px-1 md:px-3 py-2 md:py-3 placeholder-gray-300 text-gray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
              placeholder="Job URL"
              id="job-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div> */}

          {JobSections.map((section) => (
            <div
              className=" p-3 md:p-6 md:pb-2 mb-4 md:mb-8 md:mr-4 bg-gray-100 rounded-md border-l-[.5rem] border-purple-700"
              key={section.sectionId}
            >
              <div className="md:ml-4 text-gray-400 text-sm mt-3 mb-6 font-lustria font-bold uppercase">
                {section.heading}
              </div>
              <div className="flex flex-wrap md:ml-4">
                {section.fields.map((field) => (
                  <Field
                    field={field}
                    // value={jobDetails.title}
                    value={jobDetails[field.id as keyof JobDetails]}
                    key={field.id}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="w-full pb-8">
            <input
              type="submit"
              className="py-2 px-4 rounded cursor-pointer bg-purple-700 text-white hover:bg-white hover:text-purple-700 duration-300 transition-all"
              value={saving ? "Saving..." : "Save Job"}
            />
          </div>
        </div>
      </form>
    </>
  );
};

export default JobForm;
