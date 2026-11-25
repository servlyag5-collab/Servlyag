// Decides which files make up the phone app's "runtime version" (the label that matches over-the-air updates to
// builds). .gitignore and the npm script list don't change anything inside the phone app, but by default they
// still changed the label: on 2026-11-24 adding the founders website build (one .gitignore line, one npm script)
// meant a small fix could no longer reach phones as an update. So both are skipped. Takes effect from the next build.
const { SourceSkips } = require('expo/fingerprint');

/** @type {import('expo/fingerprint').Config} */
module.exports = {
  sourceSkips: SourceSkips.GitIgnore | SourceSkips.PackageJsonScriptsAll,
};
