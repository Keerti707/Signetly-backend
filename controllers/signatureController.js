const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
function getIpAddress(req) {
    return (
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress ||
        "Unknown"
    );
}

function isOwner(document, userId) {
    return document.owner && document.owner.toString() === userId;
}

exports.addSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const { type = "text", text = "", imageData = "", x, y } = req.body;

        if (x === undefined || y === undefined) {
            return res.status(400).json({
                success: false,
                message: "x and y are required.",
            });
        }

        if (type === "text" && !text.trim()) {
            return res.status(400).json({
                success: false,
                message: "Signature text is required.",
            });
        }

        if (type === "image" && !imageData) {
            return res.status(400).json({
                success: false,
                message: "Signature image is required.",
            });
        }

        const document = await Document.findById(id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        if (!isOwner(document, req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        document.signatures.push({
            type,
            text,
            imageData,
            x,
            y,
        });

        if (document.signatures.length > 0) {
            document.status = "Partially Signed";
        }
        await document.save();

        await AuditLog.create({
            document: document._id,
            user: req.user.id,
            action: "Signature added",
            ipAddress: getIpAddress(req),
        });
        res.json({
            success: true,
            message: "Signature added successfully ✍️",
            signatures: document.signatures,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

exports.updateSignature = async (req, res) => {
    try {
        const { id, index } = req.params;
        const { x, y } = req.body;

        const document = await Document.findById(id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        if (!isOwner(document, req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        if (!document.signatures[index]) {
            return res.status(404).json({
                success: false,
                message: "Signature not found.",
            });
        }

        document.signatures[index].x = x;
        document.signatures[index].y = y;

        await document.save();

        await AuditLog.create({
            document: document._id,
            user: req.user.id,
            action: "Signature moved",
            ipAddress: getIpAddress(req),
        });

        res.json({
            success: true,
            message: "Signature position updated ✨",
            signatures: document.signatures,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not update signature.",
        });
    }
};

exports.deleteSignature = async (req, res) => {
    try {
        const { id, index } = req.params;

        const document = await Document.findById(id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found.",
            });
        }

        if (!isOwner(document, req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        if (!document.signatures[index]) {
            return res.status(404).json({
                success: false,
                message: "Signature not found.",
            });
        }

        document.signatures.splice(Number(index), 1);

        if (document.signatures.length === 0) {
            document.status = "Pending";
        } else {
            document.status = "Partially Signed";
        }

        await document.save();

        await AuditLog.create({
            document: document._id,
            user: req.user.id,
            action: "Signature deleted",
            ipAddress: getIpAddress(req),
        });

        res.json({
            success: true,
            message: "Signature deleted successfully 🗑️",
            signatures: document.signatures,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not delete signature.",
        });
    }
};