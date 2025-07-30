


const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
    title: String,
    description: String,
    assignmentFile:{
        url:String,
        filename:String,
        originalName:String,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher"
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class"
    },
    deadline: Date
}, { timestamps: true });

module.exports = mongoose.model("Assignment", assignmentSchema);