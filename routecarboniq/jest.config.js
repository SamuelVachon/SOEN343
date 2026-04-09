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
};

module.exports = config;
