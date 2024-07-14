.env file req :

PORT=
DB_PASSWORD=

DDL :

CREATE DATABASE jubelio_backend;
CREATE TABLE product (id SERIAL PRIMARY KEY,title VARCHAR(255),SKU VARCHAR(255) UNIQUE,image VARCHAR(255)[],price NUMERIC CHECK(price >= 0),description VARCHAR(255) NOT NULL,stock INT CHECK(stock >= 0));
CREATE TABLE adjustment_transaction (id SERIAL PRIMARY KEY, SKU VARCHAR(255), qty INT, amount NUMERIC, product_id INT NOT NULL, CONSTRAINT fk_product FOREIGN KEY(product_id) REFERENCES product(id));
