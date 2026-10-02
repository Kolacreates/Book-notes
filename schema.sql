CREATE TABLE Books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20),
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    notes TEXT,
    date_read DATE,
    cover_url TEXT
);