const mysql = require('mysql');
const inquirer = require('inquirer');

const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: "employee_db"
});

/**
 * connects to database and run an sql
 */
function query(sql, values) {
    return new Promise((resolve, reject) => {
        connection.connect(err => {
            if (err) reject(err);

            connection.query(sql, values, (err, results, fields) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(results, fields);
                }
                connection.end();
            });
        });
    });
}

function insertData(tableName, data) {
    return query("INSERT INTO ?? VALUES ?", [tableName, data]);
}

/**
 *
 * @param tableName
 * @param {Object} data should contain an id
 * @returns {Promise}
 */
function updateData(tableName, data) {
    return query("UPDATE ?? SET ?", [tableName, data]);
}

function deleteData(tableName, id) {
    return query("DELETE FROM ?? WHERE id = ?", [tableName, id]);
}

function selectData(tableName) {
    return query("SELECT * FROM ??", [tableName]);
}

