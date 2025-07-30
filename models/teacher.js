const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose= require("passport-local-mongoose");

const teacherSchema = new Schema({
    username: {type: String, required: true},
    email: { type: String, required: true, unique: true },
    created_classrooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Classroom" }]
}, { timestamps: true });

teacherSchema.plugin(passportLocalMongoose);
module.exports= mongoose.model("Teacher", teacherSchema);
