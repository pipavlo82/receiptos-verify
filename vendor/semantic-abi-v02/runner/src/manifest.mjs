import { AUTHORITY_CLASSES } from "./classes.mjs";

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const allowedKeys = (value, allowed) =>
  Object.keys(value).every((key) => allowed.includes(key));

function validateEvidenceClaim(claim, path, errors) {
  if (claim == null || typeof claim !== "object" || Array.isArray(claim)) {
    errors.push(`${path} must be a claim object`);
    return;
  }
  if (!allowedKeys(claim, ["claim_type", "authority_class", "scope", "issued_at", "verification_time"])) {
    errors.push(`${path} contains an unsupported field`);
  }
  for (const field of ["claim_type", "authority_class", "scope"]) {
    if (!isNonEmptyString(claim[field])) errors.push(`${path}.${field} must be a non-empty string`);
  }
  if (isNonEmptyString(claim.authority_class) && !AUTHORITY_CLASSES.includes(claim.authority_class)) {
    errors.push(`${path}.authority_class is not in the v0 authority-class enum`);
  }
  const issued = hasOwn(claim, "issued_at");
  const verified = hasOwn(claim, "verification_time");
  if (issued === verified) {
    errors.push(`${path} must contain exactly one of issued_at or verification_time`);
  }
  if (issued && !isNonEmptyString(claim.issued_at)) {
    errors.push(`${path}.issued_at must be a non-empty string`);
  }
  if (verified && !isNonEmptyString(claim.verification_time)) {
    errors.push(`${path}.verification_time must be a non-empty string`);
  }
}

function validateNegativeBoundary(boundary, path, errors) {
  if (boundary == null || typeof boundary !== "object" || Array.isArray(boundary)) {
    errors.push(`${path} must be a negative claim-boundary object`);
    return;
  }
  if (!allowedKeys(boundary, ["claim_type", "authority_class", "scope", "reason"])) {
    errors.push(`${path} contains an unsupported field`);
  }
  for (const field of ["claim_type", "authority_class", "scope"]) {
    if (!isNonEmptyString(boundary[field])) errors.push(`${path}.${field} must be a non-empty string`);
  }
  if (isNonEmptyString(boundary.authority_class) && !AUTHORITY_CLASSES.includes(boundary.authority_class)) {
    errors.push(`${path}.authority_class is not in the v0 authority-class enum`);
  }
  if (hasOwn(boundary, "reason") && !isNonEmptyString(boundary.reason)) {
    errors.push(`${path}.reason must be a non-empty string`);
  }
}

// Zero-dependency runtime validation for the v0 manifest shape. The JSON Schema is
// the interchange contract; this validator gives the runner the same fail-closed
// boundary without adding a package dependency.
export function validateManifest(manifest) {
  const errors = [];
  if (manifest == null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { valid: false, errors: ["manifest must be an object"] };
  }
  if (!allowedKeys(manifest, ["component", "author", "declarations"])) {
    errors.push("manifest contains an unsupported field");
  }
  if (!isNonEmptyString(manifest.component)) errors.push("component must be a non-empty string");
  if (hasOwn(manifest, "author") && !isNonEmptyString(manifest.author)) {
    errors.push("author must be a non-empty string");
  }
  if (!Array.isArray(manifest.declarations) || manifest.declarations.length === 0) {
    errors.push("declarations must be a non-empty array");
    return { valid: errors.length === 0, errors };
  }
  manifest.declarations.forEach((declaration, declarationIndex) => {
    const path = `declarations[${declarationIndex}]`;
    if (declaration == null || typeof declaration !== "object" || Array.isArray(declaration)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!allowedKeys(declaration, ["endpoint", "consumes", "establishes", "does_not_establish"])) {
      errors.push(`${path} contains an unsupported field`);
    }
    if (!isNonEmptyString(declaration.endpoint)) errors.push(`${path}.endpoint must be a non-empty string`);
    for (const field of ["consumes", "establishes", "does_not_establish"]) {
      if (!Array.isArray(declaration[field])) errors.push(`${path}.${field} must be an array`);
    }
    if (Array.isArray(declaration.establishes) && declaration.establishes.length === 0) {
      errors.push(`${path}.establishes must contain at least one claim`);
    }
    if (Array.isArray(declaration.consumes)) {
      declaration.consumes.forEach((claim, index) =>
        validateEvidenceClaim(claim, `${path}.consumes[${index}]`, errors));
    }
    if (Array.isArray(declaration.establishes)) {
      declaration.establishes.forEach((claim, index) =>
        validateEvidenceClaim(claim, `${path}.establishes[${index}]`, errors));
    }
    if (Array.isArray(declaration.does_not_establish)) {
      declaration.does_not_establish.forEach((boundary, index) =>
        validateNegativeBoundary(boundary, `${path}.does_not_establish[${index}]`, errors));
    }
  });
  return { valid: errors.length === 0, errors };
}
