/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#04070f",
          900: "#0a1022",
          800: "#101a32"
        },
        cyanv: "#00d4ff",
        mintv: "#4df2c2"
      },
      boxShadow: {
        glass: "0 12px 50px rgba(0, 0, 0, 0.45)"
      },
      backgroundImage: {
        aurora:
          "radial-gradient(80% 60% at 20% 0%, rgba(0, 212, 255, 0.18), transparent 60%), radial-gradient(60% 40% at 90% 20%, rgba(77, 242, 194, 0.14), transparent 70%)"
      }
    }
  },
  plugins: []
};
