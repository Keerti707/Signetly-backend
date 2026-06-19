const AuditLog = require("../models/AuditLog");
const Document = require("../models/Document");

exports.getAuditLogs = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findOne({
      _id: documentId,
      owner: req.user.id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const logs = await AuditLog.find({ document: documentId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not fetch audit logs.",
    });
  }
};
