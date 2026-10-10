import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import pg from "pg";
import methodOverride from "method-override";
import "dotenv/config";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import bcrypt from "bcrypt";


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
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());



app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

passport.use(
  new Strategy({ usernameField: "email" }, async (email, password, cb) => {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        email.toLowerCase().trim(),
      ]);
      if (result.rows.length === 0) return cb(null, false);

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      return cb(null, valid ? user : false);
    } catch (err) {
      return cb(err);
    }
  })
);

passport.serializeUser((user, cb) => cb(null, user.id));

passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT id, email FROM users WHERE id = $1", [id]);
    cb(null, result.rows[0] || false);
  } catch (err) {
    cb(err);
  }
});

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

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

app.get("/", async (req, res) => {
  if(!req.isAuthenticated()){
    return res.render("landing.ejs");
  }
  const sort = sortOptions[req.query.sort] ? req.query.sort : "recent";

  try {
    const result = await db.query(
      `SELECT * FROM books WHERE user_id = $1 ORDER BY ${sortOptions[sort]}`,
      [req.user.id],
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

app.get("/new", ensureAuthenticated, (req, res) => {
  res.render("form.ejs", {
    heading: "Add a book",
    action: "/add",
    submitLabel: "Save book",
  });
});

app.post("/add", ensureAuthenticated,async (req, res) => {
  const { title, author, isbn, rating, notes, date_read } = req.body;
  const cleanIsbn = isbn.replace(/-/g, "") || null;

  try {
    const coverUrl = await getCoverUrl(cleanIsbn);

    await db.query(
      "INSERT INTO books (user_id, title, author, isbn, rating, notes, date_read, cover_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [req.user.id, title, author, cleanIsbn, rating, notes, date_read || null, coverUrl],
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

app.get("/edit/:id", ensureAuthenticated, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM books WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
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

app.post("/edit/:id", ensureAuthenticated, async (req, res) => {
  const { title, author, isbn, rating, notes, date_read } = req.body;
  const cleanIsbn = isbn.replace(/-/g, "") || null;

  try {
    const coverUrl = await getCoverUrl(cleanIsbn);

    await db.query(
      "UPDATE books SET title = $1, author = $2, isbn = $3, rating = $4, notes = $5, date_read = $6, cover_url = $7 WHERE id = $8 AND user_id = $9",
      [
        title,
        author,
        cleanIsbn,
        rating,
        notes,
        date_read || null,
        coverUrl,
        req.params.id,
        req.user.id,
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

app.delete("/books/:id", ensureAuthenticated, async (req, res) => {
  try {
    await db.query("DELETE FROM books WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.user.id,
    ]);
    res.redirect("/");
  } catch (err) {
    console.error(err.message);
    showError(res, 500, "Couldn't remove the book", "Please try again.");
  }
});

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/");
  res.render("auth.ejs", { mode: "login", error: req.query.error });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login?error=1",
  })
);

app.get("/register", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/");
  res.render("auth.ejs", { mode: "register", error: req.query.error });
});

app.post("/register", async (req, res) => {
  const email = (req.body.email || "").toLowerCase().trim();
  const password = req.body.password || "";

  if (password.length < 8) return res.redirect("/register?error=short");

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
      [email, hash]
    );
    req.login(result.rows[0], (err) => {
      if (err) {
        return showError(res, 500, "Couldn't log you in", "Your account was created. Try logging in.");
      }
      res.redirect("/");
    });
  } catch (err) {
    if (err.code === "23505") return res.redirect("/register?error=taken");
    console.error(err.message);
    showError(res, 500, "Couldn't create your account", "Please try again.");
  }
});

app.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return showError(res, 500, "Couldn't log you out", "Please try again.");
    res.redirect("/");
  });
});

app.use((req, res) => {
  showError(res, 404, "Page not found", "That page doesn't exist.");
});
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
