#!/bin/bash

# PRODUCTION
git reset --hard
git checkout master
git pull origin master

npm i
npm run build

# .env.production yaratish (serverda gitignore'da bo'lgani uchun mavjud emas)
# NODE_ENV=production bo'lganda server.ts .env.production ni yuklaydi
cat > .env.production << 'EOF'
PORT=3001
NODE_ENV=production
MONGO_URI=mongodb+srv://Oscar:A3mzJqupDes8QLkx@cluster0.dbpygr2.mongodb.net/zomin
SECRET_TOKEN=zam-zam-secret-key-2024
EOF

# PM2: mavjud processni restart qilish yoki yangi start
pm2 restart process.config.js --env production 2>/dev/null || pm2 start process.config.js --env production

# DEVELOPMENT
# git reset --hard
# git checkout develop
# git pull origin develop
# npm i
# pm2 start "npm run start:dev" --name=navruz