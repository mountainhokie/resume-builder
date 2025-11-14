export const JobSections = [
  {
    sectionId: "jobDetails",
    heading: "Job Details",
    fields: [
      {
        id: "user_id",
        label: "id",
        required: false,
        inputType: "hidden",
        placeholder: "",
        icon: "",
        column: "", // full, half, third
      },
      {
        id: "job_title",
        label: "Job Title",
        required: false,
        inputType: "text",
        placeholder: "Job Title",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "company",
        label: "Company",
        required: false,
        inputType: "text",
        placeholder: "",
        icon: "",
        column: "md:w-1/4", // full, half, third
      },
      {
        id: "date_applied",
        label: "Date Applied",
        required: false,
        inputType: "text",
        placeholder: "Date Applied",
        icon: "",
        column: "md:w-1/2 lg:w-1/6", // full, half, third
      },
      {
        id: "status",
        label: "Status",
        required: false,
        inputType: "select",
        placeholder: "Status",
        icon: "",
        column: "md:w-1/2 lg:w-1/6", // full, half, third
      },
      {
        id: "location",
        label: "Location",
        required: false,
        inputType: "text",
        placeholder: "",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "url",
        label: "Job Posting",
        required: false,
        inputType: "text",
        placeholder: "Job Posting",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "pay",
        label: "Pay",
        required: false,
        inputType: "text",
        placeholder: "",
        icon: "",
        column: "md:w-1/3", // full, half, third
      },
      {
        id: "skills",
        label: "Skills",
        required: false,
        inputType: "text",
        placeholder: "Skills",
        icon: "",
        column: "", // full, half, third
      },
      {
        id: "description",
        label: "Description",
        required: false,
        inputType: "textarea",
        placeholder: "",
        icon: "",
        column: "", // full, half, third
      },
      {
        id: "requirements",
        label: "Requirements",
        required: false,
        inputType: "text",
        placeholder: "",
        icon: "",
        column: "", // full, half, third
      },
      {
        id: "responsibilities",
        label: "Responsibilities",
        required: false,
        inputType: "text",
        placeholder: "",
        icon: "",
        column: "", // full, half, third
      },
      {
        id: "benefits",
        label: "Benefits",
        required: false,
        inputType: "textarea",
        placeholder: "",
        icon: "",
        column: "", // full, half, third
      },
      {
        id: "notes",
        label: "notes",
        required: false,
        inputType: "textarea",
        placeholder: "",
        icon: "",
        column: "", // full, half, third
      },
    ],
  },
];
/*
      job_title: string;
      company: string;
      location: string;
      skills: string[];
      description: string;
    requirements: string[];
    responsibilities: string[];
    benefits: string[];
    pay: string;
    notes: string;


*/
