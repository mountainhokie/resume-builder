export const profileSections = [
  {
    sectionId: "userInfo",
    heading: "User Information",
    fields: [
      {
        id: "first_name",
        label: "First Name",
        required: false,
        inputType: "text",
        placeholder: "First Name",
        icon: "",
        column: "md:w-1/2", // full, half, third
      },
      {
        id: "last_name",
        label: "Last Name",
        required: false,
        inputType: "text",
        placeholder: "Last Name",
        icon: "",
        column: "md:w-1/2", // full, half, third
      },
      {
        id: "street_address",
        label: "Street Address",
        required: false,
        inputType: "text",
        placeholder: "Street Address",
        icon: "",
        column: "lg:w-5/12", // full, half, third
      },
      {
        id: "city",
        label: "City",
        required: false,
        inputType: "text",
        placeholder: "City",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "state",
        label: "State",
        required: false,
        inputType: "text",
        placeholder: "State",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "zip",
        label: "Zip Code",
        required: false,
        inputType: "text",
        placeholder: "Zip Code",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "phone",
        label: "Phone Number",
        required: false,
        inputType: "text",
        placeholder: "Phone Number",
        icon: "",
        column: "md:w-1/2", // full, half, third
      },
      {
        id: "email",
        label: "Email Address",
        required: false,
        inputType: "text",
        placeholder: "Email Address",
        icon: "",
        column: "md:w-1/2", // full, half, third
      },
    ],
  },
  {
    sectionId: "position",
    heading: "Position Information",
    fields: [
      {
        id: "position",
        label: "Position",
        required: false,
        inputType: "text",
        placeholder: "",
        icon: "",
        column: "",
        note: "The name of your current position or title",
      },
      {
        id: "skills",
        label: "Skills",
        required: false,
        inputType: "text",
        placeholder: "React, Next.JS, TailWind, TypeScript",
        icon: "",
        column: "",
        note: "Add various skills.  Separate by a comma.",
      },
    ],
  },
  {
    sectionId: "additional",
    heading: "Additional Information",
    fields: [
      {
        id: "portfolio",
        label: "Portfolio",
        required: false,
        inputType: "text",
        placeholder: "Portfolio",
        icon: "",
        column: "lg:w-1/3",
      },
      {
        id: "github",
        label: "Github",
        required: false,
        inputType: "text",
        placeholder: "Github",
        icon: "",
        column: "lg:w-1/3",
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        required: false,
        inputType: "text",
        placeholder: "LinkedIn",
        icon: "",
        column: "lg:w-1/3",
      },
      {
        id: "summary",
        label: "summary",
        required: false,
        inputType: "textarea",
        placeholder: "summary",
        icon: "",
        column: "lg:w-full",
      },
    ],
  },
];
