module.exports = {
  apps: [
    {
      name: "ZOMIN",
      cwd: "./",
      script: "./dist/server.js",
      watch: false,
      env_production: {
        NODE_ENV: "production",
        MONGO_URI: "mongodb+srv://Oscar:A3mzJqupDes8QLkx@cluster0.dbpygr2.mongodb.net/zomin",
      },
      env_development: {
        NODE_ENV: "development",
        MONGO_URI: "mongodb+srv://Oscar:A3mzJqupDes8QLkx@cluster0.dbpygr2.mongodb.net/zomin",
      },
      instances: 1,
      exec_mode: "cluster",
    },
  ],
};

