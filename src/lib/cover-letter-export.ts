import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { coverLetterToPDF } from "@/lib/pdf-capture";
import type { CoverLetterData } from "@/components/cover-letter/templates";

export function exportCoverLetterToPDF(
  data: CoverLetterData,
  template: string,
  filename: string
) {
  coverLetterToPDF(data, template, filename);
}

export async function exportCoverLetterToDocx(
  data: CoverLetterData,
  filename: string
) {
  const { profile, recipientName, recipientTitle, companyName, companyAddress, opening, body, closing } = data;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const children: Paragraph[] = [];

  // Sender info
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${profile.firstName} ${profile.lastName}`,
          bold: true,
          size: 22,
        }),
      ],
    })
  );
  if (profile.address) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: profile.address, size: 20 })],
      })
    );
  }
  if (profile.phone) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: profile.phone, size: 20 })],
      })
    );
  }
  if (profile.email) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: profile.email, size: 20 })],
      })
    );
  }

  children.push(
    new Paragraph({ spacing: { before: 200, after: 200 } })
  );

  // Date
  children.push(
    new Paragraph({
      children: [new TextRun({ text: today, size: 20 })],
      spacing: { after: 200 },
    })
  );

  // Recipient
  if (recipientName) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: recipientName, size: 20 })],
      })
    );
  }
  if (recipientTitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: recipientTitle, size: 20 })],
      })
    );
  }
  if (companyName) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: companyName, size: 20 })],
      })
    );
  }
  if (companyAddress) {
    for (const line of companyAddress.split("\n")) {
      if (line.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 20 })],
          })
        );
      }
    }
  }

  children.push(
    new Paragraph({ spacing: { before: 200, after: 200 } })
  );

  // Greeting
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Dear ${recipientName || "Hiring Manager"},`,
          size: 20,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // Body paragraphs
  if (opening) {
    for (const line of opening.split("\n")) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 20 })],
          spacing: { after: 100 },
        })
      );
    }
    children.push(new Paragraph({ spacing: { after: 100 } }));
  }

  if (body) {
    for (const line of body.split("\n")) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 20 })],
          spacing: { after: 100 },
        })
      );
    }
    children.push(new Paragraph({ spacing: { after: 100 } }));
  }

  if (closing) {
    for (const line of closing.split("\n")) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 20 })],
          spacing: { after: 100 },
        })
      );
    }
  }

  children.push(
    new Paragraph({ spacing: { before: 200 } })
  );

  // Sign off
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Sincerely,", size: 20 })],
      spacing: { after: 200 },
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${profile.firstName} ${profile.lastName}`,
          bold: true,
          size: 20,
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, filename);
}
