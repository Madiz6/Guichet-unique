/**
 * Behavioral Learning Engine for Transaction Auto-Suggestions
 *
 * Analyzes the user's historical transaction data to infer the most likely
 * values for: department, category, payment_method
 *
 * Signals used (in descending confidence weight):
 *  1. contact_name → department (strongest: same vendor always goes to same dept)
 *  2. category     → department (strong: category maps 1:1 to dept most of the time)
 *  3. description keywords → department (medium: word stems match past descriptions)
 *  4. source       → department (weak: global source tendencies)
 *  5. contact_name → category  (for payment method auto-fill)
 *  6. category     → payment_method
 */
import { useMemo } from 'react';

// --- helpers ---

/** Count occurrences of value per key in an array of objects */
function buildFrequencyMap(records, keyFn, valueFn) {
  const map = {};
  records.forEach(r => {
    const k = keyFn(r);
    const v = valueFn(r);
    if (!k || !v) return;
    if (!map[k]) map[k] = {};
    map[k][v] = (map[k][v] || 0) + 1;
  });
  return map;
}

/** Return the most frequent value for a key, plus confidence [0-1] */
function topChoice(freq, key) {
  if (!freq[key]) return null;
  const entries = Object.entries(freq[key]);
  if (!entries.length) return null;
  const total = entries.reduce((s, [, c]) => s + c, 0);
  const [value, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return { value, confidence: count / total, count };
}

/** Tokenise a description into stems (≥4 chars) */
function tokenise(desc = '') {
  return desc.toLowerCase().split(/[\s,.\-/()]+/).filter(w => w.length >= 4);
}

// ─── main hook ──────────────────────────────────────────────────────────────

export default function useBehavioralSuggestions(transactions = []) {
  return useMemo(() => {
    // Only use fully-filled historical records as training data
    const training = transactions.filter(t => t.department && t.category);

    // Signal maps
    const contactToDept    = buildFrequencyMap(training, t => t.contact_name, t => t.department);
    const categoryToDept   = buildFrequencyMap(training, t => t.category,     t => t.department);
    const sourceToDept     = buildFrequencyMap(training, t => t.source,       t => t.department);
    const categoryToPay    = buildFrequencyMap(training, t => t.category,     t => t.payment_method);
    const contactToCategory = buildFrequencyMap(training, t => t.contact_name, t => t.category);

    // Build keyword → department index from description tokens
    const keywordToDeptCount = {};
    training.forEach(t => {
      tokenise(t.description).forEach(word => {
        if (!keywordToDeptCount[word]) keywordToDeptCount[word] = {};
        keywordToDeptCount[word][t.department] = (keywordToDeptCount[word][t.department] || 0) + 1;
      });
    });

    /**
     * Given partial form data, return a suggestion object:
     * {
     *   department: { value, confidence, signal },
     *   category:   { value, confidence, signal },
     *   payment_method: { value, confidence, signal }
     * }
     * Returns null fields when confidence < threshold.
     */
    function suggest({ contact_name, category, source, description, type } = {}) {
      const suggestions = {};

      // ── Department ──
      const deptCandidates = [];

      const c1 = topChoice(contactToDept, contact_name);
      if (c1) deptCandidates.push({ ...c1, weight: 0.45, signal: `contact "${contact_name}"` });

      const c2 = topChoice(categoryToDept, category);
      if (c2) deptCandidates.push({ ...c2, weight: 0.30, signal: `catégorie "${category}"` });

      // Keyword signal from description
      if (description) {
        const tokens = tokenise(description);
        const deptScores = {};
        tokens.forEach(word => {
          const kwMap = keywordToDeptCount[word];
          if (!kwMap) return;
          const total = Object.values(kwMap).reduce((a, b) => a + b, 0);
          Object.entries(kwMap).forEach(([dept, cnt]) => {
            deptScores[dept] = (deptScores[dept] || 0) + (cnt / total) * 0.20;
          });
        });
        const topKw = Object.entries(deptScores).sort((a, b) => b[1] - a[1])[0];
        if (topKw) deptCandidates.push({ value: topKw[0], confidence: topKw[1] / 0.20, weight: 0.20, signal: 'description similaire' });
      }

      const c3 = topChoice(sourceToDept, source);
      if (c3) deptCandidates.push({ ...c3, weight: 0.05, signal: `source "${source}"` });

      if (deptCandidates.length) {
        // Weighted vote across all signals for the same target value
        const deptVotes = {};
        deptCandidates.forEach(({ value, confidence, weight }) => {
          deptVotes[value] = (deptVotes[value] || 0) + confidence * weight;
        });
        const topDept = Object.entries(deptVotes).sort((a, b) => b[1] - a[1])[0];
        const bestSignal = deptCandidates.find(d => d.value === topDept[0]);
        if (topDept[1] >= 0.12) { // min confidence threshold
          suggestions.department = {
            value: topDept[0],
            confidence: Math.min(topDept[1] * 2, 1), // normalise for display
            signal: bestSignal?.signal || 'historique',
          };
        }
      }

      // ── Category (only if not already set) ──
      const cc = topChoice(contactToCategory, contact_name);
      if (cc && cc.confidence >= 0.4) {
        suggestions.category = { ...cc, signal: `contact "${contact_name}"` };
      }

      // ── Payment Method ──
      const pm = topChoice(categoryToPay, category);
      if (pm && pm.confidence >= 0.5) {
        suggestions.payment_method = { ...pm, signal: `catégorie "${category}"` };
      }

      return suggestions;
    }

    /** 
     * Returns an array of automation opportunities:
     * transactions without a department that the engine can assign with high confidence.
     */
    function getAutomationOpportunities(allTransactions) {
      return allTransactions
        .filter(t => !t.department)
        .map(t => {
          const s = suggest(t);
          if (s.department?.confidence >= 0.65) {
            return { transaction: t, suggestion: s.department };
          }
          return null;
        })
        .filter(Boolean);
    }

    return { suggest, getAutomationOpportunities };
  }, [transactions]);
}