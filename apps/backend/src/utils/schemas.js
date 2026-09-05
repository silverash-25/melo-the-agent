const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Load schemas
const schemaDir = path.join(__dirname, '../../../../shared/schemas');

let schemas = {};

try {
  const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.json'));
  files.forEach(file => {
    const raw = fs.readFileSync(path.join(schemaDir, file), 'utf8');
    const parsed = JSON.parse(raw);
    schemas[file.replace('.json', '')] = parsed;
    // Add to AJV if it has an id/title we want to reference, but simpler to just compile on demand
  });
} catch (e) {
  console.warn("Failed to load schemas from shared directory:", e.message);
}

function validateSchema(schemaName, data) {
  if (!schemas[schemaName]) {
    throw new Error(`Schema ${schemaName} not found`);
  }
  
  const validate = ajv.compile(schemas[schemaName]);
  const valid = validate(data);
  
  if (!valid) {
    const errors = validate.errors.map(e => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Schema validation failed for ${schemaName}: ${errors}`);
  }
  
  return data;
}

function getToolRegistry() {
  if (!schemas['tool-registry']) {
    throw new Error('Tool registry schema/data not found');
  }
  return schemas['tool-registry'].tools;
}

module.exports = {
  validateSchema,
  getToolRegistry,
  schemas
};
