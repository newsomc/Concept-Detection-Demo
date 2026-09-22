#!/bin/zsh
cd "${0:A:h}"
if command -v node >/dev/null 2>&1; then
  exec node node_modules/vite/bin/vite.js --host 127.0.0.1
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  exec "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" node_modules/vite/bin/vite.js --host 127.0.0.1
else
  print 'Install Node.js 20.19+ or 22.12+, then follow README.md.'
  read '?Press Enter to close.'
fi
