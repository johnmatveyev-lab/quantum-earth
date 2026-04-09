import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generatePDF(elementId: string, title: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) throw new Error('Element not found');

    const canvas = await html2canvas(element, {
        backgroundColor: '#0a0a0f',
        scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Header
    pdf.setFontSize(18);
    pdf.setTextColor(0, 212, 255);
    pdf.text('ORBITAL COMMAND', 14, 15);
    pdf.setFontSize(12);
    pdf.setTextColor(150, 150, 150);
    pdf.text(title, 14, 22);
    pdf.setFontSize(8);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Content
    pdf.addImage(imgData, 'PNG', 10, 35, pdfWidth - 20, pdfHeight - 20);

    pdf.save(`orbital-command-${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}
