export const employmentSections = [
  {
    sectionId: "employment",
    heading: "Employment Information",
    fields: [
      {
        id: "id",
        label: "id",
        required: false,
        inputType: "hidden",
        placeholder: "",
        icon: "",
        column: "", // full, half, third
      },
      {
        id: "position",
        label: "Position",
        required: false,
        inputType: "text",
        placeholder: "Position",
        icon: "",
        column: "md:w-1/2", // full, half, third
      },
      {
        id: "company",
        label: "Company",
        required: false,
        inputType: "text",
        placeholder: "Company",
        icon: "",
        column: "md:w-1/2", // full, half, third
      },
      {
        id: "status",
        label: "Status",
        required: false,
        inputType: "text",
        placeholder: "Status",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "start_date",
        label: "Start Date",
        required: false,
        inputType: "text",
        placeholder: "Start Date",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "end_date",
        label: "End Date",
        required: false,
        inputType: "text",
        placeholder: "End Date",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "duties",
        label: "Duties",
        required: false,
        inputType: "textarea",
        placeholder: "Duties",
        icon: "",
        column: "", // full, half, third
      },
    ],
  },
];
