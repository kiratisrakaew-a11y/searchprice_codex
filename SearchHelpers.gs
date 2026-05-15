/**
 * Milestone 9 helper field generation for search. These helpers never invent
 * aliases and never write to ALIAS_DICTIONARY.
 */
function generateItemNameClean_(value) {
  return cleanDisplayText_(value);
}

function generateSearchKeywords_(record) {
  return dedupeNormalizedTerms_([
    record.item_name_clean,
    record.category_level_1,
    record.category_level_2,
    record.category_level_3,
    record.unit,
    record.note
  ]);
}

function generateNormalizedText_(record) {
  return dedupeNormalizedTerms_([
    record.item_name_original,
    record.item_name_clean,
    record.category_level_1,
    record.category_level_2,
    record.category_level_3,
    record.unit,
    record.note,
    record.search_keywords,
    record.alias_terms,
    record.source_type,
    record.price_basis
  ]);
}

function enrichAliasTermsFromDictionary_(record, aliases) {
  if (!aliases || !aliases.length) {
    return '';
  }

  var searchableText = normalizeTextPreservingSpecs_([
    record.item_name_original,
    record.item_name_clean,
    record.category_level_1,
    record.category_level_2,
    record.category_level_3,
    record.unit,
    record.note
  ].join(' '));
  var aliasTerms = [];

  aliases.forEach(function(alias) {
    if (!isAliasActiveForRecord_(alias, record)) {
      return;
    }

    var matchTerms = [alias.user_term, alias.canonical_term, alias.category_hint].concat(alias.related_terms || []);
    var matched = matchTerms.some(function(term) {
      var normalizedTerm = normalizeTextPreservingSpecs_(term);
      return normalizedTerm && searchableText.indexOf(normalizedTerm) !== -1;
    });

    if (matched) {
      addUniqueAliasTerm_(aliasTerms, alias.user_term);
      addUniqueAliasTerm_(aliasTerms, alias.canonical_term);
      (alias.related_terms || []).forEach(function(term) {
        addUniqueAliasTerm_(aliasTerms, term);
      });
    }
  });

  return aliasTerms.join(', ');
}

function isAliasActiveForRecord_(alias, record) {
  if (alias.active && normalizeTextPreservingSpecs_(alias.active) !== 'yes') {
    return false;
  }

  var sourceTypeHint = normalizeTextPreservingSpecs_(alias.source_type_hint);
  if (sourceTypeHint && sourceTypeHint !== normalizeTextPreservingSpecs_(record.source_type)) {
    return false;
  }

  return true;
}

function dedupeNormalizedTerms_(values) {
  var seen = {};
  var terms = [];
  values.forEach(function(value) {
    tokenizeSearchText_(value).forEach(function(term) {
      if (!seen[term]) {
        seen[term] = true;
        terms.push(term);
      }
    });
  });
  return terms.join(' ');
}

function tokenizeSearchText_(value) {
  var normalized = normalizeTextPreservingSpecs_(value);
  return normalized ? normalized.split(' ').filter(function(term) { return term; }) : [];
}

function normalizeTextPreservingSpecs_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/×/g, 'x')
    .replace(/[^0-9a-zก-๙\s\.\/\-_x\"']/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function preserveTechnicalSpecSmokeResult_() {
  var sample = 'สาย VAF 2x2.5 20mm 1/2" THW';
  var normalized = normalizeTextPreservingSpecs_(sample);
  return {
    normalized: normalized,
    preserves_2x2_5: normalized.indexOf('2x2.5') !== -1,
    preserves_20mm: normalized.indexOf('20mm') !== -1,
    preserves_half_inch: normalized.indexOf('1/2"') !== -1,
    preserves_vaf: normalized.indexOf('vaf') !== -1,
    preserves_thw: normalized.indexOf('thw') !== -1
  };
}
