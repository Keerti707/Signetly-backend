const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const Document = require("../models/Document");

exports.downloadSignedPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const pdfPath = path.join(__dirname, "..", "uploads", document.filename);
    const existingPdfBytes = fs.readFileSync(pdfPath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    const page = pages[0];
    const pageHeight = page.getHeight();

    for (const sig of document.signatures) {
      if (sig.type === "image" && sig.imageData) {
        const base64Data = sig.imageData.split(",")[1];
        const imageBytes = Buffer.from(base64Data, "base64");

        const image = await pdfDoc.embedPng(imageBytes);

        page.drawImage(image, {
          x: sig.x,
          y: pageHeight - sig.y - 60,
          width: 160,
          height: 60,
        });
      } else {
        page.drawText(sig.text, {
          x: sig.x,
          y: pageHeight - sig.y,
          size: 18,
          font,
          color: rgb(0.35, 0.1, 0.8),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="signed-${document.originalName}"`
    );

    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to generate signed PDF.",
    });
  }
};