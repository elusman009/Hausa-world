// Environment variable validation utility
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

const backendRequiredEnvVars = [
  'FLW_SECRET_KEY',
  'FLW_WEBHOOK_SECRET'
];

const optionalEnvVars = [
  'NODE_ENV',
  'VERCEL_URL'
];

export function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required environment variables
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  // Check optional environment variables and warn if missing
  optionalEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  });

  // Log validation results
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => {
      console.error(`   - ${envVar}`);
    });
    console.error('\nPlease add these to your .env.local file or deployment environment.');
    
    // In development, don't throw error in browser context - Replit secrets may not be available client-side
    // if (process.env.NODE_ENV === 'development') {
    //   throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    // }
  } else {
    console.log('✅ All required environment variables are present');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Optional environment variables not set:');
    warnings.forEach(envVar => {
      console.warn(`   - ${envVar}`);
    });
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

export function validateBackendEnvironment() {
  const missing = [];
  const warnings = [];

  // Check backend-specific required environment variables
  backendRequiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  // Log validation results
  if (missing.length > 0) {
    console.error('❌ Missing required backend environment variables:');
    missing.forEach(envVar => {
      console.error(`   - ${envVar}`);
    });
    console.error('\nBackend payment processing may not work correctly.');
    
    return {
      isValid: false,
      missing,
      warnings
    };
  } else {
    console.log('✅ All required backend environment variables are present');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

export function getRequiredEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value;
}

// Utility to get base URL dynamically for Replit environment
export function getBaseUrl() {
  // In production or when explicitly set, use the environment variable
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // In Replit environment, use the dev domain
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Fallback for local development
  return 'http://localhost:5000';
}