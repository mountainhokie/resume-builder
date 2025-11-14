"use client";
import { useActionState, useState } from "react";
import { Employment } from "@/lib/definitions/employment";
import { State } from "@/lib/definitions/state";
import { UserFull } from "@/lib/definitions/userFull";
import { employmentSections } from "@/lib/form-sections/employment";
import { updateEmployment } from "@/lib/actions/update/updateEmployment";
import { deleteEmployment } from "@/lib/actions/delete/deleteEmployment";
import Field from "../Forms/Field";
import { FaRegCircleXmark } from "react-icons/fa6";

export default function EmploymentForm({ user }: { user: UserFull }) {
  const initialState: State = { message: null, errors: {} };
  const updateEmploymentWithId = updateEmployment.bind(null, user.id);
  const [, formAction] = useActionState(updateEmploymentWithId, initialState);

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [employmentEntries, setEmploymentEntries] = useState<Employment[]>(
    user.employment || [
      {
        id: "",
        user_id: user.id,
        position: "",
        company: "",
        status: "",
        start_date: "",
        end_date: "",
        duties: "",
      },
    ]
  );

  const handleAdd = () => {
    console.log("Handle Add");

    setEmploymentEntries((prevEntries) => [
      ...prevEntries,
      {
        id: "",
        user_id: user.id,
        position: "",
        company: "",
        status: "",
        start_date: "",
        end_date: "",
        duties: "",
      },
    ]);
  };

  const handleDeleteClick = (index: number) => {
    console.log("handleDeleteClick");
    setDeleteIndex(index);
  };
  const confirmDelete = async () => {
    console.log("handle Delete", deleteIndex);
    if (deleteIndex === null) return;
    const employmentToRemove = employmentEntries[deleteIndex];

    if (employmentToRemove.id) {
      // Delete from database if it has an id
      console.log("await delete");
      await deleteEmployment(employmentToRemove.id);
    }

    // Remove from local state
    setEmploymentEntries(employmentEntries.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null); // Reset delete index
  };
  const cancelDelete = () => {
    setDeleteIndex(null); // Reset delete index
  };

  return (
    <>
      <form
        id="employment_form"
        className="md:pt-8 text-black"
        action={formAction}
      >
        {employmentEntries.map((entry, index) => (
          <div
            key={index}
            className="employment-entry  p-3 md:p-6 md:pb-2 mb-4 md:mb-8 md:mr-4 bg-gray-100 rounded-md border-l-[.5rem] border-purple-700"
          >
            <div className="">
              {employmentSections.map((section) => (
                <div key={section.sectionId} className="relative">
                  <button
                    className="absolute top-0 right-0"
                    aria-label="Remove Education Item"
                    title="Remove Education Item"
                    type="button"
                    onClick={() => handleDeleteClick(index)}
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
                        value={entry[field.id as keyof Employment]}
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
      {deleteIndex !== null && (
        <div className="delete-confirmation fixed top-[50%] left-[50%] py-6 px-12 bg-purple-700 rounded-lg">
          <p>Are you sure you want to delete this employment entry?</p>
          <div className="flex justify-between pt-4">
            <button
              onClick={confirmDelete}
              className="p-2 bg-red-500 text-white rounded-sm hover:bg-red-300 transition-all duration-300"
            >
              Yes, Delete
            </button>
            <button
              onClick={cancelDelete}
              className="p-2 bg-blue-500 text-white rounded-sm hover:bg-blue-300 transition-all duration-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
