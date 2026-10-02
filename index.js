import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import pg from "pg";
import methodOverride from "method-override";
import "dotenv/config";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

db.connect().catch((err) => {
  console.error("Database connection failed:", err.message);
});

app.use(methodOverride("_method"));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

function showError(res, status, heading, message) {
  res.status(status).render("error.ejs", { heading, message });
}

async function getCoverUrl(isbn) {
  if (!isbn) return null;

  try {
    await axios.get(
      `https://covers.openlibrary.org/b/isbn/${isbn}-S.jpg?default=false`,
      { timeout: 5000, responseType: "arraybuffer" },
    );
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  } catch (err) {
    console.log(`No cover found for ISBN ${isbn}`);
    return null;
  }
}

const sortOptions = {
  recent: "date_read DESC NULLS LAST",
  rating: "rating DESC, date_read DESC NULLS LAST",
  title: "title ASC",
};

app.get("/", async (req, res) => {
  const sort = sortOptions[req.query.sort] ? req.query.sort : "recent";

  try {
    const result = await db.query(
      `SELECT * FROM books ORDER BY ${sortOptions[sort]}`,
    );
    res.render("index.ejs", { books: result.rows, sort });
  } catch (err) {
    console.error(err.message);
    showError(
      res,
      500,
      "Something went wrong",
      "We couldn't load your books. Please try again.",
    );
  }
});

app.get("/new", (req, res) => {
  res.render("form.ejs", {
    heading: "Add a book",
    action: "/add",
    submitLabel: "Save book",
  });
});

app.post("/add", async (req, res) => {
  const { title, author, isbn, rating, notes, date_read } = req.body;
  const cleanIsbn = isbn.replace(/-/g, "") || null;

  try {
    const coverUrl = await getCoverUrl(cleanIsbn);

    await db.query(
      "INSERT INTO books (title, author, isbn, rating, notes, date_read, cover_url) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [title, author, cleanIsbn, rating, notes, date_read || null, coverUrl],
    );
    res.redirect("/");
  } catch (err) {
    console.error(err.message);
    showError(
      res,
      500,
      "Couldn't save the book",
      "Check the details and try again.",
    );
  }
});

app.get("/edit/:id", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books WHERE id =$1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.redirect("/");
    }

    res.render("form.ejs", {
      heading: "Edit book",
      action: "/edit/" + req.params.id,
      submitLabel: "Save Changes",
      book: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    showError(res, 500, "Couldn't load the book", "Please try again.");
  }
});

app.post("/edit/:id", async (req, res) => {
  const { title, author, isbn, rating, notes, date_read } = req.body;
  const cleanIsbn = isbn.replace(/-/g, "") || null;

  try {
    const coverUrl = await getCoverUrl(cleanIsbn);

    await db.query(
      "UPDATE books SET title = $1, author = $2, isbn = $3, rating = $4, notes = $5, date_read = $6, cover_url = $7 WHERE id = $8",
      [
        title,
        author,
        cleanIsbn,
        rating,
        notes,
        date_read || null,
        coverUrl,
        req.params.id,
      ],
    );
    res.redirect("/");
  } catch (err) {
    console.error(err.message);
    showError(
      res,
      500,
      "Couldn't save your changes",
      "Check the details and try again.",
    );
  }
});

app.delete("/books/:id", async (req, res) => {
  await db.query("DELETE FROM books WHERE id = $1", [req.params.id]);
  res.redirect("/");
});

app.use((req, res) => {
  showError(res, 404, "Page not found", "That page doesn't exist.");
});
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
