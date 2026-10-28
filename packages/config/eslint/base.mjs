import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * Shared flat ESLint config for all packages and apps.
 * Apps (web) merge this with eslint-config-next.
 */
export function baseEslintConfig() {
  return [
    ...tseslint.configs.recommended,
    prettier,
    {
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/consistent-type-imports": [
          "error",
          { fixStyle: "inline-type-imports" },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "no-console": "error",
        eqeqeq: ["error", "always"],
      },
    },
  ];
}
