/**
 * ============================================
 * FUZZY SEARCH MODULE
 * ============================================
 * Slim zoeken met tolerantie voor typefouten en afkortingen
 */

class FuzzySearch {
  constructor(options = {}) {
    this.minScore = options.minScore || 0.3;
    this.maxResults = options.maxResults || 10;
    this.enabled = options.enabled !== false;
  }

  /**
   * Basis fuzzy match - check of query voorkomt in text
   */
  fuzzyMatch(text, query) {
    if (!this.enabled) return text.toLowerCase().includes(query.toLowerCase());

    text = text.toLowerCase();
    query = query.toLowerCase();

    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex] === query[queryIndex]) {
        queryIndex++;
      }
      textIndex++;
    }

    return queryIndex === query.length;
  }

  /**
   * Geavanceerde fuzzy search met score
   * Hogere score = betere match
   */
  fuzzySearchWithScore(text, query) {
    if (!query || !text) return null;

    text = text.toLowerCase();
    query = query.toLowerCase();

    // Exacte match krijgt hoogste score
    if (text === query) return 1000;

    // Start met match krijgt hoge score
    if (text.startsWith(query)) return 500 + query.length * 10;

    let score = 0;
    let textIndex = 0;
    let queryIndex = 0;
    let consecutiveMatches = 0;
    let lastMatchIndex = -1;

    while (textIndex < text.length && queryIndex < query.length) {
      if (text[textIndex] === query[queryIndex]) {
        // Bonus voor opeenvolgende matches
        if (textIndex === lastMatchIndex + 1) {
          consecutiveMatches++;
          score += 5 + consecutiveMatches * 2;
        } else {
          consecutiveMatches = 0;
          score += 1;
        }

        // Extra bonus voor match aan begin van woord
        if (textIndex === 0 || text[textIndex - 1] === " ") {
          score += 3;
        }

        lastMatchIndex = textIndex;
        queryIndex++;
      }
      textIndex++;
    }

    // Return null als niet alle karakters gevonden
    if (queryIndex !== query.length) return null;

    // Penalty voor lange tekstlengte (kortere matches zijn beter)
    score -= (text.length - query.length) * 0.5;

    return Math.max(0, score);
  }

  /**
   * Zoek door een lijst van items
   */
  search(items, query, searchKeys = ["name"]) {
    if (!this.enabled || !query) return items;

    const results = [];

    items.forEach((item) => {
      let bestScore = 0;
      let matchedKey = null;

      // Zoek door alle opgegeven velden
      searchKeys.forEach((key) => {
        const value = this.getNestedValue(item, key);
        if (!value) return;

        const score = this.fuzzySearchWithScore(value, query);
        if (score !== null && score > bestScore) {
          bestScore = score;
          matchedKey = key;
        }
      });

      // Ook zoeken in tags
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag) => {
          const score = this.fuzzySearchWithScore(tag, query);
          if (score !== null && score > bestScore) {
            bestScore = score + 2; // Kleine bonus voor tag match
            matchedKey = "tags";
          }
        });
      }

      if (bestScore > 0) {
        results.push({
          ...item,
          _searchScore: bestScore,
          _matchedKey: matchedKey,
        });
      }
    });

    // Sorteer op score (hoogste eerst)
    results.sort((a, b) => b._searchScore - a._searchScore);

    // Limiteer resultaten
    return results.slice(0, this.maxResults);
  }

  /**
   * Highlight matched characters in text
   */
  highlightMatches(text, query) {
    if (!query || !text) return text;

    text = String(text);
    query = query.toLowerCase();

    let result = "";
    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < text.length) {
      if (
        queryIndex < query.length &&
        text[textIndex].toLowerCase() === query[queryIndex]
      ) {
        result += `<mark class="search-highlight">${text[textIndex]}</mark>`;
        queryIndex++;
      } else {
        result += text[textIndex];
      }
      textIndex++;
    }

    return result;
  }

  /**
   * Helper: Get nested object value
   */
  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Levenshtein distance voor geavanceerde matching
   * Berekent het minimum aantal bewerkingen om van string1 naar string2 te komen
   */
  levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Similarity ratio gebaseerd op Levenshtein
   */
  similarityRatio(str1, str2) {
    const distance = this.levenshteinDistance(
      str1.toLowerCase(),
      str2.toLowerCase()
    );
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  }
}

// Export voor gebruik in andere modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = FuzzySearch;
}

// Make globally available for browser
if (typeof window !== "undefined") {
  window.FuzzySearch = FuzzySearch;
}
