"use strict";

const Hapi = require("@hapi/hapi");
const pool = require("./db");
require("dotenv").config();

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT,
    host: "localhost",
  });

  // GET LIST PRODUCT ENDPOINT
  server.route({
    method: "GET",
    path: "/product",
    handler: async (request, h) => {
      try {
        const page = request.query.page;
        const limit = request.query.limit;
        const startIndex = Math.abs(page - 1) * limit;
        if (!page || !limit) {
          const result = await pool.query(
            "SELECT id, title, sku, image, price, stock FROM product ORDER BY id"
          );
          return result.rows;
        } else {
          const result = await pool.query(
            `SELECT id, title, sku, image, price, stock FROM product ORDER BY id LIMIT ${limit} OFFSET ${startIndex}`
          );
          return result.rows;
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });

  // GET DETAIL PRODUCT ENDPOINT
  server.route({
    method: "GET",
    path: "/product/{id}",
    handler: async (request, h) => {
      try {
        const id = request.params.id;
        const check = await pool.query(`SELECT id FROM product WHERE id=${id}`);
        if (check.rows.length) {
          const result = await pool.query(
            `SELECT id, title, sku, image, price, stock, description FROM product WHERE id=${id}`
          );
          return result.rows;
        } else {
          return "No Data";
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });

  // CREATE AND UPDATE PRODUCT ENDPOINT
  server.route({
    method: "POST",
    path: "/product",
    handler: async (request, h) => {
      try {
        const { title, sku, image, price, description } = request.payload;
        const check = await pool.query(
          `SELECT id, sku FROM product WHERE sku='${sku}'`
        );
        if (check.rows.length) {
          return "SKU already registered";
        } else {
          await pool.query(
            `INSERT INTO product (title, sku, image, price, description) VALUES ($1, $2, $3, $4, $5)`,
            [title, sku, image, price, description]
          );
          return "Product created successfully";
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });
  server.route({
    method: "PUT",
    path: "/product/{id}",
    handler: async (request, h) => {
      try {
        const id = request.params.id;
        const { title, sku, image, price, description } = request.payload;
        const check_id = await pool.query(
          `SELECT id FROM product WHERE id=${id}`
        );
        if (!check_id.rows.length) {
          return "No Data";
        }
        const check = await pool.query(
          `SELECT id, sku FROM product WHERE sku='${sku}'`
        );
        if (check.rows.length) {
          if (check.rows[0].id !== parseInt(id)) {
            return "SKU already registered in another product";
          }
        }
        await pool.query(
          `UPDATE product SET title = $1, sku = $2, image = $3, price = $4, description = $5 WHERE id=${id}`,
          [title, sku, image, price, description]
        );
        return "Product updated successfully";
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });

  // DELETE PRODUCT ENDPOINT
  server.route({
    method: "DELETE",
    path: "/product/{id}",
    handler: async (request, h) => {
      try {
        const id = request.params.id;
        const check = await pool.query(`SELECT id FROM product WHERE id=${id}`);
        if (check.rows.length) {
          await pool.query(
            `DELETE FROM adjustment_transaction WHERE product_id IN (${id}) `
          );
          await pool.query(`DELETE FROM product WHERE id=${id}`);
          return "Product deleted successfully";
        } else {
          return "No Data";
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });

  // GET PRODUCT SEEDER ENDPOINT
  server.route({
    method: "GET",
    path: "/seed",
    handler: async (request, h) => {
      const url =
        "https://dummyjson.com/PRODUCT?limit=10&select=title,sku,images,price,stock,description";
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }

        const json = await response.json();
        const dataProducts = json.products.map((el) => {
          const { title, sku, images, price, stock, description } = el;
          const removeSingleQuoteTitle = title.replace(/['"]+/g, "");
          const removeSingleQuoteSku = sku.replace(/['"]+/g, "");
          const removeSingleQuoteImg = images[0].replace(/['"]+/g, "");
          const removeSingleQuoteDesc = description.replace(/['"]+/g, "");
          return `('${removeSingleQuoteTitle}','${removeSingleQuoteSku}', ARRAY ['${removeSingleQuoteImg}'],${price},${stock},'${removeSingleQuoteDesc}')`;
        });
        let queryProducts = `INSERT INTO product (title, sku, image, price, stock, description) VALUES ${dataProducts}`;

        await pool.query(queryProducts);

        return "Done";
      } catch (error) {
        console.error(error);
      }
    },
  });

  // GET LIST TRANSACTION ENDPOINT
  server.route({
    method: "GET",
    path: "/transaction",
    handler: async (request, h) => {
      try {
        const page = request.query.page;
        const limit = request.query.limit;
        const startIndex = Math.abs(page - 1) * limit;
        if (!page || !limit) {
          const result = await pool.query(
            "SELECT id, sku, qty, amount FROM adjustment_transaction ORDER BY id"
          );
          return result.rows;
        } else {
          const result = await pool.query(
            `SELECT id, sku, qty, amount FROM adjustment_transaction ORDER BY id LIMIT ${limit} OFFSET ${startIndex}`
          );
          return result.rows;
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });

  // GET DETAIL TRANSACTION ENDPOINT
  server.route({
    method: "GET",
    path: "/transaction/{id}",
    handler: async (request, h) => {
      try {
        const id = request.params.id;
        const check = await pool.query(
          `SELECT id FROM adjustment_transaction WHERE id=${id}`
        );
        if (check.rows.length) {
          const result = await pool.query(
            `SELECT id, sku, qty, amount FROM adjustment_transaction WHERE id=${id}`
          );
          return result.rows;
        } else {
          return "No Data";
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });

  // CREATE AND UPDATE TRANSACTION ENDPOINT
  server.route({
    method: "POST",
    path: "/transaction",
    handler: async (request, h) => {
      try {
        const { product_id, sku, qty } = request.payload;
        const check_product_id = await pool.query(
          `SELECT id, stock, price, sku FROM product WHERE id=${product_id}`
        );
        if (!check_product_id.rows.length) {
          return "No product data";
        }
        if (check_product_id.rows[0].stock <= 0) {
          return "Stock 0";
        } else if (check_product_id.rows[0].stock < qty) {
          return `Not enough stock. This product stock is ${check_product_id.rows[0].stock}`;
        }
        if (check_product_id.rows[0].sku !== sku) {
          return "SKU must be match with the product";
        }
        const amount = check_product_id.rows[0].price * qty;
        const updated_stock = check_product_id.rows[0].stock - qty;
        await pool.query(
          `INSERT INTO adjustment_transaction (product_id, sku, qty, amount) VALUES ($1, $2, $3, $4)`,
          [product_id, sku, qty, amount]
        );
        await pool.query(
          `UPDATE product SET stock = $1 WHERE id=${product_id}`,
          [updated_stock]
        );
        return "Transaction created successfully";
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });
  server.route({
    method: "PUT",
    path: "/transaction/{id}",
    handler: async (request, h) => {
      try {
        const id = request.params.id;
        const { product_id, sku, qty } = request.payload;
        const check = await pool.query(
          `SELECT id FROM adjustment_transaction WHERE id=${id}`
        );
        const check_product_id = await pool.query(
          `SELECT id, stock, price, sku FROM product WHERE id=${product_id}`
        );
        if (!check.rows.length) {
          return "No data";
        }
        if (!check_product_id.rows.length) {
          return "No product data";
        }
        if (check_product_id.rows[0].sku !== sku) {
          return "SKU must be match with the product";
        }

        const check_previous_transaction = await pool.query(
          `SELECT id, qty FROM adjustment_transaction WHERE id=${id}`
        );
        const amount = check_product_id.rows[0].price * qty;
        const updated_stock =
          check_product_id.rows[0].stock +
          check_previous_transaction.rows[0].qty -
          qty;
        if (updated_stock < 0) {
          return `Not enough stock.`;
        }

        await pool.query(
          `UPDATE adjustment_transaction SET product_id = $1, sku = $2, qty = $3, amount = $4 WHERE id=${id}`,
          [product_id, sku, qty, amount]
        );
        await pool.query(
          `UPDATE product SET stock = $1 WHERE id=${product_id}`,
          [updated_stock]
        );
        return "Transaction created successfully";
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });

  // DELETE TRANSACTION ENDPOINT
  server.route({
    method: "DELETE",
    path: "/transaction/{id}",
    handler: async (request, h) => {
      try {
        const id = request.params.id;
        const check = await pool.query(
          `SELECT id, product_id, qty FROM adjustment_transaction WHERE id=${id}`
        );
        const check_product_stock = await pool.query(
          `SELECT id, stock FROM product WHERE id=${check.rows[0].product_id}`
        );
        const updated_stock =
          check_product_stock.rows[0].stock + check.rows[0].qty;
        if (check.rows.length) {
          await pool.query(`DELETE FROM adjustment_transaction WHERE id=${id}`);
          await pool.query(
            `UPDATE product SET stock = $1 WHERE id=${check.rows[0].product_id}`,
            [updated_stock]
          );
          return "Transaction deleted successfully";
        } else {
          return "No Data";
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });

  await server.start();
  console.log(`Server running on port ${process.env.PORT}`);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
