const natural = require('natural');
const AssignmentSubmission = require('../models/assignmentSubmission');
const { cloudinary } = require('../CloudConfig');
const axios = require('axios');
const pdf = require('pdf-parse/lib/pdf-parse'); 
const mammoth = require('mammoth');

// Suppress TT warnings if they persist
process.env.TT_DEBUG = '0';

class PlagiarismService {
  constructor() {
    this.similarityThreshold = 0.7;
    this.tokenizer = new natural.WordTokenizer();
  }

  async checkPlagiarismForAssignment(assignmentId, classroomId) {
    try {
        const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
        .populate('student', 'username email')
        .populate('assignment', 'title')
        .select('-classroom');

      // Process submissions
      const texts = await Promise.all(
        submissions.map(async submission => ({
          submissionId: submission._id,
          student: submission.student,
          text: await this.extractTextFromUrl(submission.fileUrl.url)
        }))
      );

      // Compare texts
      const comparisons = [];
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          if (texts[i].text && texts[j].text) {
            const similarity = this.calculateSimilarity(texts[i].text, texts[j].text);
            if (similarity > this.similarityThreshold) {
              comparisons.push({
                student1: texts[i].student._id,
                student2: texts[j].student._id,
                similarity: Math.round(similarity * 100)
              });
            }
          }
        }
      }

      return {
        assignment: assignmentId,
        classroom: classroomId,
        comparisons,
        totalSubmissions: submissions.length
      };

    } catch (error) {
      console.error('Plagiarism check failed:', error);
      throw error;
    }
  }

  async extractTextFromUrl(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      if (url.endsWith('.pdf')) {
        const data = await pdf(buffer);

        console.log("data got");
        
        return data.text;
      } else if (url.endsWith('.docx')) {
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
      }
      return buffer.toString('utf-8');
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      return '';
    }
  }

  calculateSimilarity(text1, text2) {
    const set1 = new Set(this.tokenizer.tokenize(text1.toLowerCase()));
    const set2 = new Set(this.tokenizer.tokenize(text2.toLowerCase()));
    const intersection = new Set([...set1].filter(x => set2.has(x))).size;
    const union = new Set([...set1, ...set2]).size;
    return union > 0 ? intersection / union : 0;
  }
}

module.exports = new PlagiarismService();