module.exports = {
  root: true,
  extends: ['../../.eslintrc.cjs'],
  env: {
    worker: true,
  },
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
