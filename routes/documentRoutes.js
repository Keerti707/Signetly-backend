const express = require("express");
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");
const {
  addSigner,
  getDocumentBySigningToken,
  addSignatureBySigningToken,
} = require("../controllers/signerController");
const {
    uploadDocument,
    getDocuments,
    getDocumentById,
    deleteDocument,
} = require("../controllers/documentController");

const {
    addSignature,
    updateSignature,
    deleteSignature,
} = require("../controllers/signatureController");

const { downloadSignedPdf } = require("../controllers/pdfController");

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    },
});

const fileFilter = function (req, file, cb) {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed."), false);
    }
};

const upload = multer({ storage, fileFilter });

router.get("/", authMiddleware, getDocuments);
router.get("/sign/:token", getDocumentBySigningToken);
router.post("/sign/:token/signature", addSignatureBySigningToken);
router.get("/:id/download", authMiddleware, downloadSignedPdf);
router.get("/:id", authMiddleware, getDocumentById);

router.post("/upload", authMiddleware, upload.single("document"), uploadDocument);
router.post("/:id/signatures", authMiddleware, addSignature);
router.post("/:id/signers", authMiddleware, addSigner);
router.patch("/:id/signatures/:index", authMiddleware, updateSignature);
router.delete("/:id/signatures/:index", authMiddleware, deleteSignature);
router.delete("/:id", authMiddleware, deleteDocument);


module.exports = router;