// services/plagiarismService.js
const fs = require("fs");
const path = require("path");
const natural = require('natural');
const AssignmentSubmission = require('../models/assignmentSubmission');
const PlagiarismReport = require('../models/PlagiarismReport');
const axios = require('axios');
const pdf = require('pdf-parse/lib/pdf-parse');
const mammoth = require('mammoth');
const stopword = require('stopword');

class PlagiarismService {
  constructor() {
    // similarityThreshold is used for flagging overall pair
    this.similarityThreshold = 0.25; // 25% as baseline (tuneable)
    this.extractFolder = path.join(__dirname, "..", "extractedTexts");

    if (!fs.existsSync(this.extractFolder)) {
      fs.mkdirSync(this.extractFolder, { recursive: true });
    }
  }

  // --- High-level: run whole pipeline for an assignment
  async checkPlagiarismForAssignment(assignmentId, classroomId) {
    try {
      const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
        .populate('student', 'username email')
        .populate('assignment', 'title');

      if (!submissions || submissions.length < 2) {
        // nothing to compare
        return { assignment: assignmentId, classroom: classroomId, results: [], totalSubmissions: submissions.length || 0 };
      }

      // existing report if any
      let report = await PlagiarismReport.findOne({ assignment: assignmentId });
      const existingResults = report ? [...report.results] : [];
      const comparedPairs = new Set(existingResults.map(r => {
        const pair = [r.student1.toString(), r.student2.toString()].sort().join('_');
        return pair;
      }));

      // extract raw text and cleaned text for every submission; save raw text to file
      const docs = await Promise.all(submissions.map(async sub => {
        const raw = await this.extractTextFromUrl(sub.fileUrl.url);
        const cleaned = this.preprocessText(raw);
        const filePath = path.join(this.extractFolder, `${sub._id}.txt`);
        try { fs.writeFileSync(filePath, raw || '', "utf8"); } catch (e) { console.error("write extract failed", e); }
        return { submissionId: sub._id, student: sub.student, rawText: raw || "", cleanedText: cleaned, filePath };
      }));

      const results = [...existingResults];

      // pairwise compare (only new pairs)
      for (let i = 0; i < submissions.length; i++) {
        for (let j = i + 1; j < submissions.length; j++) {
          const s1 = submissions[i];
          const s2 = submissions[j];
          const key = [s1.student._id.toString(), s2.student._id.toString()].sort().join('_');
          if (comparedPairs.has(key)) continue;

          const d1 = docs.find(d => d.submissionId.equals(s1._id));
          const d2 = docs.find(d => d.submissionId.equals(s2._id));
          if (!d1 || !d2) continue;

          // overall doc similarity using TF-IDF + cosine
          const simScore = this.tfidfCosineSimilarity(d1.cleanedText, d2.cleanedText);
          const simPct = Math.round(simScore * 100);

          // sentence-level matched content
          const matchedSentences = this.getSentenceMatches(
            d1.rawText,
            d2.rawText,
            simScore >= 0.80   // fallback only when doc similarity is very high
          );

          results.push({
            student1: s1.student._id,
            student2: s2.student._id,
            similarity: simPct,
            details: `Similarity detected between ${s1.student.username} and ${s2.student.username}`,
            flagged: simScore >= this.similarityThreshold,
            matchedContent: matchedSentences,
            file1: d1.filePath,
            file2: d2.filePath
          });

          comparedPairs.add(key);
        }
      }

      // save report (update or create)
      if (report) {
        report.results = results;
        report.generatedAt = new Date();
        await report.save();
      } else {
        report = await PlagiarismReport.create({
          assignment: assignmentId,
          classroom: classroomId,
          results,
          generatedAt: new Date()
        });
      }

      return report;

    } catch (err) {
      console.error("PlagiarismService.checkPlagiarismForAssignment error:", err);
      throw err;
    }
  }

  // --- extract raw text from url
  async extractTextFromUrl(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      if (typeof url === 'string' && url.toLowerCase().endsWith('.pdf')) {
        const data = await pdf(buffer);
        return data.text || '';
      } else if (typeof url === 'string' && url.toLowerCase().endsWith('.docx')) {
        const { value } = await mammoth.extractRawText({ buffer });
        return value || '';
      }
      return buffer.toString('utf8') || '';
    } catch (e) {
      console.error("extractTextFromUrl error:", e);
      return '';
    }
  }

  // --- simple cleaning + stopword removal for TF-IDF
  preprocessText(text) {
    if (!text) return '';
    const lowered = text.toLowerCase();
    const cleaned = lowered.replace(/[^a-z0-9\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    return stopword.removeStopwords(tokens).join(' ');
  }

  // --- TF-IDF cosine similarity between two strings
  tfidfCosineSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();

    tfidf.addDocument(text1);
    tfidf.addDocument(text2);

    // build vocabulary
    const vocab = new Set();
    tfidf.listTerms(0).forEach(t => vocab.add(t.term));
    tfidf.listTerms(1).forEach(t => vocab.add(t.term));
    const terms = Array.from(vocab);

    const v1 = terms.map(term => tfidf.tfidf(term, 0));
    const v2 = terms.map(term => tfidf.tfidf(term, 1));

    // cosine
    const dot = v1.reduce((s, x, i) => s + x * v2[i], 0);
    const mag1 = Math.sqrt(v1.reduce((s, x) => s + x * x, 0));
    const mag2 = Math.sqrt(v2.reduce((s, x) => s + x * x, 0));
    if (mag1 === 0 || mag2 === 0) return 0;
    return dot / (mag1 * mag2);
  }

  // --- sentence-level matching using TF-IDF cosine on each sentence pair
  // --- improved sentence-level matcher with fallback
  getSentenceMatches(rawText1, rawText2, force = false) {
    const splitSentences = text => {
      if (!text) return [];
      return text.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);
    };
  
    const sents1 = splitSentences(rawText1);
    const sents2 = splitSentences(rawText2);
  
    const matches = [];
    const threshold = 0.20; // LOWERED from 40% to 20%
  
    const maxS1 = Math.min(sents1.length, 300);
    const maxS2 = Math.min(sents2.length, 300);
  
    for (let i = 0; i < maxS1; i++) {
      for (let j = 0; j < maxS2; j++) {
        const s1 = sents1[i];
        const s2 = sents2[j];
  
        const sim = this.tfidfCosineSimilarity(
          this.preprocessText(s1),
          this.preprocessText(s2)
        );
  
        if (sim >= threshold) {
          matches.push({
            sentence1: s1,
            sentence2: s2,
            similarity: Math.round(sim * 100)
          });
        }
      }
    }
  
    // SORT descending
    matches.sort((a, b) => b.similarity - a.similarity);
  
    // ================================
    // 🔥 FALLBACK: if doc sim is very high but no matches
    // ================================
    if (matches.length === 0 && force) {
      const backup = [];
  
      for (let i = 0; i < Math.min(sents1.length, 50); i++) {
        let best = { s1: sents1[i], s2: "", sim: 0 };
  
        for (let j = 0; j < Math.min(sents2.length, 50); j++) {
          const sim = this.tfidfCosineSimilarity(
            this.preprocessText(sents1[i]),
            this.preprocessText(sents2[j])
          );
  
          if (sim > best.sim) {
            best = { s1: sents1[i], s2: sents2[j], sim };
          }
        }
  
        if (best.sim > 0.10) { // accept even 10% in fallback
          backup.push({
            sentence1: best.s1,
            sentence2: best.s2,
            similarity: Math.round(best.sim * 100)
          });
        }
      }
  
      // return top 20 closest sentences
      return backup.sort((a, b) => b.similarity - a.similarity).slice(0, 20);
    }
  
    return matches;
  }
  
}

module.exports = new PlagiarismService();
