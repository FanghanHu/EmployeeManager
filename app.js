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

function logAndReturn(msg) {
    console.clear();
    console.log(msg);
    mainMenu();
}


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
function updateData(tableName, data, id) {
    return query("UPDATE ?? SET ? WHERE id = ?;", [tableName, data, id]);
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

function promptForEmployeeInfo() {
    return new Promise(resolve => {
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
                    resolve(response);
                });
            });
        });
    })
}

function mainMenu() {
    inquirer.prompt([{
        name:"choice",
        message:"What would you like to do?",
        type:"list",
        choices:[
            "View every employee",
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
            case "View every employee":
                /**
                 * Shows every single employee, note: empty departments and roles aren't shown.
                 */
                selectAllEmployees().then(results => {
                    console.clear();
                    console.table(results);
                    mainMenu();
                });
                break;
            case"View employees by role":
                /**
                 * Let user select a role, then display all employees with that role
                 */
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
                /**
                 * Let user select a department, then display all employees in that department
                 */
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
                /**
                 * Ask for employee name and then let user choose roles and manager from existing data.
                 * Adds the new employee at the end.
                 */
                promptForEmployeeInfo().then(employee => {
                    insertData('employee', employee).then(()=>{
                        // noinspection JSUnresolvedVariable
                        logAndReturn(`${employee.first_name} ${employee.last_name} Added.`);
                    });
                });
                break;
            case "Update Employee":
                /**
                 * Let the user choose an employee to edit,
                 * All fields has to be re-entered.
                 * the record is updated at the end.
                 */
                selectAllEmployees().then(employees => {
                    if(employees.length <= 0) {
                        logAndReturn("There aren't any employee data.");
                        return;
                    }

                    inquirer.prompt([{
                        name:"employee_id",
                        message:"Who would you like to edit?",
                        type:"list",
                        choices: employees.map((el)=>{
                            return {name: el.id + " " + el.name, value: el.id};
                        })
                    }]).then(({employee_id}) => {
                        promptForEmployeeInfo().then(employee => {
                            updateData('employee', employee, employee_id).then(()=> {
                                // noinspection JSUnresolvedVariable
                                logAndReturn(`${employee.first_name} ${employee.last_name} Updated.`);
                            });
                        });
                    });
                });
                break;
            case "Remove Employee":
                /**
                 * Let user choose an employee to remove from a list.
                 */
                selectAllEmployees().then(employees => {
                    if(employees.length <= 0) {
                        logAndReturn("There aren't any employee data.");
                        return;
                    }

                    inquirer.prompt([{
                        name:"employee_id",
                        message:"Who would you like to remove?",
                        type:"list",
                        choices: employees.map((el)=>{
                            return {name: el.id + " " + el.name, value: el.id};
                        })
                    }]).then(({employee_id}) => {
                        deleteData('employee', employee_id).then(() => {
                            logAndReturn("Employee removed.");
                        })
                    });
                });
                break;
            case "Add Role":
                /**
                 * Ask role info and add role
                 */
                selectAllDepartments().then(departments => {
                    if(departments.length <= 0) {
                        logAndReturn("You must have at least one department before adding any role.");
                        return;
                    }

                    // noinspection JSUnusedGlobalSymbols
                    inquirer.prompt([
                        {
                            name:"title",
                            message:"What is the name of this role?",
                        },
                        {
                            name:"salary",
                            type:"number",
                            message: "How much is their salary?",
                            validate: value => {
                                if(isNaN(value)) {
                                    return "Please enter a valid number";
                                } else {
                                    return true;
                                }
                            }
                        },
                        {
                            name:"department_id",
                            type:"list",
                            message:"What department does this role belong to?",
                            choices: departments.map( (el) => {
                                return {name:el.name, value:el.id};
                            })
                        }
                    ]).then(role => {
                        insertData('role', role).then(() => {
                            logAndReturn(`${role.name} Added.`)
                        });
                    });
                });
                break;
            case "Remove Role":
                selectAllRoles().then(roles => {
                    if(roles.length <= 0) {
                        logAndReturn("There aren't any role data.");
                        return;
                    }

                    inquirer.prompt([{
                        name:"roleId",
                        message:"Which role do you want to remove?",
                        type:"list",
                        choices:roles.map( (el) => {
                            return {name: el.title, value: el.id};
                        })
                    }]).then(({roleId}) => {
                        deleteData('role', roleId).then(() => {
                            logAndReturn("Role removed, Any employee with the affected role will no longer have a role.")
                        })
                    });
                });
                break;
            case "Add Department":
                inquirer.prompt([{
                    name: "name",
                    message:"What is the name of the department?"
                }]).then(department => {
                    insertData('department', department).then(() => {
                        logAndReturn("Department Added.")
                    });
                });
                break;
            case "Remove Department":
                selectAllDepartments().then(departments => {
                    if(departments.length <= 0) {
                        logAndReturn("There aren't any department data.");
                        return;
                    }

                    inquirer.prompt([
                        {
                            name:"departmentId",
                            message:"Which department would you like to remove?",
                            type:"list",
                            choices:departments.map((el) => {
                                return {name:el.name, value:el.id};
                            })
                        }
                    ]).then(({departmentId}) => {
                        deleteData('department', departmentId).then(()=> {
                            logAndReturn("Department removed.")
                        });
                    });
                });
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

