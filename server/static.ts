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

  app.use("/facility/public", express.static(distPath));

  // SPA fallback: only for non-file routes (no file extension)
  app.use("*", (req, res) => {
    // If the request has a file extension, don't serve index.html
    if (path.extname(req.path)) {
      return res.status(404).send("Not Found");
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
