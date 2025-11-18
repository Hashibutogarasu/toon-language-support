module.exports = {
  testPathIgnorePatterns: [
    "<rootDir>/lsp/client/out/test/completion.test.js"
  ],
  transform: {
    "^.+\\.js$": "<rootDir>/node_modules/babel-jest",
    ".*\\.(ts)$": "<rootDir>/node_modules/ts-jest",
  },
  moduleFileExtensions: ["js", "ts"],
};
