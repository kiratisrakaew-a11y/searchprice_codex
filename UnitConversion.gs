/**
 * Milestone 12 rule-based unit conversion helpers.
 * Gemini is not used here; when rule-based conversion cannot safely convert,
 * callers must return cannot_compare without judging high/low.
 */
const UNIT_CONVERSION_ASSUMPTIONS = Object.freeze({
  hour_day: 'Assumption: 1 day = 8 hours.',
  day_month: 'Assumption: 1 month = 30 days.'
});

function convertPricePerUnitToReferenceUnit_(pricePerUserUnit, userUnit, referenceUnit) {
  var numericPrice = parseNumber_(pricePerUserUnit);
  if (numericPrice === null || numericPrice < 0) {
    return failResult_(createError_('invalid_user_unit_price', 'User unit price must be a non-negative number.', {}, 'warning'));
  }

  var normalizedUserUnit = normalizeUnitName_(userUnit);
  var normalizedReferenceUnit = normalizeUnitName_(referenceUnit);
  if (!normalizedUserUnit || !normalizedReferenceUnit) {
    return failResult_(createError_('unit_blank', 'User unit and reference unit are required for comparison.', {}, 'warning'));
  }

  if (normalizedUserUnit === normalizedReferenceUnit) {
    return okResult_({
      comparable_price: numericPrice,
      conversion_status: 'same_unit',
      conversion_note: 'Units match; compared directly.',
      assumption_used: ''
    });
  }

  var factorResult = getUnitConversionFactor_(normalizedUserUnit, normalizedReferenceUnit);
  if (!factorResult.ok) {
    return factorResult;
  }

  return okResult_({
    comparable_price: numericPrice / factorResult.data.factor,
    conversion_status: 'converted',
    conversion_note: 'Converted from ' + userUnit + ' to ' + referenceUnit + ' using rule-based conversion.',
    assumption_used: factorResult.data.assumption_used || ''
  });
}

function getUnitConversionFactor_(fromUnit, toUnit) {
  if (fromUnit === toUnit) {
    return okResult_({ factor: 1, assumption_used: '' });
  }

  var directFactors = {
    g: { kg: 0.001 },
    kg: { g: 1000, ton: 0.001 },
    ton: { kg: 1000 },
    cm: { m: 0.01 },
    m: { cm: 100 },
    cm2: { m2: 0.0001 },
    m2: { cm2: 10000 },
    liter: { m3: 0.001 },
    m3: { liter: 1000 },
    piece: { dozen: 1 / 12 },
    dozen: { piece: 12 }
  };

  if (directFactors[fromUnit] && directFactors[fromUnit][toUnit]) {
    return okResult_({ factor: directFactors[fromUnit][toUnit], assumption_used: '' });
  }

  if (fromUnit === 'hour' && toUnit === 'day') {
    return okResult_({ factor: 1 / 8, assumption_used: UNIT_CONVERSION_ASSUMPTIONS.hour_day });
  }
  if (fromUnit === 'day' && toUnit === 'hour') {
    return okResult_({ factor: 8, assumption_used: UNIT_CONVERSION_ASSUMPTIONS.hour_day });
  }
  if (fromUnit === 'day' && toUnit === 'month') {
    return okResult_({ factor: 1 / 30, assumption_used: UNIT_CONVERSION_ASSUMPTIONS.day_month });
  }
  if (fromUnit === 'month' && toUnit === 'day') {
    return okResult_({ factor: 30, assumption_used: UNIT_CONVERSION_ASSUMPTIONS.day_month });
  }

  return failResult_(createError_('unit_conversion_unavailable', 'Rule-based unit conversion is not available for these units.', {
    from_unit: fromUnit,
    to_unit: toUnit
  }, 'warning'));
}

function normalizeUnitName_(unitValue) {
  var unit = normalizeTextPreservingSpecs_(unitValue)
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/ตาราง/g, 'ตาราง')
    .replace(/ลูกบาศก์/g, 'ลูกบาศก์')
    .trim();

  var compact = unit.replace(/[\s\.]/g, '');
  var aliases = {
    g: 'g', gram: 'g', grams: 'g', 'กรัม': 'g',
    kg: 'kg', kilogram: 'kg', kilograms: 'kg', 'กก': 'kg', 'กิโล': 'kg', 'กิโลกรัม': 'kg',
    ton: 'ton', tonne: 'ton', tons: 'ton', tonnes: 'ton', 'ตัน': 'ton',
    m: 'm', meter: 'm', meters: 'm', metre: 'm', metres: 'm', 'ม': 'm', 'เมตร': 'm',
    cm: 'cm', centimeter: 'cm', centimeters: 'cm', centimetre: 'cm', centimetres: 'cm', 'ซม': 'cm', 'เซนติเมตร': 'cm',
    m2: 'm2', sqm: 'm2', sqmeter: 'm2', squaremeter: 'm2', squaremeters: 'm2', 'ตรม': 'm2', 'ตารางเมตร': 'm2',
    cm2: 'cm2', sqcm: 'cm2', squarecentimeter: 'cm2', squarecentimeters: 'cm2', 'ตรซม': 'cm2', 'ตารางเซนติเมตร': 'cm2',
    m3: 'm3', cbm: 'm3', cubicmeter: 'm3', cubicmeters: 'm3', 'ลบม': 'm3', 'ลูกบาศก์เมตร': 'm3',
    liter: 'liter', litre: 'liter', liters: 'liter', litres: 'liter', l: 'liter', 'ลิตร': 'liter',
    piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece', item: 'piece', each: 'piece', ea: 'piece', 'ชิ้น': 'piece', 'อัน': 'piece', 'ตัว': 'piece', 'ต้น': 'piece',
    dozen: 'dozen', dz: 'dozen', 'โหล': 'dozen',
    hour: 'hour', hours: 'hour', hr: 'hour', hrs: 'hour', 'ชม': 'hour', 'ชั่วโมง': 'hour',
    day: 'day', days: 'day', 'วัน': 'day',
    month: 'month', months: 'month', 'เดือน': 'month'
  };

  return aliases[compact] || compact;
}
