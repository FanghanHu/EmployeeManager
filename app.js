const mysql = require('mysql');
const inquirer = require('inquirer');
require('dotenv').config();

/**
 * Used for displaying all employee data.
 */
const SELECT_ALL_QUERY = `
        SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) AS name,  r.title, r.salary, d.name AS department , CONCAT(m.first_name, ' ', m.last_name) AS manager
        FROM employee e 
        LEFT JOIN role r ON e.role_id = r.id 
        LEFT JOIN department d ON r.department_id = d.id
        LEFT JOIN employee m ON e.manager_id = m.id
    `;

//MYSQL connection parameters
const pool = mysql.createPool({
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
        pool.getConnection((connectionErr, connection) => {
            if(connectionErr) reject(connectionErr);
            connection.query(sql, values, (queryErr, results, fields) => {
                if (queryErr) {
                    reject(queryErr)
                } else {
                    resolve(results, fields);
                }
                connection.release(releaseErr => {
                    if(releaseErr) throw releaseErr;
                });
            });
        })
    });
}

function insertData(tableName, data) {
    return query("INSERT INTO ?? SET ?;", [tableName, data]);
}

/**
 * @param tableName
 * @param {Object} data should contain an id
 * @returns {Promise}
 */
function updateData(tableName, data) {
    return query("UPDATE ?? SET ?;", [tableName, data]);
}

function deleteData(tableName, id) {
    return query("DELETE FROM ?? WHERE id = ?;", [tableName, id]);
}

function selectData(tableName) {
    return query("SELECT * FROM ??;", [tableName]);
}

function selectAllEmployees() {
    return query(SELECT_ALL_QUERY);
}

function selectEmployeeByRole(roleId) {
    return query(SELECT_ALL_QUERY + ` WHERE r.id = ?`, [roleId]);
}

function selectAllRoles() {
    return query('SELECT * FROM role');
}

function selectEmployeeByDepartment(departmentId) {
    return query(SELECT_ALL_QUERY + ` WHERE d.id = ?`, [departmentId])
}

function selectAllDepartments() {
    return query('SELECT * FROM department');
}

function mainMenu() {
    inquirer.prompt([{
        name:"choice",
        message:"What would you like to do?",
        type:"list",
        choices:[
            "View everything",
            "View employees by role",
            "View employees by department",
            "Add Employee",
            "Update Employee",
            "Remove Employee",
            "Add Role",
            "Remove Role",
            "Add Department",
            "Remove Department",
            "Exit"
        ]
    }]).then(({choice}) => {
        switch (choice) {
            case "View everything":
                selectAllEmployees().then(results => {
                    console.clear();
                    console.table(results);
                    mainMenu();
                });
                break;
            case"View employees by role":
                selectAllRoles().then(results => {
                    inquirer.prompt([{
                        type:"list",
                        message:"Which role would you like to choose?",
                        choices:results.map((el) => {
                            return {name: el.title, value:el.id};
                        }),
                        name:"roleId"
                    }]).then(({roleId}) => {
                        selectEmployeeByRole(roleId).then(results2 => {
                            console.clear();
                            console.table(results2);
                            mainMenu();
                        })
                    });
                });
                break;
            case "View employees by department":
                selectAllDepartments().then(results => {
                    inquirer.prompt([{
                        type:"list",
                        message:"Which department would you like to choose?",
                        choices:results.map((el) => {
                            return {name: el.name, value:el.id};
                        }),
                        name:"departmentId"
                    }]).then(({departmentId}) => {
                        selectEmployeeByDepartment(departmentId).then(results2 => {
                            console.clear();
                            console.table(results2);
                            mainMenu();
                        })
                    });
                });
                break;
            case "Add Employee":
                selectAllEmployees().then(employees => {
                    selectAllRoles().then(roles => {
                        inquirer.prompt([
                            {
                                name: "first_name",
                                message:"First name:",
                            },
                            {
                                name:"last_name",
                                message:"Last name:"
                            },
                            {
                                name:"role_id",
                                message:"Please choose a role:",
                                type:"list",
                                choices:[{name: "No role", value: null}, ...roles.map((el) => {
                                    return {name:el.title, value:el.id};
                                })]
                            },
                            {
                                name:"manager_id",
                                message:"Please choose a manager:",
                                type:"list",
                                choices:[{name: "No Manager", value: null}, ...employees.map((el) => {
                                    return {name:el.name, value:el.id};
                                })]
                            }
                        ]).then(response => {
                            insertData('employee', response).then(()=>{
                                console.clear();
                                console.log(response);
                                // noinspection JSUnresolvedVariable
                                console.log(`${response.first_name} ${response.last_name} Added.`);
                                mainMenu();
                            });
                        });
                    });
                });
                break;
            case "Update Employee":
                break;
            case "Remove Employee":
                break;
            case "Add Role":
                break;
            case "Remove Role":
                break;
            case "Add Department":
                break;
            case "Remove Department":
                break;
            default:
                pool.end(err => {
                    if(err) throw err;
                });
                console.clear();
        }
    });
}
console.clear();
console.log("Welcome to Employee Manager.");
mainMenu();

