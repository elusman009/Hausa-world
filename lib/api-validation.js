// API validation utilities for backend routes
export function validateUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

export function validateRequestMethod(req, allowedMethods) {
  if (!allowedMethods.includes(req.method)) {
    return {
      valid: false,
      error: `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`
    };
  }
  return { valid: true };
}

export function validateFlutterwaveWebhook(req) {
  const signature = req.headers["verif-hash"];
  const secret = process.env.FLW_WEBHOOK_SECRET;
  
  if (!signature) {
    return { valid: false, error: "Missing webhook signature" };
  }
  
  if (!secret) {
    return { valid: false, error: "Webhook secret not configured" };
  }
  
  if (signature !== secret) {
    return { valid: false, error: "Invalid webhook signature" };
  }
  
  return { valid: true };
}

export function createErrorResponse(res, status, message, details = null) {
  const response = { error: message };
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  return res.status(status).json(response);
}

export function validateRequiredFields(data, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { valid: true };
}

export async function validateUserAuthentication(supabase, req) {
  try {
    const { data: userData, error } = await supabase.auth.getUser();
    
    if (error || !userData?.user) {
      return {
        valid: false,
        error: "Authentication required"
      };
    }
    
    return {
      valid: true,
      user: userData.user
    };
  } catch (error) {
    return {
      valid: false,
      error: "Authentication validation failed"
    };
  }
}