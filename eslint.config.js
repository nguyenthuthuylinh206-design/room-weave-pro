import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import lovableInternal from "./eslint-rules/index.js";

export default tseslint.config(
  { ignores: ["dist", "eslint-rules/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "lovable-internal": lovableInternal,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // F-FSM-01/02: chặn update trực tiếp status của rooms / room_bookings / housekeeping_tasks
      "lovable-internal/no-direct-room-status-update": "error",
    },
  },
  {
    // Loại trừ các file legacy đã có sẵn vi phạm — sẽ refactor dần ở Sprint sau
    // (xem F-FSM-01 trong findings.md). Khi refactor xong từng file, xoá khỏi danh sách này.
    files: [
      "src/hooks/useRooms.ts",
      "src/hooks/useBulkRoomActions.ts",
      "src/hooks/useRoomChecks.ts",
    ],
    rules: {
      "lovable-internal/no-direct-room-status-update": "warn",
    },
  },
);
