"use client";
// import { Education, UserFull } from "@/lib/definitions";
import { useActionState, useState } from "react";
import { State } from "@/lib/definitions/state";
import { updateEducation } from "@/lib/actions/update/updateEducation";
import { educationSections } from "@/lib/form-sections/education";
import { UserFull } from "@/lib/definitions/userFull";
import { Education } from "@/lib/definitions/education";
import Field from "../Forms/Field";
import { FaRegCircleXmark } from "react-icons/fa6";

export default function EducationForm({ user }: { user: UserFull }) {
  const initialState: State = { message: null, errors: {} };
  const updateEducationWithId = updateEducation.bind(null, user.id);
  const [, formAction] = useActionState(updateEducationWithId, initialState);

  const [educationEntries, setEducationEntries] = useState<Education[]>(
    user.education || [
      {
        id: "",
        user_id: user.id,
        institution: "",
        location: "",
        start_date: "",
        end_date: "",
        degree: "",
        minor: "",
        diploma_type: "",
      },
    ]
  );

  const handleAdd = () => {
    setEducationEntries((prevEntries) => [
      ...prevEntries,
      {
        id: "",
        user_id: user.id,
        institution: "",
        location: "",
        start_date: "",
        end_date: "",
        degree: "",
        minor: "",
        diploma_type: "",
      },
    ]);
  };

  const handleDelete = (id: string) => {
    console.log("handle delete", id, educationEntries);
    const educationUpdate = educationEntries;
    console.log("eU", educationUpdate);

    let updatedEmpArr = [...educationEntries];
    updatedEmpArr = updatedEmpArr.filter((obj) => obj.id !== id);
    console.log(updatedEmpArr);
    setEducationEntries(updatedEmpArr);
  };

  return (
    <>
      <form
        id="education_form"
        className="md:pt-8 text-black"
        action={formAction}
      >
        {educationEntries.map((entry, index) => (
          <div
            key={entry.id}
            className="education-entry p-3 md:p-6 md:pb-2 mb-4 md:mb-8 md:mr-4 bg-gray-100 rounded-md border-l-[.5rem] border-purple-700"
          >
            <div className="">
              {educationSections.map((section) => (
                <div key={section.sectionId} className="relative">
                  <button
                    className="absolute top-0 right-0"
                    aria-label="Remove Education Item"
                    title="Remove Education Item"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <FaRegCircleXmark className="text-purple-700 hover:text-purple-400 w-6 h-6" />
                  </button>
                  <div className="md:ml-4 text-gray-400 text-sm mt-3 mb-6 font-lustria font-bold uppercase">
                    {section.heading} {index + 1}
                  </div>
                  <div className="flex flex-wrap md:ml-4">
                    {section.fields.map((field) => (
                      <Field
                        field={field}
                        value={entry[field.id as keyof Education]}
                        key={field.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="md:flex md:space-between md:items-center mr-4 mb-8">
          <div className="w-full">
            <button
              type="button"
              id="submitBtn"
              className="flex-1 py-2 px-4 border border-transparent focus:outline-none rounded-md text-center text-white bg-green-400 hover:bg-white hover:text-green-400 duration-300 transition-all"
              onClick={handleAdd}
            >
              + Add
            </button>
          </div>
          <div className="w-full text-right">
            <input
              type="submit"
              className="flex-1 py-2 px-4 rounded cursor-pointer bg-purple-700 text-white hover:bg-white hover:text-purple-700 duration-300 transition-all"
            />
          </div>
        </div>
      </form>
    </>
  );
}
