import { promptExtra } from "./prompt";

export const databaseeFunctionRegister = {
    "mysql": resolveMySql
  }

  function resolveMySql(extra: promptExtra) {
    let promptArr = [];
    // Get configuration information from extra['extra']['databaseConfig']
    let username = extra['extra']?.['databaseConfig']?.['username'] ?? "root";
    let password = extra['extra']?.['databaseConfig']?.['password'] ?? "root";
    let databaseUrl = extra['extra']?.['databaseConfig']?.['url'] ?? "localhost:3306";
    
    promptArr.push("IMPORTANT: Based on the frontend code, place SQL files in the SQL folder, implement SQL statements, write database creation and table creation statements, and include some sample data to be inserted into the database");
    promptArr.push(`IMPORTANT: Use MySQL as the database, MySQL URL is ${databaseUrl}, username is ${username}, password is ${password}, write this into the backend configuration.`);
    return promptArr;
  }