// @tkf/mcp ESLint flat config.
import base from '@tkf/eslint-config/base';
import jest from '@tkf/eslint-config/jest';

export default [{ ignores: ['dist/**', 'coverage/**', '.turbo/**'] }, ...base, ...jest];
