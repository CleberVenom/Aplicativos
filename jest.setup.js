// Global test setup. Keep it minimal: tests should mock what they use.
/* eslint-env jest */

// The design service and storage layers read these at call time.
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
