import jsPDF from "jspdf";
import type { ResumeData } from "@/components/resume/templates";
import type { CoverLetterData } from "@/components/cover-letter/templates";
import { formatDateRange } from "@/lib/utils";

// A4 dimensions in mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Colors
const BLACK = "#1a1a1a";
const GRAY = "#555555";
const LIGHT_GRAY = "#777777";
const BLUE = "#1d4ed8";
const RULE_GRAY = "#cccccc";

/** Check if we need a new page, adding one if necessary. Returns current Y. */
function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    pdf.addPage();
    return MARGIN;
  }
  return y;
}

/** Draw wrapped text and return new Y position. */
function drawWrapped(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = pdf.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = ensureSpace(pdf, y, lineHeight);
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

/** Draw a horizontal rule. */
function drawRule(pdf: jsPDF, y: number, color = RULE_GRAY): number {
  pdf.setDrawColor(color);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 3;
}

// ──────────────────────────────────────────────
// Resume PDF generators
// ──────────────────────────────────────────────

function generateClassicResume(pdf: jsPDF, data: ResumeData) {
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

  let y = MARGIN;

  // Header — centered
  pdf.setFont("times", "bold");
  pdf.setFontSize(21);
  pdf.setTextColor(BLACK);
  const name = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  pdf.text(name, PAGE_W / 2, y, { align: "center" });
  y += 7;

  if (profile.positionTitle) {
    pdf.setFont("times", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(GRAY);
    pdf.text(profile.positionTitle, PAGE_W / 2, y, { align: "center" });
    y += 5;
  }

  const contactLine: string[] = [];
  if (profile.email) contactLine.push(profile.email);
  if (profile.phone) contactLine.push(profile.phone);
  if (profile.address) contactLine.push(profile.address);

  const urlLine: string[] = [];
  if (profile.linkedin) urlLine.push(profile.linkedin);
  if (profile.github) urlLine.push(profile.github);
  if (profile.portfolio) urlLine.push(profile.portfolio);

  pdf.setFontSize(9);
  pdf.setTextColor(GRAY);
  if (contactLine.length > 0) {
    pdf.text(contactLine.join("  |  "), PAGE_W / 2, y, { align: "center" });
    y += 4;
  }
  if (urlLine.length > 0) {
    pdf.text(urlLine.join("  |  "), PAGE_W / 2, y, { align: "center" });
    y += 4;
  }

  // Divider
  pdf.setDrawColor("#333333");
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // Section helper
  function sectionHeader(title: string) {
    y = ensureSpace(pdf, y, 16);
    pdf.setFont("times", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(BLACK);
    pdf.text(title.toUpperCase(), MARGIN, y);
    y += 1.5;
    pdf.setDrawColor(RULE_GRAY);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 4;
  }

  // Summary
  if (summary) {
    sectionHeader("Professional Summary");
    pdf.setFont("times", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(BLACK);
    y = drawWrapped(pdf, summary, MARGIN, y, CONTENT_W, 4.5);
    y += 8;
  }

  // Skills
  if (skills.length > 0) {
    sectionHeader("Skills");
    pdf.setFont("times", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(BLACK);
    y = drawWrapped(pdf, skills.join("  |  "), MARGIN, y, CONTENT_W, 4.5);
    y += 8;
  }

  // Experience
  if (filteredEmp.length > 0) {
    sectionHeader("Professional Experience");
    for (const emp of filteredEmp) {
      y = ensureSpace(pdf, y, 14);
      pdf.setFont("times", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(BLACK);
      const title = emp.positionTitle || "";
      const company = emp.companyName ? ` | ${emp.companyName}` : "";
      pdf.text(`${title}${company}`, MARGIN, y);

      const dates = formatDateRange(emp.monthFrom, emp.yearFrom, emp.monthTo, emp.yearTo, emp.isCurrent ?? false);
      pdf.setFont("times", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(LIGHT_GRAY);
      pdf.text(dates, PAGE_W - MARGIN, y, { align: "right" });
      y += 4;

      if (emp.location) {
        pdf.setFontSize(9);
        pdf.setTextColor(LIGHT_GRAY);
        pdf.text(emp.location, MARGIN, y);
        y += 4;
      }

      const duties = Array.isArray(emp.duties) ? emp.duties.filter((d: { id: string }) => selectedDuties.includes(d.id)).sort((a: { id: string }, b: { id: string }) => selectedDuties.indexOf(a.id) - selectedDuties.indexOf(b.id)) : [];
      if (duties.length > 0) {
        pdf.setFont("times", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(BLACK);
        for (const duty of duties) {
          y = drawWrapped(pdf, `• ${duty.text}`, MARGIN + 2, y, CONTENT_W - 2, 4.5);
        }
      }
      y += 5;
    }
    y += 2;
  }

  // Education
  if (filteredEdu.length > 0) {
    sectionHeader("Education");
    for (const edu of filteredEdu) {
      y = ensureSpace(pdf, y, 12);
      pdf.setFont("times", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(BLACK);
      pdf.text(edu.institution, MARGIN, y);

      const dates = `${edu.yearFrom} - ${edu.yearTo}`;
      pdf.setFont("times", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(LIGHT_GRAY);
      pdf.text(dates, PAGE_W - MARGIN, y, { align: "right" });
      y += 4;

      const degreeParts = [
        edu.diplomaType,
        edu.concentration && `in ${edu.concentration}`,
        edu.minor && `Minor: ${edu.minor}`,
      ].filter(Boolean);
      if (degreeParts.length > 0) {
        pdf.setFont("times", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(BLACK);
        pdf.text(degreeParts.join(" "), MARGIN, y);
        y += 4;
      }

      if (edu.location) {
        pdf.setFontSize(9);
        pdf.setTextColor(LIGHT_GRAY);
        pdf.text(edu.location, MARGIN, y);
        y += 4;
      }
      y += 3;
    }
  }

  // Custom Sections
  for (const section of customSections) {
    sectionHeader(section.title);
    pdf.setFont("times", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(BLACK);
    y = drawWrapped(pdf, section.content, MARGIN, y, CONTENT_W, 4.5);
    y += 8;
  }
}

function generateModernResume(pdf: jsPDF, data: ResumeData) {
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

  // Blue header band
  pdf.setFillColor(29, 78, 216); // blue-700
  pdf.rect(0, 0, PAGE_W, 38, "F");

  let y = 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(23);
  pdf.setTextColor("#ffffff");
  pdf.text(`${profile.firstName} `, MARGIN, y);
  const firstW = pdf.getTextWidth(`${profile.firstName} `);
  pdf.setFont("helvetica", "bold");
  pdf.text(profile.lastName, MARGIN + firstW, y);
  y += 7;

  if (profile.positionTitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor("#93c5fd"); // blue-200
    pdf.text(profile.positionTitle, MARGIN, y);
    y += 5;
  }

  const contactParts: string[] = [];
  if (profile.email) contactParts.push(profile.email);
  if (profile.phone) contactParts.push(profile.phone);
  if (profile.address) contactParts.push(profile.address);
  if (profile.linkedin) contactParts.push(profile.linkedin);
  if (profile.github) contactParts.push(profile.github);
  if (profile.portfolio) contactParts.push(profile.portfolio);

  if (contactParts.length > 0) {
    pdf.setFontSize(8);
    pdf.setTextColor("#dbeafe"); // blue-100
    pdf.text(contactParts.join("   "), MARGIN, y);
  }

  y = 46;

  function modernSectionHeader(title: string) {
    y = ensureSpace(pdf, y, 14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(BLUE);
    pdf.text(title.toUpperCase(), MARGIN, y);
    y += 4;
  }

  // About / Summary
  if (summary) {
    modernSectionHeader("About");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(GRAY);
    y = drawWrapped(pdf, summary, MARGIN, y, CONTENT_W, 4.5);
    y += 8;
  }

  // Two-column: left (experience + custom), right (skills + education)
  const colGap = 8;
  const leftW = CONTENT_W * 0.63;
  const rightX = MARGIN + leftW + colGap;
  const rightW = CONTENT_W - leftW - colGap;

  let leftY = y;
  let rightY = y;

  // Left column: Experience
  if (filteredEmp.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(BLUE);
    pdf.text("EXPERIENCE", MARGIN, leftY);
    leftY += 6;

    for (const emp of filteredEmp) {
      leftY = ensureSpace(pdf, leftY, 14);
      // Left border accent
      pdf.setDrawColor("#bfdbfe"); // blue-200
      pdf.setLineWidth(0.8);
      pdf.line(MARGIN + 1, leftY - 2, MARGIN + 1, leftY + 10);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(BLACK);
      pdf.text(emp.positionTitle || "", MARGIN + 4, leftY);
      leftY += 4;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(BLUE);
      const compLoc = [emp.companyName, emp.location]
        .filter(Boolean)
        .join(" - ");
      pdf.text(compLoc, MARGIN + 4, leftY);
      leftY += 3.5;

      pdf.setFontSize(8);
      pdf.setTextColor(LIGHT_GRAY);
      pdf.text(
        formatDateRange(emp.monthFrom, emp.yearFrom, emp.monthTo, emp.yearTo, emp.isCurrent ?? false),
        MARGIN + 4,
        leftY,
      );
      leftY += 3.5;

      const duties = Array.isArray(emp.duties) ? emp.duties.filter((d: { id: string }) => selectedDuties.includes(d.id)).sort((a: { id: string }, b: { id: string }) => selectedDuties.indexOf(a.id) - selectedDuties.indexOf(b.id)) : [];
      if (duties.length > 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(GRAY);
        for (const duty of duties) {
          leftY = drawWrapped(
            pdf,
            `• ${duty.text}`,
            MARGIN + 4,
            leftY,
            leftW - 4,
            4,
          );
        }
      }
      leftY += 7;
    }
  }

  // Custom Sections (left column)
  for (const section of customSections) {
    leftY = ensureSpace(pdf, leftY, 14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(BLUE);
    pdf.text(section.title.toUpperCase(), MARGIN, leftY);
    leftY += 4;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(GRAY);
    leftY = drawWrapped(pdf, section.content, MARGIN, leftY, leftW, 4);
    leftY += 8;
  }

  // Right column: Skills
  if (skills.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(BLUE);
    pdf.text("SKILLS", rightX, rightY);
    rightY += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(BLACK);
    for (const skill of skills) {
      rightY = ensureSpace(pdf, rightY, 5);
      pdf.text(`• ${skill}`, rightX, rightY);
      rightY += 4;
    }
    rightY += 6;
  }

  // Right column: Education
  if (filteredEdu.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(BLUE);
    pdf.text("EDUCATION", rightX, rightY);
    rightY += 5;

    for (const edu of filteredEdu) {
      rightY = ensureSpace(pdf, rightY, 12);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(BLACK);
      rightY = drawWrapped(pdf, edu.institution, rightX, rightY, rightW, 4);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(GRAY);
      const degree = [
        edu.diplomaType,
        edu.concentration && `in ${edu.concentration}`,
      ]
        .filter(Boolean)
        .join(" ");
      if (degree) {
        rightY = drawWrapped(pdf, degree, rightX, rightY, rightW, 4);
      }

      pdf.setFontSize(8);
      pdf.setTextColor(LIGHT_GRAY);
      pdf.text(`${edu.yearFrom} - ${edu.yearTo}`, rightX, rightY);
      rightY += 6;
    }
  }
}

function generateMinimalResume(pdf: jsPDF, data: ResumeData) {
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

  let y = MARGIN;

  // Header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.setTextColor(BLACK);
  pdf.text(`${profile.firstName} ${profile.lastName}`, MARGIN, y);
  y += 5;

  if (profile.positionTitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(LIGHT_GRAY);
    pdf.text(profile.positionTitle, MARGIN, y);
    y += 4;
  }

  const contactParts: string[] = [];
  if (profile.email) contactParts.push(profile.email);
  if (profile.phone) contactParts.push(profile.phone);
  if (profile.address) contactParts.push(profile.address);
  if (profile.linkedin) contactParts.push(profile.linkedin);
  if (profile.github) contactParts.push(profile.github);
  if (profile.portfolio) contactParts.push(profile.portfolio);

  if (contactParts.length > 0) {
    pdf.setFontSize(8);
    pdf.setTextColor(LIGHT_GRAY);
    pdf.text(contactParts.join("   "), MARGIN, y);
    y += 4;
  }

  y = drawRule(pdf, y, "#e5e7eb") + 3;

  function minimalSectionHeader(title: string) {
    y = ensureSpace(pdf, y, 14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(LIGHT_GRAY);
    pdf.text(title.toUpperCase(), MARGIN, y);
    y += 5;
  }

  // Summary
  if (summary) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(GRAY);
    y = drawWrapped(pdf, summary, MARGIN, y, CONTENT_W, 4.5);
    y += 8;
  }

  // Experience
  if (filteredEmp.length > 0) {
    minimalSectionHeader("Experience");
    for (const emp of filteredEmp) {
      y = ensureSpace(pdf, y, 12);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(BLACK);
      const titleText = emp.positionTitle || "";
      pdf.text(titleText, MARGIN, y);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(LIGHT_GRAY);
      const atCompany = ` at ${emp.companyName}`;
      pdf.text(atCompany, MARGIN + pdf.getTextWidth(titleText), y);

      const dates = formatDateRange(emp.monthFrom, emp.yearFrom, emp.monthTo, emp.yearTo, emp.isCurrent ?? false);
      pdf.setFontSize(8);
      pdf.text(dates, PAGE_W - MARGIN, y, { align: "right" });
      y += 4;

      const duties = Array.isArray(emp.duties) ? emp.duties.filter((d: { id: string }) => selectedDuties.includes(d.id)).sort((a: { id: string }, b: { id: string }) => selectedDuties.indexOf(a.id) - selectedDuties.indexOf(b.id)) : [];
      if (duties.length > 0) {
        pdf.setFontSize(9);
        pdf.setTextColor(LIGHT_GRAY);
        for (const duty of duties) {
          y = drawWrapped(pdf, `• ${duty.text}`, MARGIN + 2, y, CONTENT_W - 2, 4);
        }
      }
      y += 6;
    }
    y += 2;
  }

  // Education
  if (filteredEdu.length > 0) {
    minimalSectionHeader("Education");
    for (const edu of filteredEdu) {
      y = ensureSpace(pdf, y, 8);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(BLACK);
      pdf.text(edu.institution, MARGIN, y);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(LIGHT_GRAY);
      const degreeInfo = [
        edu.diplomaType,
        edu.concentration && `in ${edu.concentration}`,
      ]
        .filter(Boolean)
        .join(" ");
      if (degreeInfo) {
        pdf.text(
          ` - ${degreeInfo}`,
          MARGIN + pdf.getTextWidth(edu.institution),
          y,
        );
      }

      const dates = `${edu.yearFrom} - ${edu.yearTo}`;
      pdf.setFontSize(8);
      pdf.text(dates, PAGE_W - MARGIN, y, { align: "right" });
      y += 6;
    }
    y += 2;
  }

  // Skills
  if (skills.length > 0) {
    minimalSectionHeader("Skills");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(GRAY);
    y = drawWrapped(pdf, skills.join(", "), MARGIN, y, CONTENT_W, 4.5);
    y += 8;
  }

  // Custom Sections
  for (const section of customSections) {
    minimalSectionHeader(section.title);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(GRAY);
    y = drawWrapped(pdf, section.content, MARGIN, y, CONTENT_W, 4.5);
    y += 8;
  }
}

// ──────────────────────────────────────────────
// Cover Letter PDF generators
// ──────────────────────────────────────────────

function generateStandardCoverLetter(pdf: jsPDF, data: CoverLetterData) {
  const {
    profile,
    recipientName,
    recipientTitle,
    companyName,
    companyAddress,
    opening,
    body,
    closing,
  } = data;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let y = MARGIN;

  // Sender info
  pdf.setFont("times", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(BLACK);
  pdf.text(`${profile.firstName} ${profile.lastName}`, MARGIN, y);
  y += 4;

  pdf.setFont("times", "normal");
  pdf.setFontSize(9);
  if (profile.address) {
    pdf.text(profile.address, MARGIN, y);
    y += 4;
  }
  if (profile.phone) {
    pdf.text(profile.phone, MARGIN, y);
    y += 4;
  }
  if (profile.email) {
    pdf.text(profile.email, MARGIN, y);
    y += 4;
  }

  y += 6;
  pdf.text(today, MARGIN, y);
  y += 8;

  // Recipient
  if (recipientName || companyName) {
    if (recipientName) {
      pdf.text(recipientName, MARGIN, y);
      y += 4;
    }
    if (recipientTitle) {
      pdf.text(recipientTitle, MARGIN, y);
      y += 4;
    }
    if (companyName) {
      pdf.text(companyName, MARGIN, y);
      y += 4;
    }
    if (companyAddress) {
      for (const line of companyAddress.split("\n")) {
        if (line.trim()) {
          pdf.text(line, MARGIN, y);
          y += 4;
        }
      }
    }
    y += 4;
  }

  // Greeting
  pdf.text(`Dear ${recipientName || "Hiring Manager"},`, MARGIN, y);
  y += 6;

  // Body paragraphs
  pdf.setFont("times", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(BLACK);

  if (opening) {
    y = drawWrapped(pdf, opening, MARGIN, y, CONTENT_W, 4);
    y += 4;
  }
  if (body) {
    y = drawWrapped(pdf, body, MARGIN, y, CONTENT_W, 4);
    y += 4;
  }
  if (closing) {
    y = drawWrapped(pdf, closing, MARGIN, y, CONTENT_W, 4);
    y += 6;
  }

  // Sign off
  pdf.text("Sincerely,", MARGIN, y);
  y += 8;
  pdf.setFont("times", "bold");
  pdf.text(`${profile.firstName} ${profile.lastName}`, MARGIN, y);
}

function generateModernCoverLetter(pdf: jsPDF, data: CoverLetterData) {
  const {
    profile,
    recipientName,
    recipientTitle,
    companyName,
    companyAddress,
    opening,
    body,
    closing,
  } = data;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Blue header band
  pdf.setFillColor(29, 78, 216);
  pdf.rect(0, 0, PAGE_W, 32, "F");

  let y = 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(18);
  pdf.setTextColor("#ffffff");
  pdf.text(`${profile.firstName} `, MARGIN, y);
  const firstW = pdf.getTextWidth(`${profile.firstName} `);
  pdf.setFont("helvetica", "bold");
  pdf.text(profile.lastName, MARGIN + firstW, y);
  y += 6;

  if (profile.positionTitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor("#93c5fd");
    pdf.text(profile.positionTitle, MARGIN, y);
    y += 4;
  }

  const contactParts: string[] = [];
  if (profile.email) contactParts.push(profile.email);
  if (profile.phone) contactParts.push(profile.phone);
  if (profile.address) contactParts.push(profile.address);
  if (contactParts.length > 0) {
    pdf.setFontSize(7);
    pdf.setTextColor("#dbeafe");
    pdf.text(contactParts.join("   "), MARGIN, y);
  }

  y = 42;

  // Date
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(LIGHT_GRAY);
  pdf.text(today, MARGIN, y);
  y += 6;

  // Recipient
  if (recipientName || companyName) {
    pdf.setFontSize(9);
    if (recipientName) {
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(BLACK);
      pdf.text(recipientName, MARGIN, y);
      y += 4;
    }
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(LIGHT_GRAY);
    if (recipientTitle) {
      pdf.text(recipientTitle, MARGIN, y);
      y += 4;
    }
    if (companyName) {
      pdf.text(companyName, MARGIN, y);
      y += 4;
    }
    if (companyAddress) {
      for (const line of companyAddress.split("\n")) {
        if (line.trim()) {
          pdf.text(line, MARGIN, y);
          y += 4;
        }
      }
    }
    y += 2;
  }

  // Greeting
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(BLACK);
  pdf.text(`Dear ${recipientName || "Hiring Manager"},`, MARGIN, y);
  y += 6;

  // Body
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(BLACK);

  if (opening) {
    y = drawWrapped(pdf, opening, MARGIN, y, CONTENT_W, 4);
    y += 4;
  }
  if (body) {
    y = drawWrapped(pdf, body, MARGIN, y, CONTENT_W, 4);
    y += 4;
  }
  if (closing) {
    y = drawWrapped(pdf, closing, MARGIN, y, CONTENT_W, 4);
    y += 6;
  }

  // Sign off with rule
  y = drawRule(pdf, y, "#e5e7eb") + 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(LIGHT_GRAY);
  pdf.text("Best regards,", MARGIN, y);
  y += 5;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(BLUE);
  pdf.text(`${profile.firstName} ${profile.lastName}`, MARGIN, y);
}

function generateMinimalCoverLetter(pdf: jsPDF, data: CoverLetterData) {
  const { profile, recipientName, companyName, opening, body, closing } = data;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let y = MARGIN;

  // Header left/right
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(BLACK);
  pdf.text(`${profile.firstName} ${profile.lastName}`, MARGIN, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(LIGHT_GRAY);
  const rightInfo: string[] = [];
  if (profile.email) rightInfo.push(profile.email);
  if (profile.phone) rightInfo.push(profile.phone);
  rightInfo.push(today);
  let ry = y - 3;
  for (const line of rightInfo) {
    pdf.text(line, PAGE_W - MARGIN, ry, { align: "right" });
    ry += 3.5;
  }

  if (profile.positionTitle) {
    y += 4;
    pdf.setFontSize(7);
    pdf.setTextColor(LIGHT_GRAY);
    pdf.text(profile.positionTitle, MARGIN, y);
  }

  y += 5;
  y = drawRule(pdf, y, "#e5e7eb") + 4;

  // To company
  if (companyName) {
    pdf.setFontSize(7);
    pdf.setTextColor(LIGHT_GRAY);
    pdf.text(`To: ${companyName}`, MARGIN, y);
    y += 5;
  }

  // Greeting
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(BLACK);
  pdf.text(`Dear ${recipientName || "Hiring Manager"},`, MARGIN, y);
  y += 6;

  // Body
  if (opening) {
    y = drawWrapped(pdf, opening, MARGIN, y, CONTENT_W, 4);
    y += 3;
  }
  if (body) {
    y = drawWrapped(pdf, body, MARGIN, y, CONTENT_W, 4);
    y += 3;
  }
  if (closing) {
    y = drawWrapped(pdf, closing, MARGIN, y, CONTENT_W, 4);
    y += 6;
  }

  // Sign off
  pdf.setTextColor(LIGHT_GRAY);
  pdf.text("Regards,", MARGIN, y);
  y += 5;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(BLACK);
  pdf.text(`${profile.firstName} ${profile.lastName}`, MARGIN, y);
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export function resumeToPDF(
  data: ResumeData,
  template: string,
  filename: string,
) {
  const pdf = new jsPDF("p", "mm", "a4");

  switch (template) {
    case "modern":
      generateModernResume(pdf, data);
      break;
    case "minimal":
      generateMinimalResume(pdf, data);
      break;
    default:
      generateClassicResume(pdf, data);
      break;
  }

  pdf.save(filename);
}

export function coverLetterToPDF(
  data: CoverLetterData,
  template: string,
  filename: string,
) {
  const pdf = new jsPDF("p", "mm", "a4");

  switch (template) {
    case "modern":
      generateModernCoverLetter(pdf, data);
      break;
    case "minimal":
      generateMinimalCoverLetter(pdf, data);
      break;
    default:
      generateStandardCoverLetter(pdf, data);
      break;
  }

  pdf.save(filename);
}
