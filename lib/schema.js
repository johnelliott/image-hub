module.exports = `CREATE TABLE image (
  id INTEGER PRIMARY KEY,
  file_name NOT NULL,
  public_id NOT NULL,
  date_time_created datetime NOT NULL,
  full_path UNIQUE NOT NULL,
  thumbnail TEXT NOT NULL
);`
