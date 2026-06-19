const crypto = require("crypto");
const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");

exports.addSigner = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    if (!document.owner || document.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const alreadyExists = document.signers.some(
      (signer) => signer.email.toLowerCase() === normalizedEmail
    );

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message: "Signer already added.",
      });
    }

    if (!document.signingToken) {
      document.signingToken = crypto.randomUUID();
    }

    document.signers.push({
      email: normalizedEmail,
      status: "Pending",
    });

    await document.save();

    await AuditLog.create({
      document: document._id,
      user: req.user.id,
      action: `Signer invited: ${normalizedEmail}`,
    });

    res.json({
      success: true,
      message: "Signer added successfully 🎉",
      signers: document.signers,
      signingLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/sign/${document.signingToken}`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.getDocumentBySigningToken = async (req, res) => {
  try {
    const { token } = req.params;

    const document = await Document.findOne({
      signingToken: token,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Invalid signing link.",
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
      message: "Could not open signing link.",
    });
  }
};

exports.addSignatureBySigningToken = async (req, res) => {
  try {
    const { token } = req.params;

    const {
      signerEmail,
      type = "text",
      text = "",
      imageData = "",
      x,
      y,
    } = req.body;

    if (!signerEmail || !signerEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: "Signer email is required.",
      });
    }

    if (x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: "Signature position is required.",
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

    const document = await Document.findOne({
      signingToken: token,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Invalid signing link.",
      });
    }

    const normalizedEmail = signerEmail.trim().toLowerCase();

    const signer = document.signers.find(
      (item) => item.email.toLowerCase() === normalizedEmail
    );

    if (!signer) {
      return res.status(403).json({
        success: false,
        message: "This email was not invited to sign the document.",
      });
    }

    if (signer.status === "Signed") {
      return res.status(409).json({
        success: false,
        message: "This signer has already signed the document.",
      });
    }

    document.signatures.push({
      type,
      text,
      imageData,
      x,
      y,
    });

    signer.status = "Signed";
    document.markModified("signers");

    const allSigned =
      document.signers.length > 0 &&
      document.signers.every((item) => item.status === "Signed");

    const someSigned = document.signers.some(
      (item) => item.status === "Signed"
    );

    if (allSigned) {
      document.status = "Signed";
    } else if (someSigned || document.signatures.length > 0) {
      document.status = "Partially Signed";
    } else {
      document.status = "Pending";
    }

    await document.save();
	await AuditLog.create({
  document: document._id,
  user: document.owner,
  action: `Document signed by ${normalizedEmail}`,
});

    res.json({
      success: true,
      message: "Document signed successfully 🎉",
      signatures: document.signatures,
      signers: document.signers,
      status: document.status,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not sign the document.",
    });
  }
};
