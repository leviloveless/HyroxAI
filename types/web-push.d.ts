// web-push ships no bundled type declarations. lib/push/send.ts casts the module
// to a local WebPushLike shape, so a bare ambient declaration is enough to let the
// static `import("web-push")` type-check (which in turn lets Next's output tracing
// bundle the package into the serverless function).
declare module "web-push";
