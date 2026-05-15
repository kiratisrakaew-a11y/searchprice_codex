/**
 * Milestone 13 Gemini-assisted unit interpretation.
 * Gemini is used only after rule-based unit conversion fails. It must never
 * guess prices, edit sheets, approve/reject prices, or act as search.
 */
const GEMINI_UNIT_CONVERSION_MODEL_PROPERTY = 'GEMINI_UNIT_CONVERSION_MODEL';
const GEMINI_API_KEY_PROPERTY = 'GEMINI_API_KEY';
const DEFAULT_GEMINI_UNIT_CONVERSION_MODEL = 'gemini-2.5-flash';
const GEMINI_GENERATE_CONTENT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const GEMINI_UNIT_ALLOWED_INPUT_KEYS = Object.freeze([
  'database_unit',
  'user_unit',
  'user_quantity',
  'user_price_type',
  'selected_item_name',
  'note',
  'known_conversion_facts'
]);
const GEMINI_UNIT_REQUIRED_OUTPUT_KEYS = Object.freeze([
  'status',
  'conversion_possible',
  'required_user_input',
  'conversion_factor',
  'converted_value',
  'converted_unit',
  'assumption_used',
  'explanation',
  'cannot_compare_reason'
]);

function convertPricePerUnitWithGeminiFallback_(pricePerUserUnit, userUnit, referenceUnit, context) {
  var ruleResult = convertPricePerUnitToReferenceUnit_(pricePerUserUnit, userUnit, referenceUnit);
  if (ruleResult.ok) {
    ruleResult.data.conversion_source = 'rule_based';
    return ruleResult;
  }

  var geminiResult = askGeminiForUnitConversion_(pricePerUserUnit, userUnit, referenceUnit, context || {});
  if (!geminiResult.ok) {
    return failResult_(createError_('unit_conversion_unavailable', 'Unit interpretation is unavailable; cannot compare safely.', {
      rule_error: ruleResult.error,
      gemini_error: geminiResult.error
    }, 'warning'));
  }

  var interpretation = geminiResult.data.interpretation;
  if (interpretation.status !== 'success' || interpretation.conversion_possible !== true) {
    return failResult_(createError_('unit_conversion_unavailable', 'Gemini could not determine a safe unit conversion.', {
      rule_error: ruleResult.error,
      gemini_interpretation: interpretation
    }, 'warning'));
  }

  var convertedValue = parseNumber_(interpretation.converted_value);
  var conversionFactor = parseNumber_(interpretation.conversion_factor);
  if (convertedValue === null || conversionFactor === null || conversionFactor <= 0) {
    return failResult_(createError_('gemini_conversion_invalid', 'Gemini returned an invalid conversion value.', {
      gemini_interpretation: interpretation
    }, 'warning'));
  }

  return okResult_({
    comparable_price: parseNumber_(pricePerUserUnit) / conversionFactor,
    conversion_status: 'converted',
    conversion_source: 'gemini',
    conversion_note: interpretation.explanation || 'Gemini interpreted the unit conversion after rule-based conversion was unavailable.',
    assumption_used: interpretation.assumption_used || '',
    gemini_status: interpretation.status,
    gemini_required_user_input: interpretation.required_user_input || '',
    cannot_compare_reason: interpretation.cannot_compare_reason || ''
  });
}

function askGeminiForUnitConversion_(pricePerUserUnit, userUnit, referenceUnit, context) {
  var apiKey = getGeminiApiKey_();
  if (!apiKey) {
    return failResult_(createError_('gemini_api_key_missing', 'Gemini API key is missing; unit interpretation is unavailable.', {}, 'warning'));
  }

  var model = getGeminiUnitConversionModel_();
  var payload = buildGeminiUnitConversionPayload_(pricePerUserUnit, userUnit, referenceUnit, context || {});
  var url = GEMINI_GENERATE_CONTENT_BASE_URL + encodeURIComponent(model) + ':generateContent';
  var response;
  try {
    response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-goog-api-key': apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (error) {
    return failResult_(createError_('gemini_fetch_failed', 'Gemini unit interpretation request failed.', {
      error_message: error.message
    }, 'warning'));
  }

  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    return failResult_(createError_('gemini_http_error', 'Gemini unit interpretation returned an HTTP error.', {
      status_code: statusCode,
      response_excerpt: safeGeminiResponseExcerpt_(responseText)
    }, 'warning'));
  }

  var parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    return failResult_(createError_('gemini_response_parse_failed', 'Gemini response was not valid JSON.', {}, 'warning'));
  }

  var text = extractGeminiText_(parsed);
  if (!text) {
    return failResult_(createError_('gemini_response_empty', 'Gemini returned no unit interpretation text.', {}, 'warning'));
  }

  return parseGeminiUnitConversionText_(text);
}

function buildGeminiUnitConversionPayload_(pricePerUserUnit, userUnit, referenceUnit, context) {
  var boundaryInput = buildGeminiUnitBoundaryInput_(userUnit, referenceUnit, context || {});
  var prompt = [
    'You are assisting a Google Apps Script price comparison tool with unit interpretation only.',
    'Do not guess prices. Do not approve or reject prices. Do not classify high or low. Do not modify any data.',
    'Do not request or expose credentials, API keys, personal data, source sheets, or the full master database.',
    'Return JSON only with these exact fields: ' + GEMINI_UNIT_REQUIRED_OUTPUT_KEYS.join(', ') + '.',
    'Use status success only if conversion is safe from the provided information. Otherwise use need_more_info or cannot_compare.',
    'conversion_factor means how many database/reference units are in 1 user unit.',
    'converted_value must be the converted unit quantity for 1 user unit, not a price.',
    'If data such as meters per roll, kg per bag, points per job, components per set, or trip distance/volume is missing, return need_more_info or cannot_compare.',
    'Input JSON contains only allowlisted fields:',
    JSON.stringify(boundaryInput)
  ].join('\n');

  return {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json'
    }
  };
}

function buildGeminiUnitBoundaryInput_(userUnit, referenceUnit, context) {
  var rawInput = {
    database_unit: cleanDisplayText_(referenceUnit),
    user_unit: cleanDisplayText_(userUnit),
    user_quantity: valueOrBlank_(context.user_quantity),
    user_price_type: cleanDisplayText_(context.user_price_type),
    selected_item_name: cleanDisplayText_(context.selected_item_name),
    note: cleanDisplayText_(context.note),
    known_conversion_facts: cleanDisplayText_(context.known_conversion_facts)
  };

  return GEMINI_UNIT_ALLOWED_INPUT_KEYS.reduce(function(allowedInput, key) {
    allowedInput[key] = rawInput[key] || '';
    return allowedInput;
  }, {});
}

function parseGeminiUnitConversionText_(text) {
  var cleaned = cleanGeminiJsonText_(text);
  var parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    return failResult_(createError_('gemini_structured_output_invalid', 'Gemini unit interpretation was not structured JSON.', {
      response_excerpt: safeGeminiResponseExcerpt_(text)
    }, 'warning'));
  }

  var requiredFieldsResult = validateGeminiRequiredOutputFields_(parsed);
  if (!requiredFieldsResult.ok) {
    return requiredFieldsResult;
  }

  var normalized = normalizeGeminiUnitConversionResult_(parsed);
  var validation = validateGeminiUnitConversionResult_(normalized);
  if (!validation.ok) {
    return validation;
  }

  return okResult_({ interpretation: normalized });
}

function normalizeGeminiUnitConversionResult_(result) {
  return {
    status: cleanDisplayText_(result.status).toLowerCase(),
    conversion_possible: result.conversion_possible === true || cleanDisplayText_(result.conversion_possible).toLowerCase() === 'true',
    required_user_input: cleanDisplayText_(result.required_user_input),
    conversion_factor: valueOrBlank_(result.conversion_factor),
    converted_value: valueOrBlank_(result.converted_value),
    converted_unit: cleanDisplayText_(result.converted_unit),
    assumption_used: cleanDisplayText_(result.assumption_used),
    explanation: cleanDisplayText_(result.explanation),
    cannot_compare_reason: cleanDisplayText_(result.cannot_compare_reason)
  };
}

function validateGeminiRequiredOutputFields_(result) {
  var missingKeys = GEMINI_UNIT_REQUIRED_OUTPUT_KEYS.filter(function(key) {
    return !Object.prototype.hasOwnProperty.call(result || {}, key);
  });
  if (missingKeys.length) {
    return failResult_(createError_('gemini_output_missing_fields', 'Gemini response is missing required structured fields.', {
      missing_fields: missingKeys
    }, 'warning'));
  }
  return okResult_({});
}

function validateGeminiUnitConversionResult_(result) {
  var allowedStatuses = ['success', 'need_more_info', 'cannot_compare', 'error'];
  if (allowedStatuses.indexOf(result.status) === -1) {
    return failResult_(createError_('gemini_status_invalid', 'Gemini returned an invalid unit interpretation status.', {
      status: result.status
    }, 'warning'));
  }

  if (result.status === 'success') {
    var factor = parseNumber_(result.conversion_factor);
    var converted = parseNumber_(result.converted_value);
    if (result.conversion_possible !== true || factor === null || factor <= 0 || converted === null || !result.converted_unit) {
      return failResult_(createError_('gemini_success_payload_invalid', 'Gemini success response is missing conversion fields.', {
        interpretation: result
      }, 'warning'));
    }
  }

  return okResult_({ interpretation: result });
}

function extractGeminiText_(responseObject) {
  var candidates = responseObject && responseObject.candidates || [];
  if (!candidates.length || !candidates[0].content || !candidates[0].content.parts) {
    return '';
  }

  return candidates[0].content.parts.map(function(part) {
    return part.text || '';
  }).join('').trim();
}

function cleanGeminiJsonText_(text) {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function getGeminiApiKey_() {
  return PropertiesService.getScriptProperties().getProperty(GEMINI_API_KEY_PROPERTY) || '';
}

function getGeminiUnitConversionModel_() {
  return PropertiesService.getScriptProperties().getProperty(GEMINI_UNIT_CONVERSION_MODEL_PROPERTY) || DEFAULT_GEMINI_UNIT_CONVERSION_MODEL;
}

function safeGeminiResponseExcerpt_(text) {
  return cleanDisplayText_(String(text || '').slice(0, 500));
}
