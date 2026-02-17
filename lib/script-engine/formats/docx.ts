/**
 * LEXA Script Engine - DOCX Document Generator
 *
 * Generates downloadable DOCX documents from Stage outputs.
 * Uses the 'docx' npm package.
 *
 * NOTE: Install docx before using: npm install docx
 */

import type { Stage2Output, Stage5Output } from "../types";

/**
 * Generate a Stage 2 Experience Script as a DOCX buffer.
 * Returns the raw buffer that can be sent as a file download.
 */
export async function generateStage2Docx(data: Stage2Output): Promise<Buffer> {
  // Dynamic import so the app does not crash if docx is not installed yet
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } =
    await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];

  // Cover page
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "LEXA Curated Experiences", size: 20, color: "888888" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 100 },
      children: [
        new TextRun({
          text: data.cover.experience_name.toUpperCase() + "\u2122",
          bold: true,
          size: 48,
          color: "101830",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: data.cover.tagline, italics: true, size: 24, color: "666666" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `${data.cover.journey_type} \u00B7 ${data.cover.region} \u00B7 ${data.cover.duration}`,
          size: 18,
          color: "999999",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "D4AF37" } },
      children: [
        new TextRun({ text: `"${data.cover.hook}"`, italics: true, size: 20, color: "444444" }),
      ],
    })
  );

  // Philosophy
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(data.philosophy.title)] }),
    new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: data.philosophy.content, size: 22 })] })
  );

  // Arc overview
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(data.arc.title)] })
  );
  for (const phase of data.arc.phases) {
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({ text: `${phase.name} (${phase.days})`, bold: true, size: 24 }),
          new TextRun({ text: ` \u2014 ${phase.emotional_core}`, italics: true, size: 22 }),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: phase.description, size: 20, color: "555555" })] })
    );
  }

  // Days
  for (const day of data.days) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`DAY ${day.day_number}: ${day.title.toUpperCase()}`)] }),
      new Paragraph({
        children: [new TextRun({ text: `Phase: ${day.phase} \u00B7 Emotional Core: ${day.emotional_core}`, size: 18, color: "888888" })],
      }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: day.narrative, size: 22 })] }),
      new Paragraph({
        spacing: { after: 300 },
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" } },
        children: [new TextRun({ text: `Memory Anchor: "${day.memory_anchor}"`, italics: true, size: 20, color: "D4AF37" })],
      })
    );

    for (const exp of day.experiences) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `\u2022 `, size: 20 }),
            new TextRun({ text: exp.poi_name ? `${exp.poi_name} \u2014 ` : "", bold: true, size: 20 }),
            new TextRun({ text: exp.description, size: 20 }),
          ],
        })
      );
    }
  }

  // Signature Experiences
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("SIGNATURE EXPERIENCES")] })
  );
  for (const exp of data.signature_experiences) {
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: `${exp.number}  ${exp.title}`, bold: true, size: 22 })],
      }),
      new Paragraph({ children: [new TextRun({ text: exp.description, size: 20, color: "444444" })] })
    );
  }

  // Kit
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(data.kit.title)] }),
    new Paragraph({ children: [new TextRun({ text: data.kit.subtitle, italics: true, size: 20 })] })
  );
  for (const item of data.kit.items) {
    children.push(
      new Paragraph({
        spacing: { before: 150 },
        children: [
          new TextRun({ text: `\u25C8 ${item.name}`, bold: true, size: 20 }),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: item.description, size: 20, color: "555555" })] })
    );
  }

  // Closing
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [new TextRun({ text: data.closing.title, bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: data.closing.content, italics: true, size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${data.closing.experience_name}\u2122`, bold: true, size: 28, color: "101830" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.closing.tagline, italics: true, size: 20, color: "D4AF37" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: "A LEXA Curated Experience", size: 16, color: "999999" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Never Ask 'Now What?' Again.", italics: true, size: 16, color: "999999" })],
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Generate a Stage 5 Broker Teaser as a DOCX buffer.
 */
export async function generateStage5Docx(data: Stage5Output): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } =
    await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];

  // Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: data.header.brand, size: 18, color: "999999" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${data.header.region} \u00B7 ${data.header.season} \u00B7 ${data.header.duration}`,
          size: 16,
          color: "AAAAAA",
        }),
      ],
    })
  );

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: data.title.experience_name.toUpperCase() + "\u2122",
          bold: true,
          size: 44,
          color: "101830",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: data.title.tagline, italics: true, size: 24, color: "666666" })],
    })
  );

  // Hook
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "D4AF37" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "D4AF37" },
      },
      children: [
        new TextRun({ text: data.hook.lines.join(" "), italics: true, size: 22, color: "333333" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: data.hook.pivot, italics: true, size: 22, color: "D4AF37" })],
    })
  );

  // Description
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(data.description.title)] }),
    new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: data.description.content, size: 22 })] })
  );

  // Highlights
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(data.highlights.title)] }),
    new Paragraph({ children: [new TextRun({ text: data.highlights.subtitle, italics: true, size: 20 })] })
  );
  for (const item of data.highlights.items) {
    children.push(
      new Paragraph({
        spacing: { before: 150 },
        children: [
          new TextRun({ text: `${item.icon} ${item.title}`, bold: true, size: 22 }),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: item.description, size: 20, color: "555555" })] })
    );
  }

  // Target Profile
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(data.target_profile.title)] }),
    new Paragraph({ children: [new TextRun({ text: data.target_profile.subtitle, italics: true, size: 20 })] })
  );
  for (const criterion of data.target_profile.criteria) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: `\u25C6 ${criterion}`, size: 20 })] })
    );
  }

  // Voyage Details
  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 400 }, children: [new TextRun("VOYAGE DETAILS")] }),
    new Paragraph({ children: [new TextRun({ text: `Duration: ${data.voyage_details.duration}`, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: `Region: ${data.voyage_details.region}`, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: `Season: ${data.voyage_details.season}`, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: `Embarkation: ${data.voyage_details.embarkation}`, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: `Type: ${data.voyage_details.experience_type}`, size: 20 })] })
  );

  // Closing
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      children: [new TextRun({ text: `"${data.closing.quote}"`, italics: true, size: 22, color: "D4AF37" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: data.closing.content, size: 20, color: "444444" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.closing.cta, size: 18, color: "888888" })],
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return await Packer.toBuffer(doc);
}
