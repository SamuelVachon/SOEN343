/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    // Match the @/* path alias defined in tsconfig.json
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/app/_test_/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
  },
  collectCoverageFrom: [
    "app/frontend/services/**/*.ts",
    "app/frontend/pages/rent-a-bike/utils/**/*.ts",
    "app/frontend/pages/rent-a-bike/services/**/*.ts",
    "app/frontend/pages/rent-a-bike/hooks/**/*.ts",
    "app/api/rent-a-bike/**/*.ts",
    "app/api/analytics/**/*.ts",
    "!**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 40,
      functions: 40,
    },
  },
};

module.exports = config;
