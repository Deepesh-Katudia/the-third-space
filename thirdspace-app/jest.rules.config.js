module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/rules/**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
}
