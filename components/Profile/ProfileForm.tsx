"use client";
import { useActionState } from "react";
import { State } from "@/lib/definitions/state";
import { UserFull } from "@/lib/definitions/userFull";
import { UserProfile } from "@/lib/definitions/userProfile";
import { updateProfile } from "@/lib/actions/update/updateProfile";
import { profileSections } from "@/lib/form-sections/profile";
import Field from "../Forms/Field";

const ProfileForm = ({ user }: { user: UserFull }) => {
  const initialState: State = { message: null, errors: {} };
  const updateUserProfile = updateProfile.bind(null, user.id);
  const [, submitUpdatedProfile] = useActionState(
    updateUserProfile,
    initialState
  );

  return (
    <>
      <form
        id="profile_form"
        className="md:pt-8 mb-16"
        action={submitUpdatedProfile}
      >
        <div className="">
          {profileSections.map((section) => (
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
                    value={user[field.id as keyof UserProfile]}
                    key={field.id}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="w-full pb-8 text-right px-2 md:pl-8 md:pr-4">
            <input
              type="submit"
              className="w-full py-2 px-4 rounded cursor-pointer bg-purple-700 text-white hover:bg-white hover:text-purple-700 duration-300 transition-all"
            />
          </div>
        </div>
      </form>
    </>
  );
};

export default ProfileForm;
