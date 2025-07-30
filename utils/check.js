require('dotenv').config();
const mongoose = require('mongoose');

// 1. LOAD ALL MODELS FIRST - CRITICAL!
require('../models/student');      // Your student model
require('../models/teacher');     // Needed for Assignment
require('../models/classroom');   // Your classroom model
require('../models/assingment');  // Your assignment model
const AssignmentSubmission = require('../models/assignmentSubmission');

const MONGO_URL = "mongodb://127.0.0.1:27017/classroom";

async function main() {
  try {
    // 2. CONNECT WITH PROPER OPTIONS
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB connected');

    // 3. RUN THE QUERY WITH EXPLICIT POPULATION
    await logStudentSubmissionUrls("680a89bc236a7bfa6310c995");
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // 4. CLEAN UP CONNECTION
    await mongoose.disconnect();
    console.log('Connection closed');
  }
}

async function logStudentSubmissionUrls(assignmentId) {
  try {
    console.log(`🔍 Fetching submissions for assignment: ${assignmentId}`);

    // 5. USE DEEP POPULATION WITH MODEL SPECIFICATION
    const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
      .populate({
        path: 'student',
        select: 'username email',
        model: 'Student' // Explicit model reference
      })
      .populate({
        path: 'assignment',
        select: 'title deadline',
        model: 'Assignment'
      })
      .maxTimeMS(30000); // 30 second timeout

    if (!submissions.length) {
      console.log('No submissions found');
      return;
    }

    // 6. LOG ENHANCED RESULTS
    console.log(`\n📝 Found ${submissions.length} submissions:`);
    submissions.forEach((sub, i) => {
      console.log(`\n#${i+1} ${sub.student?.username || 'Anonymous'}`);
      console.log(`📧 Email: ${sub.student?.email || 'No email'}`);
      console.log(`📝 Assignment: ${sub.assignment?.title || 'Untitled'} (Due: ${sub.assignment?.deadline || 'No deadline'})`);
      console.log(`📁 File: ${sub.fileUrl.filename}`);
      console.log(`🔗 URL: ${sub.fileUrl.url}`);
      console.log(`⏰ Submitted: ${sub.submittedAt}`);
    });

  } catch (error) {
    console.error('Query failed:', error.message);
    // 7. SPECIFIC ERROR HANDLING
    if (error.message.includes('buffering timed out')) {
      console.log('Tip: Check if MongoDB server is running');
    }
  }
}

// 8. RUN THE SCRIPT
main();