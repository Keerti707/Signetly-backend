const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");

function getIpAddress(req) {
    return (
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress ||
        "Unknown"
    );
}

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a PDF file.",
            });
        }

        const document = await Document.create({
            filename: req.file.filename,
            originalName: req.file.originalname,
            owner: req.user.id,
        });

        await AuditLog.create({
            document: document._id,
            user: req.user.id,
            action: "Document uploaded",
            ipAddress: getIpAddress(req),
        });

        res.status(201).json({
            success: true,
            message: "PDF uploaded successfully! 📄",
            document,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Document upload failed.",
        });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ owner: req.user.id }).sort({
            createdAt: -1,
        });

        for (const document of documents) {
            if (document.signatures.length > 0 && document.status === "Pending") {
                document.status = "Partially Signed";
                await document.save();
            }

            if (document.signatures.length === 0 && document.status !== "Pending") {
                document.status = "Pending";
                await document.save();
            }
        }

        res.json({
            success: true,
            documents,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not fetch documents.",
        });
    }
};
exports.getDocumentById = async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        res.json({
            success: true,
            document: {
                _id: document._id,
                originalName: document.originalName,
                status: document.status,
                signatures: document.signatures,
                signers: document.signers,
            },
            fileUrl: `${process.env.BACKEND_URL || "http://localhost:5000"}/uploads/${encodeURIComponent(
                document.filename
            )}`,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not fetch document.",
        });
    }
};
exports.deleteDocument = async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        await Document.deleteOne({ _id: document._id });

        res.json({
            success: true,
            message: "Document deleted successfully.",
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not delete document.",
        });
    }
};