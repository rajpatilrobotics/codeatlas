import { jsPDF } from 'jspdf';
import { sanitizePdfText } from './reportDataBuilders';

const PAGE = {
  margin: 16,
  width: 210,
  height: 297,
  footerY: 286
};

const COLORS = {
  ink: [28, 35, 48],
  muted: [92, 101, 116],
  faint: [236, 240, 245],
  border: [212, 219, 229],
  brand: [37, 99, 235],
  brandDark: [30, 64, 175],
  card: [248, 250, 252],
  white: [255, 255, 255],
  danger: [220, 38, 38],
  warning: [217, 119, 6],
  success: [22, 163, 74]
};

function setTextColor(pdf, color) {
  pdf.setTextColor(color[0], color[1], color[2]);
}

function setFillColor(pdf, color) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function setDrawColor(pdf, color) {
  pdf.setDrawColor(color[0], color[1], color[2]);
}

function getSeverityColor(value) {
  const severity = String(value || '').toLowerCase();
  if (severity === 'critical' || severity === 'high') return COLORS.danger;
  if (severity === 'medium') return COLORS.warning;
  if (severity === 'low' || severity === 'info') return COLORS.success;
  return COLORS.brand;
}

class PdfReportRenderer {
  constructor(reportData, diagrams = []) {
    this.reportData = reportData;
    this.diagramsBySection = diagrams.reduce((acc, diagram) => {
      if (!acc[diagram.sectionId]) acc[diagram.sectionId] = [];
      acc[diagram.sectionId].push(diagram);
      return acc;
    }, {});
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.y = PAGE.margin;
    this.currentSection = '';
  }

  render() {
    this.renderCover();
    this.renderTableOfContents();
    this.reportData.sections.forEach(section => this.renderSection(section));
    this.addPageNumbers();
    return this.pdf;
  }

  usableWidth() {
    return PAGE.width - PAGE.margin * 2;
  }

  addPage() {
    this.pdf.addPage();
    this.y = PAGE.margin + 8;
    this.renderRunningHeader();
  }

  ensureSpace(requiredHeight) {
    if (this.y + requiredHeight > PAGE.footerY - 6) {
      this.addPage();
    }
  }

  text(value, options = {}) {
    const {
      x = PAGE.margin,
      width = this.usableWidth(),
      size = 10,
      style = 'normal',
      color = COLORS.ink,
      lineHeight = 5,
      after = 3
    } = options;

    const text = sanitizePdfText(value, options.maxLength || 2400);
    if (!text) return 0;

    this.pdf.setFont('helvetica', style);
    this.pdf.setFontSize(size);
    setTextColor(this.pdf, color);

    const lines = this.pdf.splitTextToSize(text, width);
    const requiredHeight = lines.length * lineHeight + after;
    this.ensureSpace(requiredHeight);
    this.pdf.text(lines, x, this.y);
    this.y += requiredHeight;
    return requiredHeight;
  }

  renderRunningHeader() {
    const { meta } = this.reportData;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    setTextColor(this.pdf, COLORS.muted);
    this.pdf.text(sanitizePdfText(meta.repoName, 80), PAGE.margin, 10);
    this.pdf.text(sanitizePdfText(this.currentSection, 60), PAGE.width - PAGE.margin, 10, { align: 'right' });
    setDrawColor(this.pdf, COLORS.faint);
    this.pdf.line(PAGE.margin, 12, PAGE.width - PAGE.margin, 12);
  }

  renderCover() {
    const { meta } = this.reportData;
    setFillColor(this.pdf, [15, 23, 42]);
    this.pdf.rect(0, 0, PAGE.width, PAGE.height, 'F');

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(28);
    setTextColor(this.pdf, COLORS.white);
    this.pdf.text('CodeAtlas', PAGE.margin, 58);

    this.pdf.setFontSize(18);
    setTextColor(this.pdf, [191, 219, 254]);
    this.pdf.text('Repository Intelligence Report', PAGE.margin, 70);

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    setTextColor(this.pdf, [226, 232, 240]);
    const repoLines = this.pdf.splitTextToSize(meta.repoName, this.usableWidth());
    this.pdf.text(repoLines, PAGE.margin, 94);

    let infoY = 120;
    const coverRows = [
      ['Repository URL', meta.repoUrl || 'N/A'],
      ['Generated', meta.generatedDateLabel],
      ['Primary language', meta.primaryLanguage],
      ['Files analyzed', String(meta.fileCount)]
    ];

    coverRows.forEach(([label, value]) => {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(9);
      setTextColor(this.pdf, [147, 197, 253]);
      this.pdf.text(label.toUpperCase(), PAGE.margin, infoY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(11);
      setTextColor(this.pdf, COLORS.white);
      this.pdf.text(this.pdf.splitTextToSize(sanitizePdfText(value, 120), this.usableWidth()), PAGE.margin, infoY + 6);
      infoY += 22;
    });

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    setTextColor(this.pdf, [148, 163, 184]);
    this.pdf.text('Includes dashboard, summary, architecture, onboarding, documentation, graph intelligence, blast radius, planner, debug, heatmap, and security sections.', PAGE.margin, 258, {
      maxWidth: this.usableWidth()
    });
  }

  renderTableOfContents() {
    this.addPage();
    this.currentSection = 'Table of Contents';
    this.renderRunningHeader();
    this.y = 30;
    this.text('Table of Contents', { size: 20, style: 'bold', color: COLORS.brandDark, after: 8 });
    this.reportData.sections.forEach((section, index) => {
      this.text(`${index + 1}. ${section.title}`, {
        size: 11,
        style: 'bold',
        after: 1
      });
      this.text(section.subtitle || section.summary || '', {
        x: PAGE.margin + 6,
        width: this.usableWidth() - 6,
        size: 9,
        color: COLORS.muted,
        after: 3,
        maxLength: 180
      });
    });
  }

  renderSection(section) {
    this.currentSection = section.title;
    this.addPage();
    this.renderSectionHeader(section);
    this.renderMetrics(section.metrics || []);
    this.renderDiagrams(section);
    this.renderTables(section.tables || []);
    this.renderLists(section.lists || []);
    this.renderNotes(section.notes || []);
  }

  renderSectionHeader(section) {
    this.text(section.title, { size: 18, style: 'bold', color: COLORS.brandDark, after: 3 });
    if (section.subtitle) {
      this.text(section.subtitle, { size: 10, style: 'bold', color: COLORS.muted, after: 4 });
    }
    if (section.summary) {
      this.text(section.summary, { size: 10, color: COLORS.ink, lineHeight: 5, after: 6 });
    }
    setDrawColor(this.pdf, COLORS.border);
    this.pdf.line(PAGE.margin, this.y, PAGE.width - PAGE.margin, this.y);
    this.y += 8;
  }

  renderMetrics(metrics) {
    if (!metrics.length) return;

    const gap = 4;
    const columns = 3;
    const cardWidth = (this.usableWidth() - gap * (columns - 1)) / columns;
    const cardHeight = 22;

    metrics.forEach((item, index) => {
      if (index % columns === 0) this.ensureSpace(cardHeight + 5);
      const column = index % columns;
      const x = PAGE.margin + column * (cardWidth + gap);
      const y = this.y;

      setFillColor(this.pdf, COLORS.card);
      setDrawColor(this.pdf, COLORS.border);
      this.pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(7);
      setTextColor(this.pdf, COLORS.muted);
      this.pdf.text(sanitizePdfText(item.label, 34).toUpperCase(), x + 4, y + 6);

      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      setTextColor(this.pdf, getSeverityColor(item.value));
      this.pdf.text(this.pdf.splitTextToSize(sanitizePdfText(item.value, 42), cardWidth - 8), x + 4, y + 13);

      if (item.detail) {
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(7);
        setTextColor(this.pdf, COLORS.muted);
        this.pdf.text(this.pdf.splitTextToSize(sanitizePdfText(item.detail, 44), cardWidth - 8), x + 4, y + 19);
      }

      if (column === columns - 1 || index === metrics.length - 1) {
        this.y += cardHeight + 5;
      }
    });

    this.y += 3;
  }

  renderDiagrams(section) {
    const diagrams = this.diagramsBySection[section.id] || [];
    if (!diagrams.length && section.diagramTypes?.length) {
      this.renderInfoBox('Diagram snapshots were not available for this section. The structured summary and tables above remain available.');
      return;
    }

    diagrams.forEach(diagram => {
      this.ensureSpace(76);
      this.text(diagram.title, { size: 11, style: 'bold', after: 2 });

      try {
        const props = this.pdf.getImageProperties(diagram.image);
        const imageWidth = this.usableWidth();
        const imageHeight = Math.min(100, imageWidth * (props.height / props.width));
        this.ensureSpace(imageHeight + 8);
        this.pdf.addImage(diagram.image, 'PNG', PAGE.margin, this.y, imageWidth, imageHeight, undefined, 'FAST');
        this.y += imageHeight + 8;
      } catch (error) {
        this.renderInfoBox('This diagram could not be embedded, but the data summary is still included.');
      }
    });
  }

  renderInfoBox(message) {
    this.ensureSpace(18);
    setFillColor(this.pdf, [239, 246, 255]);
    setDrawColor(this.pdf, [191, 219, 254]);
    this.pdf.roundedRect(PAGE.margin, this.y, this.usableWidth(), 14, 2, 2, 'FD');
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    setTextColor(this.pdf, COLORS.brandDark);
    this.pdf.text(this.pdf.splitTextToSize(sanitizePdfText(message, 180), this.usableWidth() - 8), PAGE.margin + 4, this.y + 6);
    this.y += 18;
  }

  renderTables(tables) {
    tables.forEach(item => {
      this.renderTable(item);
    });
  }

  renderTable(table) {
    if (!table?.rows?.length) return;

    this.text(table.title, { size: 12, style: 'bold', color: COLORS.brandDark, after: 3 });

    const columnCount = table.headers.length;
    const columnWidth = this.usableWidth() / columnCount;
    const lineHeight = 4;
    const padding = 3;

    const drawHeader = () => {
      this.ensureSpace(12);
      setFillColor(this.pdf, [226, 232, 240]);
      setDrawColor(this.pdf, COLORS.border);
      this.pdf.rect(PAGE.margin, this.y, this.usableWidth(), 9, 'FD');
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(7.5);
      setTextColor(this.pdf, COLORS.ink);
      table.headers.forEach((header, index) => {
        this.pdf.text(sanitizePdfText(header, 40), PAGE.margin + index * columnWidth + padding, this.y + 6);
      });
      this.y += 9;
    };

    drawHeader();

    table.rows.forEach((row, rowIndex) => {
      const cellLines = row.map(cell => this.pdf.splitTextToSize(sanitizePdfText(cell, 260), columnWidth - padding * 2).slice(0, 4));
      const rowHeight = Math.max(10, Math.max(...cellLines.map(lines => lines.length)) * lineHeight + padding * 2);
      if (this.y + rowHeight > PAGE.footerY - 8) {
        this.addPage();
        drawHeader();
      }

      setFillColor(this.pdf, rowIndex % 2 === 0 ? COLORS.white : [248, 250, 252]);
      setDrawColor(this.pdf, COLORS.faint);
      this.pdf.rect(PAGE.margin, this.y, this.usableWidth(), rowHeight, 'FD');

      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(7.5);
      setTextColor(this.pdf, COLORS.ink);
      cellLines.forEach((lines, index) => {
        this.pdf.text(lines, PAGE.margin + index * columnWidth + padding, this.y + padding + 3);
      });

      this.y += rowHeight;
    });

    if (table.note) {
      this.text(table.note, { size: 8, color: COLORS.muted, after: 5 });
    } else {
      this.y += 5;
    }
  }

  renderLists(lists) {
    lists.forEach(item => {
      if (!item?.items?.length) return;
      this.text(item.title, { size: 12, style: 'bold', color: COLORS.brandDark, after: 2 });
      if (item.note) {
        this.text(item.note, { size: 8, color: COLORS.muted, after: 2 });
      }

      item.items.forEach(value => {
        const cleanValue = sanitizePdfText(value, 520);
        const lines = this.pdf.splitTextToSize(cleanValue, this.usableWidth() - 6);
        this.ensureSpace(lines.length * 4 + 4);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(8.5);
        setTextColor(this.pdf, COLORS.ink);
        this.pdf.text('-', PAGE.margin, this.y);
        this.pdf.text(lines, PAGE.margin + 5, this.y);
        this.y += lines.length * 4 + 2;
      });
      this.y += 4;
    });
  }

  renderNotes(notes) {
    notes.forEach(note => this.renderInfoBox(note));
  }

  addPageNumbers() {
    const pageCount = this.pdf.internal.getNumberOfPages();

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      this.pdf.setPage(pageNumber);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(8);
      setTextColor(this.pdf, pageNumber === 1 ? [148, 163, 184] : COLORS.muted);
      this.pdf.text(`Page ${pageNumber} of ${pageCount}`, PAGE.width - PAGE.margin, PAGE.footerY, { align: 'right' });
      if (pageNumber > 1) {
        this.pdf.text('CodeAtlas PDF Report', PAGE.margin, PAGE.footerY);
      }
    }
  }
}

export function renderPdfReport(reportData, diagrams = []) {
  return new PdfReportRenderer(reportData, diagrams).render();
}
