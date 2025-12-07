export interface RuleConfigValidation {
  valid: boolean;
  errors: string[];
}

export interface RuleCustomConfig {
  maxDepth?: number;
  maxLength?: number;
  maxComplexity?: number;
  ignorePatterns?: string[];
  customPatterns?: string[];
  options?: Record<string, boolean | string | number>;
  thresholds?: Record<string, number>;
}

const ALLOWED_CONFIG_KEYS = new Set([
  "maxDepth",
  "maxLength", 
  "maxComplexity",
  "ignorePatterns",
  "customPatterns",
  "options",
  "thresholds",
]);

const MAX_ARRAY_LENGTH = 100;
const MAX_STRING_LENGTH = 500;
const MAX_OBJECT_KEYS = 50;
const MAX_NESTING_DEPTH = 3;

function validateValue(
  value: unknown, 
  key: string, 
  depth: number = 0
): string[] {
  const errors: string[] = [];

  if (depth > MAX_NESTING_DEPTH) {
    errors.push(`Config nesting too deep at key "${key}" - maximum depth is ${MAX_NESTING_DEPTH}`);
    return errors;
  }

  if (value === null || value === undefined) {
    return errors;
  }

  if (typeof value === "string") {
    if (value.length > MAX_STRING_LENGTH) {
      errors.push(`String value for "${key}" exceeds maximum length of ${MAX_STRING_LENGTH}`);
    }
    if (/<script|javascript:|data:/i.test(value)) {
      errors.push(`Invalid characters detected in "${key}" - potential security risk`);
    }
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      errors.push(`Invalid number value for "${key}" - must be finite`);
    }
    if (value < -1000000 || value > 1000000) {
      errors.push(`Number value for "${key}" out of allowed range (-1000000 to 1000000)`);
    }
  } else if (typeof value === "boolean") {
    // Boolean values are valid
  } else if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) {
      errors.push(`Array "${key}" exceeds maximum length of ${MAX_ARRAY_LENGTH}`);
    }
    value.forEach((item, index) => {
      errors.push(...validateValue(item, `${key}[${index}]`, depth + 1));
    });
  } else if (typeof value === "object") {
    const keys = Object.keys(value as object);
    if (keys.length > MAX_OBJECT_KEYS) {
      errors.push(`Object "${key}" has too many keys - maximum is ${MAX_OBJECT_KEYS}`);
    }
    keys.forEach((k) => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) {
        errors.push(`Invalid key format "${k}" in "${key}" - keys must be valid identifiers`);
      }
      errors.push(...validateValue((value as Record<string, unknown>)[k], `${key}.${k}`, depth + 1));
    });
  } else {
    errors.push(`Unsupported value type for "${key}" - only primitives, arrays, and objects allowed`);
  }

  return errors;
}

export function validateCustomConfig(config: unknown): RuleConfigValidation {
  const errors: string[] = [];

  if (config === null || config === undefined) {
    return { valid: true, errors: [] };
  }

  if (typeof config !== "object" || Array.isArray(config)) {
    return { 
      valid: false, 
      errors: ["customConfig must be an object"] 
    };
  }

  const configObj = config as Record<string, unknown>;
  const keys = Object.keys(configObj);

  if (keys.length > MAX_OBJECT_KEYS) {
    errors.push(`customConfig has too many keys - maximum is ${MAX_OBJECT_KEYS}`);
  }

  for (const key of keys) {
    if (!ALLOWED_CONFIG_KEYS.has(key)) {
      errors.push(`Unknown config key "${key}" - allowed keys: ${Array.from(ALLOWED_CONFIG_KEYS).join(", ")}`);
    }
  }

  if ("maxDepth" in configObj) {
    const val = configObj["maxDepth"];
    if (typeof val !== "number" || !Number.isInteger(val) || val < 1 || val > 100) {
      errors.push("maxDepth must be an integer between 1 and 100");
    }
  }

  if ("maxLength" in configObj) {
    const val = configObj["maxLength"];
    if (typeof val !== "number" || !Number.isInteger(val) || val < 1 || val > 100000) {
      errors.push("maxLength must be an integer between 1 and 100000");
    }
  }

  if ("maxComplexity" in configObj) {
    const val = configObj["maxComplexity"];
    if (typeof val !== "number" || !Number.isInteger(val) || val < 1 || val > 1000) {
      errors.push("maxComplexity must be an integer between 1 and 1000");
    }
  }

  if ("ignorePatterns" in configObj) {
    const val = configObj["ignorePatterns"];
    if (!Array.isArray(val)) {
      errors.push("ignorePatterns must be an array of strings");
    } else if (val.length > MAX_ARRAY_LENGTH) {
      errors.push(`ignorePatterns exceeds maximum length of ${MAX_ARRAY_LENGTH}`);
    } else {
      val.forEach((pattern, idx) => {
        if (typeof pattern !== "string") {
          errors.push(`ignorePatterns[${idx}] must be a string`);
        } else if (pattern.length > MAX_STRING_LENGTH) {
          errors.push(`ignorePatterns[${idx}] exceeds maximum length of ${MAX_STRING_LENGTH}`);
        }
      });
    }
  }

  if ("customPatterns" in configObj) {
    const val = configObj["customPatterns"];
    if (!Array.isArray(val)) {
      errors.push("customPatterns must be an array of strings");
    } else if (val.length > MAX_ARRAY_LENGTH) {
      errors.push(`customPatterns exceeds maximum length of ${MAX_ARRAY_LENGTH}`);
    } else {
      val.forEach((pattern, idx) => {
        if (typeof pattern !== "string") {
          errors.push(`customPatterns[${idx}] must be a string`);
        } else if (pattern.length > MAX_STRING_LENGTH) {
          errors.push(`customPatterns[${idx}] exceeds maximum length of ${MAX_STRING_LENGTH}`);
        }
        try {
          new RegExp(pattern);
        } catch {
          errors.push(`customPatterns[${idx}] is not a valid regular expression`);
        }
      });
    }
  }

  if ("options" in configObj) {
    errors.push(...validateValue(configObj["options"], "options", 1));
  }

  if ("thresholds" in configObj) {
    const val = configObj["thresholds"];
    if (typeof val !== "object" || val === null || Array.isArray(val)) {
      errors.push("thresholds must be an object");
    } else {
      Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
        if (typeof v !== "number") {
          errors.push(`thresholds.${k} must be a number`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface BulkRuleUpdateItem {
  ruleId: string;
  enabled?: boolean | undefined;
  severityOverride?: string | null | undefined;
  autoFixEnabled?: boolean | undefined;
  customConfig?: RuleCustomConfig | undefined;
}

export interface BulkRuleUpdateValidation {
  valid: boolean;
  errors: string[];
  validItems: BulkRuleUpdateItem[];
  invalidIndices: number[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_SEVERITIES = ["error", "warning", "info"];
const MAX_BULK_ITEMS = 100;

export function validateBulkRuleUpdate(items: unknown): BulkRuleUpdateValidation {
  const errors: string[] = [];
  const validItems: BulkRuleUpdateItem[] = [];
  const invalidIndices: number[] = [];

  if (!Array.isArray(items)) {
    return {
      valid: false,
      errors: ["Request body must be an array of rule updates"],
      validItems: [],
      invalidIndices: [],
    };
  }

  if (items.length === 0) {
    return {
      valid: false,
      errors: ["At least one rule update is required"],
      validItems: [],
      invalidIndices: [],
    };
  }

  if (items.length > MAX_BULK_ITEMS) {
    return {
      valid: false,
      errors: [`Maximum ${MAX_BULK_ITEMS} rules can be updated at once`],
      validItems: [],
      invalidIndices: [],
    };
  }

  items.forEach((item, index) => {
    const itemErrors: string[] = [];

    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      itemErrors.push(`Item ${index}: must be an object`);
      invalidIndices.push(index);
      errors.push(...itemErrors);
      return;
    }

    const updateItem = item as Record<string, unknown>;

    if (!updateItem["ruleId"]) {
      itemErrors.push(`Item ${index}: ruleId is required`);
    } else if (typeof updateItem["ruleId"] !== "string") {
      itemErrors.push(`Item ${index}: ruleId must be a string`);
    } else if (!UUID_REGEX.test(updateItem["ruleId"] as string)) {
      itemErrors.push(`Item ${index}: ruleId must be a valid UUID`);
    }

    if ("enabled" in updateItem && typeof updateItem["enabled"] !== "boolean") {
      itemErrors.push(`Item ${index}: enabled must be a boolean`);
    }

    if ("severityOverride" in updateItem) {
      const sev = updateItem["severityOverride"];
      if (sev !== null && (typeof sev !== "string" || !VALID_SEVERITIES.includes(sev))) {
        itemErrors.push(`Item ${index}: severityOverride must be null or one of: ${VALID_SEVERITIES.join(", ")}`);
      }
    }

    if ("autoFixEnabled" in updateItem && typeof updateItem["autoFixEnabled"] !== "boolean") {
      itemErrors.push(`Item ${index}: autoFixEnabled must be a boolean`);
    }

    if ("customConfig" in updateItem) {
      const configValidation = validateCustomConfig(updateItem["customConfig"]);
      if (!configValidation.valid) {
        itemErrors.push(`Item ${index}: ${configValidation.errors.join("; ")}`);
      }
    }

    if (itemErrors.length > 0) {
      invalidIndices.push(index);
      errors.push(...itemErrors);
    } else {
      validItems.push({
        ruleId: updateItem["ruleId"] as string,
        enabled: updateItem["enabled"] as boolean | undefined,
        severityOverride: updateItem["severityOverride"] as string | null | undefined,
        autoFixEnabled: updateItem["autoFixEnabled"] as boolean | undefined,
        customConfig: updateItem["customConfig"] as RuleCustomConfig | undefined,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    validItems,
    invalidIndices,
  };
}
