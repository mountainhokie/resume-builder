import { FieldProps } from "@/lib/definitions/field";

const Field = ({ field, value }: { field: FieldProps; value?: string }) => {
  return (
    <>
      {field.inputType === "hidden" && (
        <input type="hidden" name={field.id} value={value} />
      )}
      {field.inputType !== "hidden" && (
        <div className={`w-full ${field.column} px-1 md:px-4 mb-4`}>
          <div className="relative w-full mb-3">
            <label
              className="block uppercase text-gray-600 text-xs font-bold mb-2"
              htmlFor={field.id}
            >
              {field.label}
            </label>
            {field.inputType === "textarea" && (
              <textarea
                name={field.id}
                defaultValue={value}
                placeholder={field.placeholder}
                className="border-0 px-3 py-3 placeholder-gray-300 text-gray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                rows={10}
              ></textarea>
            )}
            {field.inputType === "text" && (
              <input
                type="text"
                name={field.id}
                className="border-0 px-1 md:px-3 py-2 md:py-3 placeholder-gray-300 text-gray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                defaultValue={value}
                placeholder={field.placeholder}
              />
            )}
            {field.inputType === "select" && (
              <select
                name={field.id}
                className="border-0 px-1 md:px-3 py-2 md:py-3 placeholder-gray-300 text-gray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                defaultValue={value}
              >
                <option value="Applied">Applied</option>
                <option value="Interview">Interviewing</option>
                <option value="Rejected">Rejected</option>
              </select>
            )}
            {field.note && (
              <p className="text-sm text-gray-400 py-2">{field.note}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Field;
