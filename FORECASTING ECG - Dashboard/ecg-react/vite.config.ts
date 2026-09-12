import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { appendFileSync } from "fs";

/**
 * Recoge en un archivo los errores de render que ocurren en el navegador.
 *
 * Solo actua en el servidor de desarrollo. Sin esto, un fallo de dibujado solo se ve
 * en la consola del navegador, que no es accesible desde la linea de ordenes.
 */
function registroDeErrores() {
  return {
    name: "registro-de-errores",
    configureServer(server: { middlewares: { use: (r: string, h: unknown) => void } }) {
      server.middlewares.use("/__error", (req: any, res: any) => {
        let cuerpo = "";
        req.on("data", (c: Buffer) => { cuerpo += c; });
        req.on("end", () => {
          appendFileSync(resolve(__dirname, "errores-render.log"),
            `
===== ${new Date().toISOString()} =====
${cuerpo}
`);
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), registroDeErrores()],
  /**
   * Plotly no se carga entero, sino por modulos (`plotly.js/lib/core` mas las siete
   * trazas que el proyecto usa), para que el paquete pase de 4604 KB a 1160 KB. El
   * precio es que esos modulos son CommonJS y algunos referencian `global`, que en
   * el navegador no existe: sin esto, cualquier grafica cartesiana revienta con
   * `ReferenceError: global is not defined` y la pagina entera deja de dibujarse.
   * El bundle completo traia su propio apano; el modular no.
   *
   * Esto cubre nuestro codigo al construir. Las dependencias pre-empaquetadas en
   * desarrollo no pasan por aqui —Rolldown no acepta `define` en `optimizeDeps`—,
   * asi que el apano de verdad esta en `index.html`, que se ejecuta antes que
   * cualquier modulo y sirve para los dos modos.
   */
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Proxy all /api/* requests to the FastAPI backend.
    // This eliminates CORS issues in dev mode: the browser sees same-origin calls
    // and Vite transparently forwards them to http://localhost:8000.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        // No rewrite needed: /api/health → http://localhost:8000/api/health
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("react-router-dom")
          )
            return "vendor-react";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("lucide-react")) return "vendor-icons";
        },
      },
    },
  },
});
