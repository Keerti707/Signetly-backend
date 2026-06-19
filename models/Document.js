const mongoose = require("mongoose");

const signatureSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["text", "image"],
            default: "text",
        },
        text: {
            type: String,
            default: "",
        },
        imageData: {
            type: String,
            default: "",
        },
        x: {
            type: Number,
            required: true,
        },
        y: {
            type: Number,
            required: true,
        },
    },
    { _id: false }
);

const signerSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Signed"],
            default: "Pending",
        },
    },
    { _id: false }
);

const documentSchema = new mongoose.Schema(
    {
        filename: {
            type: String,
            required: true,
        },

        originalName: {
            type: String,
            required: true,
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: ["Pending", "Partially Signed", "Signed", "Rejected"],
            default: "Pending",
        },

        signers: {
            type: [signerSchema],
            default: [],
        },

        signingToken: {
            type: String,
            default: "",
        },

        signatures: {
            type: [signatureSchema],
            default: [],
        },
    },
    {
        timestamps: true,
        optimisticConcurrency: false,
    }
);

module.exports = mongoose.model("Document", documentSchema);