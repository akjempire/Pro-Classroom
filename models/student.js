const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose= require("passport-local-mongoose");

const studentSchema = new Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    joined_classrooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Classroom" }]
}, { timestamps: true });

studentSchema.plugin(passportLocalMongoose);
module.exports= mongoose.model("Student", studentSchema);