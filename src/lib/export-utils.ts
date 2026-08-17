import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import { resumeToPDF } from "@/lib/pdf-capture";
import type { ResumeData } from "@/components/resume/templates";
import { formatDateRange } from "@/lib/utils";

export function exportToPDF(
  data: ResumeData,
  template: string,
  filename: string,
) {
  resumeToPDF(data, template, filename);
}

export async function exportToDocx(data: ResumeData, filename: string) {
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
  const filteredEmp = employment.filter((e) =>
    data.selectedEmployment.includes(e.id),
  );
  const summary = customSummary || profile.summary;
  const skills =
    selectedSkills.length > 0 ? selectedSkills : profile.skills || [];

  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${profile.firstName} ${profile.lastName}`,
          bold: true,
          size: 36,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  );

  if (profile.positionTitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: profile.positionTitle,
            size: 24,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
  }

  const contactParts: string[] = [];
  if (profile.email) contactParts.push(profile.email);
  if (profile.phone) contactParts.push(profile.phone);
  if (profile.address) contactParts.push(profile.address);
  if (profile.linkedin) contactParts.push(profile.linkedin);
  if (profile.github) contactParts.push(profile.github);
  if (profile.portfolio) contactParts.push(profile.portfolio);

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join(" | "),
            size: 18,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
    );
  }

  // Divider
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
      },
      spacing: { after: 200 },
    }),
  );

  // Summary
  if (summary) {
    children.push(
      new Paragraph({
        text: "PROFESSIONAL SUMMARY",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: summary, size: 20 })],
        spacing: { after: 200 },
      }),
    );
  }

  // Skills
  if (skills.length > 0) {
    children.push(
      new Paragraph({
        text: "SKILLS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: skills.join(" | "), size: 20 })],
        spacing: { after: 200 },
      }),
    );
  }

  // Experience
  if (filteredEmp.length > 0) {
    children.push(
      new Paragraph({
        text: "PROFESSIONAL EXPERIENCE",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),
    );
    for (const emp of filteredEmp) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: emp.positionTitle || "",
              bold: true,
              size: 22,
            }),
            new TextRun({ text: ` | ${emp.companyName}`, size: 22 }),
            new TextRun({
              text: `  ${formatDateRange(emp.monthFrom, emp.yearFrom, emp.monthTo, emp.yearTo, emp.isCurrent ?? false)}`,
              size: 18,
              color: "666666",
            }),
          ],
        }),
      );
      if (emp.location) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: emp.location, size: 18, color: "666666" }),
            ],
          }),
        );
      }
      const duties = Array.isArray(emp.duties) ? emp.duties.filter((d: { id: string }) => selectedDuties.includes(d.id)).sort((a: { id: string }, b: { id: string }) => selectedDuties.indexOf(a.id) - selectedDuties.indexOf(b.id)) : [];
      for (const duty of duties) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${duty.text}`, size: 20 })],
            spacing: { before: 40 },
          }),
        );
      }
      children.push(new Paragraph({ spacing: { after: 200 } }));
    }
  }

  // Education
  if (filteredEdu.length > 0) {
    children.push(
      new Paragraph({
        text: "EDUCATION",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),
    );
    for (const edu of filteredEdu) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.institution, bold: true, size: 22 }),
            new TextRun({
              text: `  ${edu.yearFrom} - ${edu.yearTo}`,
              size: 18,
              color: "666666",
            }),
          ],
        }),
      );
      const degreeText = [
        edu.diplomaType,
        edu.concentration && `in ${edu.concentration}`,
        edu.minor && `Minor: ${edu.minor}`,
      ]
        .filter(Boolean)
        .join(" ");
      if (degreeText) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: degreeText, size: 20 })],
          }),
        );
      }
      children.push(new Paragraph({ spacing: { after: 200 } }));
    }
  }

  // Custom Sections
  for (const section of customSections) {
    children.push(
      new Paragraph({
        text: section.title.toUpperCase(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      }),
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.content, size: 20 })],
        spacing: { after: 200 },
      }),
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, filename);
}
