export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Сервер қатесі",
    code: err.code,
  });
}

export function notFoundHandler(req, res) {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API табылмады" });
  }
  res.status(404).send("Not found");
}
