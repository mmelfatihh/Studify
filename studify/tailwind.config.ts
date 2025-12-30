import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // <--- ENABLED MANUAL DARK MODE
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // We can define custom colors here if needed later
      },
    },
  },
  plugins: [],
};
export default config;