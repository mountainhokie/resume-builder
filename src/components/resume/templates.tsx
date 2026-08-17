"use client";

import type { Profile, Education, Employment } from "@/lib/schema";
import { formatDateRange } from "@/lib/utils";

export interface ResumeData {
  profile: Profile;
  education: Education[];
  employment: Employment[];
  selectedEducation: string[];
  selectedEmployment: string[];
  selectedSkills: string[];
  selectedDuties: string[];
  customSummary: string;
  customSections: { title: string; content: string }[];
  customPositionTitles?: Record<string, string>;
}

interface TemplateProps {
  data: ResumeData;
}

function getEmpTitle(emp: Employment, customTitles?: Record<string, string>): string {
  return customTitles?.[emp.id] || emp.positionTitle || "";
}

export function ClassicTemplate({ data }: TemplateProps) {
  const {
    profile,
    education,
    employment,
    selectedSkills,
    selectedDuties,
    customSummary,
    customSections,
  } = data;
  const filteredEdu = education.filter((e) =>
    data.selectedEducation.includes(e.id),
  );
  const filteredEmp = employment
    .filter((e) => data.selectedEmployment.includes(e.id))
    .sort((a, b) => (b.yearFrom ?? 0) - (a.yearFrom ?? 0));
  const summary = customSummary || profile.summary;
  const skills =
    selectedSkills.length > 0 ? selectedSkills : profile.skills || [];

  return (
    <div
      className="font-serif text-sm leading-relaxed text-gray-900 p-8 bg-white"
      id="resume-content"
    >
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wider">
          {profile.firstName} {profile.lastName}
        </h1>
        {profile.positionTitle && (
          <p className="text-base text-gray-600 mt-1">
            {profile.positionTitle}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
          {profile.email && <span>{profile.email}</span>}
          {profile.phone && <span>{profile.phone}</span>}
          {profile.address && <span>{profile.address}</span>}
        </div>
        {(profile.linkedin || profile.github || profile.portfolio) && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-600">
            {profile.linkedin && <span>{profile.linkedin}</span>}
            {profile.github && <span>{profile.github}</span>}
            {profile.portfolio && <span>{profile.portfolio}</span>}
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="whitespace-pre-line">{summary}</p>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">
            Skills
          </h2>
          <p>{skills.join(" | ")}</p>
        </div>
      )}

      {/* Experience */}
      {filteredEmp.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">
            Professional Experience
          </h2>
          {filteredEmp.map((emp) => (
            <div key={emp.id} className="mb-4">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-bold">{getEmpTitle(emp, data.customPositionTitles)}</span>
                  {emp.companyName && <span> | {emp.companyName}</span>}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDateRange(emp.monthFrom, emp.yearFrom, emp.monthTo, emp.yearTo, emp.isCurrent ?? false)}
                </span>
              </div>
              {emp.location && (
                <p className="text-xs text-gray-500">{emp.location}</p>
              )}
              {(() => {
                const duties = Array.isArray(emp.duties) ? emp.duties.filter((d) => selectedDuties.includes(d.id)).sort((a, b) => selectedDuties.indexOf(a.id) - selectedDuties.indexOf(b.id)) : [];
                return duties.length > 0 ? (
                  <ul className="mt-1 text-xs list-disc list-inside space-y-0.5">
                    {duties.map((d) => <li key={d.id}>{d.text}</li>)}
                  </ul>
                ) : null;
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {filteredEdu.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">
            Education
          </h2>
          {filteredEdu.map((edu) => (
            <div key={edu.id} className="mb-2">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-bold">{edu.institution}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {edu.yearFrom} - {edu.yearTo}
                </span>
              </div>
              <p className="text-xs">
                {edu.diplomaType}
                {edu.concentration && ` in ${edu.concentration}`}
                {edu.minor && `, Minor: ${edu.minor}`}
              </p>
              {edu.location && (
                <p className="text-xs text-gray-500">{edu.location}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom Sections */}
      {customSections.map((section, i) => (
        <div key={i} className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">
            {section.title}
          </h2>
          <div className="whitespace-pre-line">{section.content}</div>
        </div>
      ))}
    </div>
  );
}

export function ModernTemplate({ data }: TemplateProps) {
  const {
    profile,
    education,
    employment,
    selectedSkills,
    selectedDuties,
    customSummary,
    customSections,
  } = data;
  const filteredEdu = education.filter((e) =>
    data.selectedEducation.includes(e.id),
  );
  const filteredEmp = employment
    .filter((e) => data.selectedEmployment.includes(e.id))
    .sort((a, b) => (b.yearFrom ?? 0) - (a.yearFrom ?? 0));
  const summary = customSummary || profile.summary;
  const skills =
    selectedSkills.length > 0 ? selectedSkills : profile.skills || [];

  return (
    <div
      className="font-sans text-sm leading-relaxed text-gray-800 bg-white"
      id="resume-content"
    >
      {/* Header with accent */}
      <div className="bg-blue-700 text-white px-8 py-6">
        <h1 className="text-3xl font-light">
          {profile.firstName}{" "}
          <span className="font-bold">{profile.lastName}</span>
        </h1>
        {profile.positionTitle && (
          <p className="text-blue-200 text-lg mt-1">{profile.positionTitle}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-blue-100">
          {profile.email && <span>{profile.email}</span>}
          {profile.phone && <span>{profile.phone}</span>}
          {profile.address && <span>{profile.address}</span>}
          {profile.linkedin && <span>{profile.linkedin}</span>}
          {profile.github && <span>{profile.github}</span>}
          {profile.portfolio && <span>{profile.portfolio}</span>}
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Summary */}
        {summary && (
          <div className="mb-6">
            <h2 className="text-blue-700 font-bold text-sm uppercase tracking-wider mb-2">
              About
            </h2>
            <p className="whitespace-pre-line text-gray-600">{summary}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            {/* Experience */}
            {filteredEmp.length > 0 && (
              <div className="mb-6">
                <h2 className="text-blue-700 font-bold text-sm uppercase tracking-wider mb-3">
                  Experience
                </h2>
                {filteredEmp.map((emp) => (
                  <div
                    key={emp.id}
                    className="mb-4 relative pl-4 border-l-2 border-blue-200"
                  >
                    <h3 className="font-bold">{getEmpTitle(emp, data.customPositionTitles)}</h3>
                    <p className="text-blue-600 text-xs font-medium">
                      {emp.companyName}
                      {emp.location && ` - ${emp.location}`}
                    </p>
                    <p className="text-xs text-gray-400 mb-1">
                      {formatDateRange(emp.monthFrom, emp.yearFrom, emp.monthTo, emp.yearTo, emp.isCurrent ?? false)}
                    </p>
                    {(() => {
                      const duties = Array.isArray(emp.duties) ? emp.duties.filter((d) => selectedDuties.includes(d.id)).sort((a, b) => selectedDuties.indexOf(a.id) - selectedDuties.indexOf(b.id)) : [];
                      return duties.length > 0 ? (
                        <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                          {duties.map((d) => <li key={d.id}>{d.text}</li>)}
                        </ul>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}

            {/* Custom Sections */}
            {customSections.map((section, i) => (
              <div key={i} className="mb-6">
                <h2 className="text-blue-700 font-bold text-sm uppercase tracking-wider mb-2">
                  {section.title}
                </h2>
                <div className="whitespace-pre-line text-gray-600">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          <div>
            {/* Skills */}
            {skills.length > 0 && (
              <div className="mb-6">
                <h2 className="text-blue-700 font-bold text-sm uppercase tracking-wider mb-2">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {filteredEdu.length > 0 && (
              <div className="mb-6">
                <h2 className="text-blue-700 font-bold text-sm uppercase tracking-wider mb-2">
                  Education
                </h2>
                {filteredEdu.map((edu) => (
                  <div key={edu.id} className="mb-3">
                    <p className="font-bold text-xs">{edu.institution}</p>
                    <p className="text-xs text-gray-600">
                      {edu.diplomaType}
                      {edu.concentration && ` in ${edu.concentration}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {edu.yearFrom} - {edu.yearTo}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MinimalTemplate({ data }: TemplateProps) {
  const {
    profile,
    education,
    employment,
    selectedSkills,
    selectedDuties,
    customSummary,
    customSections,
  } = data;
  const filteredEdu = education.filter((e) =>
    data.selectedEducation.includes(e.id),
  );
  const filteredEmp = employment
    .filter((e) => data.selectedEmployment.includes(e.id))
    .sort((a, b) => (b.yearFrom ?? 0) - (a.yearFrom ?? 0));
  const summary = customSummary || profile.summary;
  const skills =
    selectedSkills.length > 0 ? selectedSkills : profile.skills || [];

  return (
    <div
      className="font-sans text-sm leading-relaxed text-gray-800 p-8 bg-white"
      id="resume-content"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {profile.firstName} {profile.lastName}
        </h1>
        {profile.positionTitle && (
          <p className="text-gray-500 mt-0.5">{profile.positionTitle}</p>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
          {profile.email && <span>{profile.email}</span>}
          {profile.phone && <span>{profile.phone}</span>}
          {profile.address && <span>{profile.address}</span>}
          {profile.linkedin && <span>{profile.linkedin}</span>}
          {profile.github && <span>{profile.github}</span>}
          {profile.portfolio && <span>{profile.portfolio}</span>}
        </div>
      </div>

      <hr className="border-gray-200 mb-5" />

      {/* Summary */}
      {summary && (
        <div className="mb-5">
          <p className="text-gray-600 whitespace-pre-line">{summary}</p>
        </div>
      )}

      {/* Experience */}
      {filteredEmp.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Experience
          </h2>
          {filteredEmp.map((emp) => (
            <div key={emp.id} className="mb-3">
              <div className="flex justify-between">
                <div>
                  <span className="font-semibold">{getEmpTitle(emp, data.customPositionTitles)}</span>
                  <span className="text-gray-400"> at </span>
                  <span className="text-gray-600">{emp.companyName}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatDateRange(emp.monthFrom, emp.yearFrom, emp.monthTo, emp.yearTo, emp.isCurrent ?? false)}
                </span>
              </div>
              {(() => {
                const duties = Array.isArray(emp.duties) ? emp.duties.filter((d) => selectedDuties.includes(d.id)).sort((a, b) => selectedDuties.indexOf(a.id) - selectedDuties.indexOf(b.id)) : [];
                return duties.length > 0 ? (
                  <ul className="mt-1 text-xs text-gray-500 list-disc list-inside space-y-0.5">
                    {duties.map((d) => <li key={d.id}>{d.text}</li>)}
                  </ul>
                ) : null;
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {filteredEdu.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Education
          </h2>
          {filteredEdu.map((edu) => (
            <div key={edu.id} className="mb-2 flex justify-between">
              <div>
                <span className="font-semibold">{edu.institution}</span>
                <span className="text-gray-400"> - </span>
                <span className="text-gray-600">
                  {edu.diplomaType}
                  {edu.concentration && ` in ${edu.concentration}`}
                </span>
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {edu.yearFrom} - {edu.yearTo}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Skills
          </h2>
          <p className="text-gray-600">{skills.join(", ")}</p>
        </div>
      )}

      {/* Custom Sections */}
      {customSections.map((section, i) => (
        <div key={i} className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            {section.title}
          </h2>
          <div className="whitespace-pre-line text-gray-600">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
}

export const templates = {
  classic: { name: "Classic", component: ClassicTemplate },
  modern: { name: "Modern", component: ModernTemplate },
  minimal: { name: "Minimal", component: MinimalTemplate },
};
