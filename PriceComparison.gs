/**
 * Milestone 12 price comparison logic.
 * Phase 1 comparison is read-only and never writes COMPARISON_LOG.
 */
const ALLOWED_USER_PRICE_TYPES = Object.freeze(['material', 'labor', 'total', 'unknown']);
const COMPARISON_CLASSIFICATIONS = Object.freeze({
  CLOSE: 'close_to_reference',
  HIGHER: 'higher_than_reference',
  LOWER: 'lower_than_reference',
  CANNOT: 'cannot_compare'
});
const COMPARISON_THRESHOLD_PERCENT = 10;

function compareUserPriceToMaster_(masterRow, input) {
  var normalizedInputResult = normalizeComparisonInput_(input || {});
  if (!normalizedInputResult.ok) {
    return normalizedInputResult;
  }

  var normalizedInput = normalizedInputResult.data.input;
  var referenceResult = selectReferencePrice_(masterRow, normalizedInput.user_price_type);
  if (!referenceResult.ok) {
    return buildCannotCompareResult_(masterRow, normalizedInput, referenceResult.error.message, {
      cannot_compare_reason: referenceResult.error.code
    });
  }

  var referencePrice = referenceResult.data.reference_price;
  var userUnitPrice = normalizedInput.user_price / normalizedInput.user_quantity;
  var conversionResult = convertPricePerUnitToReferenceUnit_(userUnitPrice, normalizedInput.user_unit, masterRow.unit);
  if (!conversionResult.ok) {
    return buildCannotCompareResult_(masterRow, normalizedInput, 'Cannot compare because units could not be converted safely.', {
      reference_price: referencePrice,
      reference_price_field: referenceResult.data.reference_price_field,
      cannot_compare_reason: conversionResult.error.code,
      conversion_note: conversionResult.error.message
    });
  }

  var userComparablePrice = conversionResult.data.comparable_price;
  var varianceAmount = userComparablePrice - referencePrice;
  var variancePercent = varianceAmount / referencePrice * 100;
  var classification = classifyVariance_(variancePercent);

  return okResult_({
    result: classification,
    selected_master_id: masterRow.master_id,
    item_name: masterRow.item_name_clean || masterRow.item_name_original,
    reference_unit: masterRow.unit,
    reference_price: roundForDisplay_(referencePrice),
    reference_price_field: referenceResult.data.reference_price_field,
    user_price: roundForDisplay_(normalizedInput.user_price),
    user_quantity: roundForDisplay_(normalizedInput.user_quantity),
    user_unit: normalizedInput.user_unit,
    user_price_type: normalizedInput.user_price_type,
    user_unit_price: roundForDisplay_(userUnitPrice),
    user_comparable_price: roundForDisplay_(userComparablePrice),
    variance_amount: roundForDisplay_(varianceAmount),
    variance_percent: roundForDisplay_(variancePercent),
    conversion_status: conversionResult.data.conversion_status,
    conversion_note: conversionResult.data.conversion_note,
    assumption_used: conversionResult.data.assumption_used || '',
    cannot_compare_reason: '',
    user_note: normalizedInput.user_note,
    writes_performed: []
  });
}

function normalizeComparisonInput_(input) {
  var userPrice = parseNumber_(input.user_price);
  if (userPrice === null || userPrice < 0) {
    return failResult_(createError_('invalid_user_price', 'user_price is required and must be a non-negative number.', {}, 'warning'));
  }

  var userQuantity = parseNumber_(input.user_quantity);
  if (userQuantity === null || userQuantity <= 0) {
    return failResult_(createError_('invalid_user_quantity', 'user_quantity is required and must be greater than 0.', {}, 'warning'));
  }

  var userUnit = cleanDisplayText_(input.user_unit);
  if (!userUnit) {
    return failResult_(createError_('empty_user_unit', 'user_unit is required.', {}, 'warning'));
  }

  var userPriceType = cleanDisplayText_(input.user_price_type || 'unknown').toLowerCase();
  if (ALLOWED_USER_PRICE_TYPES.indexOf(userPriceType) === -1) {
    return failResult_(createError_('invalid_user_price_type', 'user_price_type must be material, labor, total, or unknown.', {
      allowed_values: ALLOWED_USER_PRICE_TYPES
    }, 'warning'));
  }

  return okResult_({
    input: {
      user_price: userPrice,
      user_quantity: userQuantity,
      user_unit: userUnit,
      user_price_type: userPriceType,
      user_note: cleanDisplayText_(input.user_note)
    }
  });
}

function selectReferencePrice_(masterRow, userPriceType) {
  var fieldName = '';
  if (userPriceType === 'material') {
    fieldName = 'material_cost';
  } else if (userPriceType === 'labor') {
    fieldName = 'labor_cost';
  } else if (userPriceType === 'total') {
    fieldName = 'total_cost';
  } else {
    fieldName = parseNumber_(masterRow.total_cost) !== null ? 'total_cost' : 'price';
  }

  var value = parseNumber_(masterRow[fieldName]);
  if (value === null && userPriceType === 'unknown' && fieldName === 'total_cost') {
    fieldName = 'price';
    value = parseNumber_(masterRow[fieldName]);
  }

  if (value === null || value <= 0) {
    return failResult_(createError_('reference_price_unavailable', 'Reference price is unavailable for the selected price type.', {
      price_type: userPriceType,
      reference_field: fieldName
    }, 'warning'));
  }

  return okResult_({
    reference_price: value,
    reference_price_field: fieldName
  });
}

function classifyVariance_(variancePercent) {
  if (variancePercent > COMPARISON_THRESHOLD_PERCENT) {
    return COMPARISON_CLASSIFICATIONS.HIGHER;
  }
  if (variancePercent < -COMPARISON_THRESHOLD_PERCENT) {
    return COMPARISON_CLASSIFICATIONS.LOWER;
  }
  return COMPARISON_CLASSIFICATIONS.CLOSE;
}

function buildCannotCompareResult_(masterRow, normalizedInput, reason, extra) {
  var details = extra || {};
  return okResult_({
    result: COMPARISON_CLASSIFICATIONS.CANNOT,
    selected_master_id: masterRow && masterRow.master_id || '',
    item_name: masterRow && (masterRow.item_name_clean || masterRow.item_name_original) || '',
    reference_unit: masterRow && masterRow.unit || '',
    reference_price: valueOrBlank_(details.reference_price),
    reference_price_field: details.reference_price_field || '',
    user_price: normalizedInput ? roundForDisplay_(normalizedInput.user_price) : '',
    user_quantity: normalizedInput ? roundForDisplay_(normalizedInput.user_quantity) : '',
    user_unit: normalizedInput ? normalizedInput.user_unit : '',
    user_price_type: normalizedInput ? normalizedInput.user_price_type : '',
    user_unit_price: normalizedInput ? roundForDisplay_(normalizedInput.user_price / normalizedInput.user_quantity) : '',
    user_comparable_price: '',
    variance_amount: '',
    variance_percent: '',
    conversion_status: 'cannot_convert',
    conversion_note: details.conversion_note || reason,
    assumption_used: '',
    cannot_compare_reason: details.cannot_compare_reason || reason,
    user_note: normalizedInput ? normalizedInput.user_note : '',
    writes_performed: []
  });
}

function roundForDisplay_(value) {
  var numberValue = parseNumber_(value);
  if (numberValue === null) {
    return '';
  }
  return Math.round(numberValue * 10000) / 10000;
}
