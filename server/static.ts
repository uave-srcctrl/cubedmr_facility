import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files under /facility/assets, /facility/*.svg, /facility/*.png, etc.
  // This allows assets to be loaded via relative paths from the base
  app.use("/facility", express.static(distPath, {
    // Cache static files
    maxAge: "1h",
    etag: false,
  }));

  // SPA fallback: serve index.html for routes without file extensions
  app.use("/facility", (req, res) => {
    // If the request has a file extension, we already tried to serve it above
    // If it doesn't have an extension, serve index.html for SPA routing
    if (path.extname(req.path)) {
      return res.status(404).send("Not Found");
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

