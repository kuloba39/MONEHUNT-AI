Remove-Item -Recurse -Force .\dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
Remove-Item -Force .\package-lock.json -ErrorAction SilentlyContinue

npm cache clean --force
npm install
npm run build