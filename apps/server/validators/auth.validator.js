'use strict';

const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'vendor', 'rider']),
  projectRef: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const otpSendSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format, e.g. +447700900000'),
  projectRef: z.string().min(1),
});

const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  code: z.string().length(6, 'OTP must be 6 digits'),
  projectRef: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

const totpSetupSchema = z.object({
  password: z.string().min(1, 'Password required to set up 2FA'),
});

const totpVerifySchema = z.object({
  token: z.string().length(6, 'TOTP token must be 6 digits'),
});

const totpLoginSchema = z.object({
  sessionToken: z.string().min(1),
  totpToken: z.string().length(6),
});

module.exports = {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  otpSendSchema,
  otpVerifySchema,
  totpSetupSchema,
  totpVerifySchema,
  totpLoginSchema,
};
