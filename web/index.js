// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js";
import snowflake from 'snowflake-sdk';
import path from "path";
import crypto from "crypto";
import fs from "fs";

var privateKeyFile = fs.readFileSync(path.resolve('rsa_key.p8'));
// Get the private key from the file as an object.
const privateKeyObject = crypto.createPrivateKey({
  key: privateKeyFile,
  format: 'pem',
  passphrase: 'passphrase'
});

// Extract the private key from the object as a PEM-encoded string.
var privateKey = privateKeyObject.export({
  format: 'pem',
  type: 'pkcs8'
});
const connection = snowflake.createConnection({
  account: "qs63149.ap-southeast-1",
  username: 'doboki',
  password: '9759969435@Rk',
  warehouse: 'COMPUTE_WH',
  database: 'SHOPIFY',
  schema:'PRODUCTS',
  authenticator: "SNOWFLAKE_JWT",
  privateKey: privateKey,
  role: 'ACCOUNTADMIN'
});
connection.connect(
  function (err, conn)
  {
    if(err)
   console.log(err);
   else console.log("Connected to snowflake");
  }
);
const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

app.get("/api/products/count", async (_req, res) => {
  const countData = await shopify.api.rest.Product.count({
    session: res.locals.shopify.session,
  });
  res.status(200).send(countData);
});

app.get("/api/products/create", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});
app.get("/api/products/all", async (_req, res) => {
  var allProducts ;
    connection.execute({
    sqlText: 'SELECT * FROM PRODUCTS',
    complete: function(err, stmt, rows) {
      if (err) {
        console.error('Failed to execute statement due to the following error: ' + err.message);
      } else {
        allProducts=rows;
        console.log('Number of rows produced: ' + rows.length);
      }
    }

  });
  res.status(200).send(allProducts);
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
