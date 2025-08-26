import { Resource } from "harperdb";
import fs from "fs/promises";
import path from "path";

export class Docs extends Resource {
  allowRead() { return true; }

  async get() {
    try {
      const specPath = path.join(process.cwd(), "src/docs/openapi.yaml");
      const yamlText = await fs.readFile(specPath, "utf-8");
      const YAML = await import("yamljs");
      const specObj = YAML.default.parse(yamlText);
      const specJson = JSON.stringify(specObj);
      const encoded = encodeURIComponent(specJson);

      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
    <style>body{margin:0} #swagger-ui{max-width:1200px;margin:0 auto;padding:16px}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      const spec = JSON.parse(decodeURIComponent("${encoded}"));
      window.ui = SwaggerUIBundle({ spec, dom_id: "#swagger-ui" });
    </script>
  </body>
</html>`;

      return {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        data: html,
      };
    } catch (e: any) {
      return {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        data: { error: e?.message ?? "Failed to load docs" },
      };
    }
  }
}
