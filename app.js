const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { format } = require("date-fns");

const app = express();
const PORT = process.env.PORT || 3000;
let db = null;
const dbPath = path.join(__dirname, "todoApplication.db");

//Middleware
app.use(express.json());

//starting the server and connecting to db
const serverAndDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () => {
      console.log(`Server started at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(`Error: ${error.message}`);
    process.exit(1);
  }
};

serverAndDb();

const has = (key) => {
  return key !== undefined;
};

const validPriority = (priority) => {
  const priorities = ["HIGH", "MEDIUM", "LOW"];
  return priorities.includes(priority);
};
const validCategory = (category) => {
  const categories = ["WORK", "HOME", "LEARNING"];
  return categories.includes(category);
};
const validStatus = (status) => {
  const statuses = ["TO DO", "IN PROGRESS", "DONE"];
  return statuses.includes(status);
};
const validDate = (date) => {
  const dateFormat = /^\d{4}-(0?[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/g;
  return date.match(dateFormat);
};

const validator = (req, res, next) => {
  const reqBody = req.body;
  if (reqBody.category && !validCategory(reqBody.category)) {
    res.status(400);
    res.send("Invalid Todo Category");
  } else if (reqBody.priority && !validPriority(reqBody.priority)) {
    res.status(400);
    res.send("Invalid Todo Priority");
  } else if (reqBody.status && !validStatus(reqBody.status)) {
    res.status(400);
    res.send("Invalid Todo Status");
  } else if (reqBody.dueDate && !validDate(reqBody.dueDate)) {
    res.status(400);
    res.send("Invalid Due Date");
  } else {
    next();
  }
};

const queryValidator = (req, res, next) => {
  const reqQuery = req.query;
  if (reqQuery.category && !validCategory(reqQuery.category)) {
    res.status(400);
    res.send("Invalid Todo Category");
  } else if (reqQuery.priority && !validPriority(reqQuery.priority)) {
    res.status(400);
    res.send("Invalid Todo Priority");
  } else if (reqQuery.status && !validStatus(reqQuery.status)) {
    res.status(400);
    res.send("Invalid Todo Status");
  } else {
    next();
  }
};

const dateValidator = (req, res, next) => {
  const { date } = req.query;
  if (!validDate(date)) {
    res.status(400);
    res.send("Invalid Due Date");
  } else {
    next();
  }
};

const makeTodo = (todo) => {
  return {
    id: todo.id,
    todo: todo.todo,
    priority: todo.priority,
    status: todo.status,
    category: todo.category,
    dueDate: todo.due_date,
  };
};

//API-1: GET todos based on query params
app.get("/todos/", queryValidator, async (req, res) => {
  const { search_q, category, priority, status } = req.query;
  let query = "";
  switch (true) {
    case has(priority) && has(status):
      query = `
            SELECT *
            FROM todo
            WHERE status = "${status}"
            AND priority = "${priority}"
        `;
      break;
    case has(category) && has(status):
      query = `
              SELECT *
              FROM todo
              WHERE category = "${category}"
              AND status = "${status}"
          `;
      break;
    case has(category) && has(priority):
      query = `
        SELECT *
        FROM todo
        WHERE category = "${category}"
        AND priority = "${priority}"
        `;
      break;
    case has(status):
      query = `
            SELECT *
            FROM todo
            WHERE status = "${status}"
            ;`;
      break;
    case has(priority):
      query = `
            SELECT *
            FROM todo
            WHERE priority = "${priority}"
            ;`;
      break;
    case has(search_q):
      query = `
            SELECT *
            FROM todo
            WHERE todo LIKE "%${search_q}%"
            `;
      break;
    case has(category):
      query = `
            SELECT *
            FROM todo
            WHERE category = "${category}"
        `;
      break;

    default:
      query = `
            SELECT *
            FROM todo
        `;
      break;
  }
  const todos = await db.all(query);
  res.send(todos.map((todo) => makeTodo(todo)));
});

//API-2: GET a todo based on id
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const query = `
        SELECT *
        FROM todo
        WHERE id = ${todoId}
    ;`;

  const todo = await db.get(query);
  res.send(makeTodo(todo));
});

//API-3: GET todos of a particular date
app.get("/agenda/", dateValidator, async (req, res) => {
  const { date } = req.query;
  const dueDate = format(new Date(date), "yyyy-MM-dd");
  const query = `
        SELECT *
        FROM todo
        WHERE due_date = "${dueDate}"
    ;`;

  const todos = await db.all(query);
  res.send(todos.map((todo) => makeTodo(todo)));
});

//API-4: CREATE a todo
app.post("/todos/", validator, async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  const date = format(new Date(dueDate), "yyyy-MM-dd");
  const query = `
                INSERT INTO todo (id, todo, priority, status, category, due_date)
                VALUES (${id}, "${todo}", "${priority}", "${status}", "${category}", "${date}")
            ;`;

  const newTodo = await db.run(query);
  res.send("Todo Successfully Added");
});

//API-5: UPDATE a todo
app.put("/todos/:todoId/", validator, async (req, res) => {
  const reqBody = req.body;
  let query = "";
  let updatedKey = "";

  switch (true) {
    case has(reqBody.status):
      query = `
                      UPDATE todo
                      SET status = "${reqBody.status}"
                  `;

      updatedKey = "Status";
      break;
    case has(reqBody.priority):
      query = `
                      UPDATE todo
                      SET priority = "${reqBody.priority}"
                  `;

      updatedKey = "Priority";
      break;
    case has(reqBody.category):
      query = `
                      UPDATE todo
                      SET category = "${reqBody.category}"
                  `;

      updatedKey = "Category";
      break;
    case has(reqBody.todo):
      query = `
                UPDATE todo
                SET todo = "${reqBody.todo}"
            `;

      updatedKey = "Todo";
      break;
    case has(reqBody.dueDate):
      query = `
                UPDATE todo
                SET due_date = "${reqBody.dueDate}"
            `;

      updatedKey = "Due Date";
      break;
  }

  const updatedTodo = await db.run(query);
  res.send(`${updatedKey} Updated`);
});

//API-6: DELETE a todo
app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const query = `
        DELETE FROM todo
        WHERE id = ${todoId}
    ;`;

  const todo = await db.run(query);
  res.send("Todo Deleted");
});

module.exports = app;
